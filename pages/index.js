/*************************************************** 
 * UNO R4 WiFi + HiveMQ Cloud TLS 8883 v10.0
 * WiFiSSLClient + CertificateUploader
 ***************************************************/

#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include "WiFiSSLClient.h"  // ← SSL!
#include <Adafruit_SHT31.h>

char ssid[] = "U+Net860C";
char pass[] = "170BG8C9D#";

// HiveMQ TLS
const char broker[] = "763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud";
const int port = 8883;  // TLS 포트!
const char mqtt_user[] = "jhk001";
const char mqtt_pass[] = "Sinwonpark1!";
const char topic_temp[] = "temp1";
const char topic_humi[] = "humi1";

// SSL 클라이언트 (올바른 클래스!)
WiFiSSLClient sslClient;
MqttClient mqttClient(sslClient);
Adafruit_SHT31 sht31 = Adafruit_SHT31();

void setup() {
  Serial.begin(9600);
  delay(2000);
  Serial.println("=== HiveMQ TLS v10.0 ===");

  if (!sht31.begin(0x44)) {
    Serial.println("❌ SHT31 Fail");
    while(1);
  }
  Serial.println("✅ SHT31 OK");

  connectWiFi();
  connectMQTT();
}

void connectWiFi() {
  Serial.print("WiFi: "); Serial.println(ssid);
  WiFi.begin(ssid, pass);
  
  int i = 0;
  while (WiFi.status() != WL_CONNECTED && i++ < 30) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nIP: " + WiFi.localIP().toString());
  Serial.print("RSSI: "); Serial.println(WiFi.RSSI());
}

void connectMQTT() {
  mqttClient.setId("R4_TLS_v10");
  mqttClient.setUsernamePassword(mqtt_user, mqtt_pass);

  Serial.print("TLS Connect: ");
  Serial.print(broker);
  Serial.print(":");
  Serial.println(port);

  // TLS 연결 시도
  if (mqttClient.connect(broker, port)) {
    Serial.println("✅ HiveMQ TLS Connected!");
    mqttClient.subscribe(topic_temp);
    mqttClient.subscribe(topic_humi);
    Serial.println("Subscribed: temp1, humi1");
  } else {
    Serial.print("❌ TLS FAIL Code: ");
    Serial.println(mqttClient.connectError());
    Serial.println("1. CertificateUploader 실행");
    Serial.println("2. WiFi 펌웨어 업데이트");
    while(1);
  }
}

void loop() {
  mqttClient.poll();

  static unsigned long lastSend = 0;
  if (millis() - lastSend > 4000) {
    lastSend = millis();

    float t = sht31.readTemperature();
    if (!isnan(t)) {
      char buf[8];
      dtostrf(t, 4, 1, buf);
      mqttClient.beginMessage(topic_temp);
      mqttClient.print(buf);
      mqttClient.endMessage();
      Serial.print("Temp: "); Serial.print(buf); Serial.println("°C");
    }

    float h = sht31.readHumidity();
    if (!isnan(h)) {
      char buf[8];
      dtostrf(h, 4, 1, buf);
      mqttClient.beginMessage(topic_humi);
      mqttClient.print(buf);
      mqttClient.endMessage();
      Serial.print("Hum: "); Serial.print(buf); Serial.println("%");
    }
  }
}