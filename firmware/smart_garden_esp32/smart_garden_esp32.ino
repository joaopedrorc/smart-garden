/*
 * Smart Garden 2.0 — nó sensor ESP32 (DOIT DevKit V1, ESP32-WROOM-32)
 *
 * Lê temperatura e umidade do ar (DHT11) e umidade do solo (sensor resistivo),
 * marca cada leitura com horário UTC sincronizado por NTP e envia lotes em JSON
 * para a API do Smart Garden via HTTPS. Leituras ficam num buffer em LittleFS
 * até o envio ser confirmado, então quedas de Wi-Fi ou da API não perdem dados.
 *
 * Bibliotecas (Gerenciador de Bibliotecas da Arduino IDE):
 *   - "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"
 *   - "ArduinoJson" (Benoit Blanchon), versão 7.x
 * Placa: "DOIT ESP32 DEVKIT V1" (pacote esp32 da Espressif)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

#include "secrets.h"

#define FW_VERSION "1.0.0"

// ---------- Pinos ----------
#define DHT_PIN    4
#define DHT_TYPE   DHT11   // troque para DHT22 se for o sensor usado
#define SOIL_PIN   34      // AO do módulo; ADC1 (o ADC2 não funciona com o Wi-Fi ativo)
#define SOIL_POWER_PIN 25  // VCC do módulo: energizado só durante a leitura

// ---------- Calibração do sensor de solo (ADC de 12 bits, 0–4095) ----------
// Sensor resistivo (sonda em garfo + módulo LM393): quanto mais seco, MAIOR a leitura.
// Calibre: SOIL_DRY_RAW = sonda no ar; SOIL_WET_RAW = sonda num copo d'água.
#define SOIL_DRY_RAW 4095
#define SOIL_WET_RAW 1500
// O estado do solo (seco / ideal / encharcado) é calculado no aplicativo

// ---------- Temporização ----------
const uint32_t READ_INTERVAL_MS  = 60UL * 1000UL;  // 1 leitura por minuto
const uint32_t WIFI_RETRY_MS     = 30UL * 1000UL;
const size_t   BATCH_MAX         = 30;             // leituras por requisição
const size_t   QUEUE_MAX_LINES   = 5000;           // ~3,5 dias de leituras
const time_t   MIN_VALID_EPOCH   = 1704067200;     // 01/01/2024: relógio sincronizado

const char* QUEUE_PATH = "/queue.jsonl";
const char* QUEUE_TMP  = "/queue.tmp";

DHT dht(DHT_PIN, DHT_TYPE);

uint32_t lastReadMs = 0;
uint32_t lastWifiAttemptMs = 0;

// ---------- Wi-Fi e relógio ----------

// Mostra o motivo da falha e as redes visíveis, para diagnosticar senha, sinal ou rede 5 GHz
void diagnoseWifi() {
  wl_status_t status = WiFi.status();
  const char* motivo =
      status == WL_NO_SSID_AVAIL  ? "rede não encontrada (nome errado, longe ou só 5 GHz)" :
      status == WL_CONNECT_FAILED ? "conexão recusada (senha errada?)" :
      status == WL_DISCONNECTED   ? "não autenticou (senha errada ou sinal fraco)" :
                                    "outro";
  Serial.printf("  Motivo: status %d, %s\n", status, motivo);

  WiFi.disconnect();
  int n = WiFi.scanNetworks();
  Serial.printf("  Redes 2,4 GHz visíveis: %d (* = a configurada)\n", n);
  for (int i = 0; i < n; i++) {
    Serial.printf("   %s %-32s sinal %4d dBm  canal %2d\n",
                  WiFi.SSID(i) == WIFI_SSID ? "*" : " ",
                  WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i));
  }
  WiFi.scanDelete();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);  // volta a tentar em segundo plano
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Conectando ao Wi-Fi \"%s\"", WIFI_SSID);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf(" conectado. IP %s, sinal %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(" falhou (nova tentativa depois).");
    diagnoseWifi();
  }
  lastWifiAttemptMs = millis();
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttemptMs < WIFI_RETRY_MS) return;
  Serial.println("Wi-Fi caiu, reconectando...");
  WiFi.reconnect();
  lastWifiAttemptMs = millis();
}

bool clockSynced() {
  return time(nullptr) > MIN_VALID_EPOCH;
}

void syncClock() {
  // Offset 0: todas as leituras ficam em UTC, como as estações do INMET
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Sincronizando relógio (NTP)");
  for (int i = 0; i < 30 && !clockSynced(); i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(clockSynced() ? " ok." : " ainda não sincronizado.");
}

// ---------- Sensores ----------

int readSoilRaw() {
  // A sonda resistiva corrói por eletrólise se ficar energizada o tempo todo:
  // liga o módulo só para a leitura (cerca de 0,3 s por minuto)
  digitalWrite(SOIL_POWER_PIN, HIGH);
  delay(200);  // estabilização do módulo

  // Média de 16 amostras para reduzir o ruído do ADC
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(SOIL_PIN);
    delay(5);
  }
  digitalWrite(SOIL_POWER_PIN, LOW);
  return sum / 16;
}

float soilPercent(int raw) {
  float pct = 100.0f * (SOIL_DRY_RAW - raw) / (float)(SOIL_DRY_RAW - SOIL_WET_RAW);
  return constrain(pct, 0.0f, 100.0f);
}

// O DHT11 falha leituras esporádicas; tenta até 3 vezes
bool readDht(float& temperature, float& humidity) {
  for (int attempt = 0; attempt < 3; attempt++) {
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();
    if (!isnan(humidity) && !isnan(temperature)) return true;
    delay(2100);
  }
  return false;
}

// ---------- Buffer em LittleFS (uma leitura JSON por linha) ----------

// Uma casa decimal, em double, para o JSON não carregar ruído de ponto flutuante
double round1(float v) {
  return round((double)v * 10.0) / 10.0;
}

size_t queueLines() {
  File f = LittleFS.open(QUEUE_PATH, "r");
  if (!f) return 0;
  size_t n = 0;
  while (f.available()) {
    if (f.read() == '\n') n++;
  }
  f.close();
  return n;
}

// Reescreve o buffer sem as primeiras `skip` linhas
void dropQueueHead(size_t skip) {
  File in = LittleFS.open(QUEUE_PATH, "r");
  if (!in) return;
  File out = LittleFS.open(QUEUE_TMP, "w");
  size_t line = 0;
  while (in.available()) {
    String s = in.readStringUntil('\n');
    s.trim();  // println grava "\r\n"; sem trim o "\r" se acumularia
    if (line++ >= skip && s.length() > 0) out.println(s);
  }
  in.close();
  out.close();
  LittleFS.remove(QUEUE_PATH);
  LittleFS.rename(QUEUE_TMP, QUEUE_PATH);
}

void enqueue(time_t ts, bool dhtOk, float temperature, float humidity, int soilRaw, float soilPct) {
  JsonDocument doc;
  doc["ts"] = (uint32_t)ts;
  if (dhtOk) {
    doc["temperature_c"] = round1(temperature);
    doc["relative_humidity"] = round1(humidity);
  } else {
    doc["temperature_c"] = nullptr;
    doc["relative_humidity"] = nullptr;
  }
  doc["soil_raw"] = soilRaw;
  doc["soil_pct"] = round1(soilPct);

  File f = LittleFS.open(QUEUE_PATH, "a");
  serializeJson(doc, f);
  f.println();
  f.close();

  // Buffer cheio: descarta as leituras mais antigas
  size_t n = queueLines();
  if (n > QUEUE_MAX_LINES) dropQueueHead(n - QUEUE_MAX_LINES);
}

// Envia até BATCH_MAX leituras; retorna quantas foram confirmadas pela API
size_t sendBatch() {
  File f = LittleFS.open(QUEUE_PATH, "r");
  if (!f) return 0;

  JsonDocument body;
  body["device_id"] = DEVICE_ID;
  body["fw"] = FW_VERSION;
  body["rssi"] = WiFi.RSSI();
  JsonArray readings = body["readings"].to<JsonArray>();

  size_t count = 0;
  while (f.available() && count < BATCH_MAX) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    JsonDocument item;
    if (deserializeJson(item, line) == DeserializationError::Ok) readings.add(item);
    count++;
  }
  f.close();
  if (count == 0) return 0;

  String payload;
  serializeJson(body, payload);

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;
  bool https = String(API_URL).startsWith("https://");
  if (https) {
    // Simplificação do protótipo: aceita o certificado sem validar a cadeia.
    // Em produção, fixar o certificado raiz com secureClient.setCACert(...).
    secureClient.setInsecure();
    http.begin(secureClient, API_URL);
  } else {
    http.begin(plainClient, API_URL);  // desenvolvimento na rede local
  }
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_API_KEY);

  int status = http.POST(payload);
  String response = http.getString();
  http.end();

  if (status == 201) {
    Serial.printf("  -> API: %u leituras enviadas %s\n", (unsigned)count, response.c_str());
    return count;
  }
  Serial.printf("  -> API respondeu %d: %s\n", status, response.c_str());
  // 400 = lote rejeitado de forma permanente; descarta para não travar a fila
  return status == 400 ? count : 0;
}

void flushQueue() {
  if (WiFi.status() != WL_CONNECTED) return;
  // Esvazia o buffer em lotes, no máximo 10 por ciclo para não bloquear as leituras
  for (int i = 0; i < 10; i++) {
    size_t sent = sendBatch();
    if (sent == 0) break;
    dropQueueHead(sent);
  }
}

// ---------- Ciclo principal ----------

void takeReading() {
  if (!clockSynced()) {
    Serial.println("Relógio ainda não sincronizado; leitura ignorada.");
    syncClock();
    return;
  }

  time_t now = time(nullptr);
  float temperature = NAN, humidity = NAN;
  bool dhtOk = readDht(temperature, humidity);
  int soilRaw = readSoilRaw();
  float soilPct = soilPercent(soilRaw);

  struct tm utc;
  gmtime_r(&now, &utc);
  char stamp[24];
  strftime(stamp, sizeof(stamp), "%Y-%m-%d %H:%M:%S", &utc);
  if (dhtOk) {
    Serial.printf("%s UTC | Ar: %.1f °C, %.0f%% | Solo: %d (%.0f%%) | fila: %u\n",
                  stamp, temperature, humidity, soilRaw, soilPct, (unsigned)queueLines() + 1);
  } else {
    Serial.printf("%s UTC | Ar: falha no DHT | Solo: %d (%.0f%%)\n", stamp, soilRaw, soilPct);
  }

  enqueue(now, dhtOk, temperature, humidity, soilRaw, soilPct);
  flushQueue();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.printf("SMART GARDEN 2.0 — firmware %s — nó %s\n", FW_VERSION, DEVICE_ID);

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);  // faixa de leitura até ~3,3 V
  pinMode(SOIL_POWER_PIN, OUTPUT);
  digitalWrite(SOIL_POWER_PIN, LOW);
  dht.begin();

  if (!LittleFS.begin(true)) {
    Serial.println("Falha ao montar o LittleFS; leituras não serão bufferizadas.");
  } else {
    Serial.printf("Buffer local: %u leituras pendentes.\n", (unsigned)queueLines());
  }

  connectWifi();
  syncClock();
  takeReading();
  lastReadMs = millis();
}

void loop() {
  ensureWifi();
  if (millis() - lastReadMs >= READ_INTERVAL_MS) {
    lastReadMs = millis();
    takeReading();
  }
  delay(50);
}
