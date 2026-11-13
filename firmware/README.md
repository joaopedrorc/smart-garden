# Firmware do nó sensor (ESP32)

Placa: DOIT ESP32 DevKit V1 (ESP32-WROOM-32).

## Ligações

O ESP32 fica fora da protoboard (ele é largo demais para uma meia protoboard) e é ligado por
cabos fêmea-macho. A protoboard distribui a alimentação pelas faixas + (3V3) e − (GND).

| Componente | Pino do componente | Destino |
|---|---|---|
| Alimentação da protoboard | faixa + / faixa − | pino 3V3 / pino GND do ESP32 |
| DHT11, módulo de 3 pinos | + / − / S | faixa + / faixa − / GPIO 4 (D4) |
| DHT11, sensor de 4 pinos | 1 VCC / 2 DATA / 3 NC / 4 GND | faixa + / GPIO 4 / sem ligação / faixa − |
| Sensor de solo (módulo LM393) | VCC / GND / DO / AO | GPIO 25 (D25) / GND do ESP32 / sem ligação / GPIO 34 (D34) |
| Sonda de solo (garfo) | 2 pinos | 2 pinos do módulo, sem polaridade |

- DHT11 de 4 pinos precisa de um resistor de **10 kΩ** (marrom, preto, laranja) entre VCC e DATA.
  O módulo de 3 pinos já tem esse resistor na placa.
- O sensor de solo é **resistivo**: com corrente contínua a sonda sofre eletrólise e corrói.
  Por isso o VCC do módulo vem do GPIO 25, que o firmware liga só durante a leitura.
- O GPIO 34 é usado porque o ADC2 do ESP32 fica indisponível com o Wi-Fi ligado.
- A ordem dos pinos varia entre fabricantes: siga o que está impresso em cada placa.
- O estado do solo (seco, ideal ou encharcado) é calculado no aplicativo, não no nó sensor.

## Arduino IDE

1. Preferências → URLs adicionais de gerenciadores de placas:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. Gerenciador de placas: instalar **esp32** (Espressif Systems).
3. Gerenciador de bibliotecas: **DHT sensor library** (Adafruit), **Adafruit Unified Sensor**, **ArduinoJson** (7.x).
4. Copiar `secrets.example.h` para `secrets.h` e preencher Wi-Fi, URL da API e chave.
5. Placa: **DOIT ESP32 DEVKIT V1**. Monitor serial em **115200 baud**.

## Calibração do solo

Com o monitor serial aberto, anote o valor bruto do solo com o sensor **no ar** (`SOIL_DRY_RAW`)
e com a **sonda mergulhada num copo d'água**, sem molhar o módulo (`SOIL_WET_RAW`).
Ajuste os dois `#define` no início do `.ino` e grave de novo.

## Instalação na horta

Proteja o DHT do sol direto (abrigo ventilado, por exemplo pratos plásticos brancos empilhados),
a cerca de 1,5 m do chão e longe de paredes. Sem abrigo, a temperatura medida ao sol fica vários
graus acima da temperatura do ar, e a comparação com as estações meteorológicas perde validade.
