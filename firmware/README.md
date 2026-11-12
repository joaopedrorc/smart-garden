# Firmware do nó sensor (ESP32)

Placa: DOIT ESP32 DevKit V1 (ESP32-WROOM-32).

## Ligações

| Componente | Pino do componente | Pino do ESP32 |
|---|---|---|
| DHT11/DHT22 (módulo de 3 pinos) | VCC / GND / DATA | 3V3 / GND / GPIO 4 |
| Sensor de umidade do solo capacitivo | VCC / GND / AOUT | 3V3 / GND / GPIO 34 |
| LED verde (solo ideal) | ânodo, via resistor de 220 Ω | GPIO 25 |
| LED amarelo (solo encharcado) | ânodo, via resistor de 220 Ω | GPIO 26 |
| LED vermelho (solo seco) | ânodo, via resistor de 220 Ω | GPIO 27 |

Cátodos dos LEDs no GND. DHT sem módulo (4 pinos) precisa de resistor de 10 kΩ entre DATA e 3V3.
O sensor de solo usa o GPIO 34 porque o ADC2 do ESP32 fica indisponível com o Wi-Fi ligado.

## Arduino IDE

1. Preferências → URLs adicionais de gerenciadores de placas:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. Gerenciador de placas: instalar **esp32** (Espressif Systems).
3. Gerenciador de bibliotecas: **DHT sensor library** (Adafruit), **Adafruit Unified Sensor**, **ArduinoJson** (7.x).
4. Copiar `secrets.example.h` para `secrets.h` e preencher Wi-Fi, URL da API e chave.
5. Placa: **DOIT ESP32 DEVKIT V1**. Monitor serial em **115200 baud**.

## Calibração do solo

Com o monitor serial aberto, anote o valor bruto do solo com o sensor **no ar** (`SOIL_DRY_RAW`)
e **mergulhado num copo d'água** até a linha indicada na haste (`SOIL_WET_RAW`).
Ajuste os dois `#define` no início do `.ino` e grave de novo.

## Instalação na horta

Proteja o DHT do sol direto (abrigo ventilado, por exemplo pratos plásticos brancos empilhados),
a cerca de 1,5 m do chão e longe de paredes. Sem abrigo, a temperatura medida ao sol fica vários
graus acima da temperatura do ar, e a comparação com as estações meteorológicas perde validade.
