#include <TFT_eSPI.h>
#include <SPI.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#include "ash.h"
#include "mario.h"
#include "pokeball.h"
#include "bulbasaur.h"
#include "charmander.h"
#include "squirtle.h"
#include "kirby.h"

const char* ssid = "lemon";
const char* password = "12345678";
const char* websockets_server_host = "wss://lime.fly.dev:443/ws";

String currentIcon = "";

WebSocketsClient webSocket;
TFT_eSPI tft = TFT_eSPI();

void setup(void) {
  Serial.begin(115200);
  tft.init();
  tft.fillScreen(TFT_BLACK);
  tft.setSwapBytes(true);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  Serial.println(WiFi.localIP());

  webSocket.beginSSL("lime.fly.dev", 443, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void displayIcon(String icon) {
  tft.fillScreen(TFT_BLACK);

  if (icon == "nes-mario") {
    tft.pushImage(8, 72, 154, 176, mario);
  } else if (icon == "nes-ash") {
    tft.pushImage(15, 85, 140, 150, ash);
  } else if (icon == "nes-pokeball") {
    tft.pushImage(8, 83, 154, 154, pokeball);
  } else if (icon == "nes-bulbasaur") {
    tft.pushImage(5, 92, 160, 136, bulbasaur);
  } else if (icon == "nes-charmander") {
    tft.pushImage(1, 88, 168, 144, charmander);
  } else if (icon == "nes-squirtle") {
    tft.pushImage(1, 92, 168, 136, squirtle);
  } else if (icon == "nes-kirby") {
    tft.pushImage(5, 80, 160, 160, kirby);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("Connected!");
      break;
    case WStype_TEXT:
      Serial.printf("Received text: %s\n", payload);
      
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        return;
      }
      
      if (doc["type"] == "vote_result") {
        currentIcon = doc["icon"].as<String>();
        Serial.println("Current icon: " + currentIcon);
        displayIcon(currentIcon);
      }
      break;
  }
}

void loop() {
    webSocket.loop();
}

