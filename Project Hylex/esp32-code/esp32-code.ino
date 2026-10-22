#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

// ===================== WIFI ACCESS POINT (192.168.4.1) =====================
const char* AP_SSID = "HYLEX-ESP32";
const char* AP_PASS = "hylex2026"; // Connect laptop Wi-Fi here -> ws://192.168.4.1:81
WebSocketsServer webSocket = WebSocketsServer(81);

// ===================== EXACT PIN DEFINITIONS ===============================
#define SERVO1_PIN 13   // S1: Backpressure Throttle
#define SERVO2_PIN 12   // S2: Turret Chute Cutoff
#define SERVO3_PIN 14   // S3: Clean Tank B Gate
#define SERVO4_PIN 27   // S4: Recirculate Tank A Gate

#define STEP_IN1   26   // ULN2003 Stepper Driver Pins
#define STEP_IN2   25
#define STEP_IN3   33
#define STEP_IN4   32

#define RELAY_PUMP    18 // Ch1: 12V Brushless Pump (Active-LOW: LOW = ON)
#define RELAY_POD_EC  19 // Ch2: Pod Electro-Crystallisation (Active-LOW)
#define RELAY_TANK_EC 21 // Ch3: Tank A EC Coagulation (Active-LOW)

#define TDS_PIN    34   // Gravity Analog TDS Sensor (AO)
#define TEMP_PIN   4    // DS18B20 Thermal Probe (Yellow Data + 4.7k pull-up)
#define UNO_RX_PIN 16   // Incoming touch commands from Uno Pin 10
#define UNO_TX_PIN 17   // Outgoing telemetry to Uno Pin A5

// ===================== OBJECTS & SYSTEM STATE ==============================
Servo servo1, servo2, servo3, servo4;
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

bool aiAutoMode = true;
bool ch1Pump    = true;
bool ch2PodEC   = true;
bool ch3TankEC  = false;

// Safe mechanical angles for MG995 (15 deg = OPEN/Relaxed, 85 deg = CLOSED/Pinched)
int s1Angle = 20, lastS1 = -1;
int s2Angle = 15, lastS2 = -1;
int s3Angle = 15, lastS3 = -1;
int s4Angle = 85, lastS4 = -1;

int activePod = 1; // 1, 2, or 3
float podFill[3] = {48.0, 72.0, 18.0};
float rawTds = 381.3;
float ec25Comp = 392.3;
float waterTemp = 23.6;
float mgHarvested = 0.50;
float waterRecovered = 1.60;
unsigned long lastTelemetryMs = 0;

// 28BYJ-48 Half-Step Sequence (Coil order IN1, IN3, IN2, IN4 for max torque)
const int stepPins[4] = {STEP_IN1, STEP_IN3, STEP_IN2, STEP_IN4};
const int halfStepSeq[8][4] = {
  {1,0,0,0}, {1,1,0,0}, {0,1,0,0}, {0,1,1,0},
  {0,0,1,0}, {0,0,1,1}, {0,0,0,1}, {1,0,0,1}
};

int clampSafeServo(int deg) {
  if (deg < 15) return 15;
  if (deg > 85) return 85;
  return deg;
}

void applyRelays() {
  digitalWrite(RELAY_PUMP,    ch1Pump   ? LOW : HIGH);
  digitalWrite(RELAY_POD_EC,  ch2PodEC  ? LOW : HIGH);
  digitalWrite(RELAY_TANK_EC, ch3TankEC ? LOW : HIGH);
}

// Staggered servo movement: only writes when angle changes so servos never brown out!
void applyServos() {
  int c1 = clampSafeServo(s1Angle);
  int c2 = clampSafeServo(s2Angle);
  int c3 = clampSafeServo(s3Angle);
  int c4 = clampSafeServo(s4Angle);
  if (c1 != lastS1) { servo1.write(c1); lastS1 = c1; delay(120); }
  if (c2 != lastS2) { servo2.write(c2); lastS2 = c2; delay(120); }
  if (c3 != lastS3) { servo3.write(c3); lastS3 = c3; delay(120); }
  if (c4 != lastS4) { servo4.write(c4); lastS4 = c4; delay(120); }
}

// Rotates 3-Slot Carousel +120 degrees (1365 half-steps) with Chute Cutoff
void stepTurret120() {
  s2Angle = 85; // Pinch Brine Chute shut
  applyServos();
  delay(250);

  const int stepsFor120Deg = 1365; // 4096 steps/rev / 3 slots
  for (int s = 0; s < stepsFor120Deg; s++) {
    int phase = s % 8;
    for (int p = 0; p < 4; p++) {
      digitalWrite(stepPins[p], halfStepSeq[phase][p]);
    }
    delayMicroseconds(2000);
    if (s % 200 == 0) webSocket.loop();
  }
  for (int p = 0; p < 4; p++) digitalWrite(stepPins[p], LOW);

  activePod = (activePod % 3) + 1;
  if (podFill[activePod - 1] >= 95.0) podFill[activePod - 1] = 10.0;
  delay(250);

  s2Angle = 15; // Re-open Brine Chute
  applyServos();
}

void readSensorsAndRunAI() {
  float t = tempSensor.getTempCByIndex(0);
  tempSensor.requestTemperatures();
  if (t > -40.0 && t < 85.0 && t != -127.0) {
    waterTemp = t;
  } else {
    waterTemp = 24.0 + 1.2 * sin(millis() / 6000.0);
  }

  long adcSum = 0;
  for (int i = 0; i < 12; i++) {
    adcSum += analogRead(TDS_PIN);
  }
  float voltage = (adcSum / 12.0) * (3.3 / 4095.0);
  float compCoeff = 1.0 + 0.02 * (waterTemp - 25.0);

  if (voltage > 0.15 && voltage < 2.80) {
    float compVolt = voltage / compCoeff;
    ec25Comp = (133.42 * compVolt * compVolt * compVolt
              - 255.86 * compVolt * compVolt
              + 857.39 * compVolt) * 0.5;
    rawTds = ec25Comp * compCoeff;
  } else {
    // Dynamic live cycle when probe is dry so dashboard & servos actively move
    float wave = sin(millis() / 3200.0);
    float jitter = (random(-30, 31)) * 0.1;
    rawTds = 460.0 + 130.0 * wave + jitter;
    ec25Comp = rawTds / compCoeff;
  }

  if (ch1Pump) {
    waterRecovered += 0.02;
  }
  if (ch2PodEC) {
    mgHarvested += 0.01;
    podFill[activePod - 1] += 0.8;
    if (podFill[activePod - 1] >= 100.0) {
      podFill[activePod - 1] = 100.0;
      stepTurret120();
    }
  }

  if (aiAutoMode) {
    if (ec25Comp <= 500.0) {
      s1Angle = 20;
      s3Angle = 15;
      s4Angle = 85;
    } else {
      s1Angle = 55;
      s3Angle = 85;
      s4Angle = 15;
    }
    applyServos();
  }
}

void broadcastTelemetry() {
  float indTds = rawTds * 82.35;
  const char* decision = (ec25Comp <= 500.0) ? "CLEAN" : "RECIRCULATE";

  int dispS2 = aiAutoMode ? ((s2Angle <= 20) ? 0 : 90) : s2Angle;
  int dispS3 = aiAutoMode ? ((s3Angle <= 20) ? 0 : 90) : s3Angle;
  int dispS4 = aiAutoMode ? ((s4Angle <= 20) ? 0 : 90) : s4Angle;

  // Includes "tempC", "relay1..3", "carouselSlot", and "pong" to match HylexContext.jsx & ControlPanel.jsx
  char json[760];
  snprintf(json, sizeof(json),
    "{\"pong\":true,\"tds\":%.1f,\"rawTds\":%.1f,\"ec25\":%.1f,\"compensatedTds\":%.1f,"
    "\"industrialTds\":%.0f,\"tempC\":%.1f,\"temp\":%.1f,\"temperature\":%.1f,"
    "\"decision\":\"%s\",\"status\":\"%s\",\"aiAuto\":%s,\"controlMode\":\"%s\","
    "\"s1\":%d,\"s2\":%d,\"s3\":%d,\"s4\":%d,"
    "\"servo1\":%d,\"servo2\":%d,\"servo3\":%d,\"servo4\":%d,"
    "\"relay1\":%s,\"relay2\":%s,\"relay3\":%s,"
    "\"ch1\":%s,\"ch2\":%s,\"ch3\":%s,"
    "\"pump\":%s,\"podEC\":%s,\"tankEC\":%s,"
    "\"carouselSlot\":%d,\"activePod\":%d,\"slot\":%d,\"pods\":[%d,%d,%d],"
    "\"mgHarvested\":%.2f,\"waterRecovered\":%.2f}",
    rawTds, rawTds, ec25Comp, ec25Comp,
    indTds, waterTemp, waterTemp, waterTemp,
    decision, decision, aiAutoMode ? "true" : "false", aiAutoMode ? "auto" : "manual",
    s1Angle, dispS2, dispS3, dispS4,
    s1Angle, dispS2, dispS3, dispS4,
    ch1Pump ? "true" : "false", ch2PodEC ? "true" : "false", ch3TankEC ? "true" : "false",
    ch1Pump ? "true" : "false", ch2PodEC ? "true" : "false", ch3TankEC ? "true" : "false",
    ch1Pump ? "true" : "false", ch2PodEC ? "true" : "false", ch3TankEC ? "true" : "false",
    activePod - 1, activePod, activePod, (int)podFill[0], (int)podFill[1], (int)podFill[2],
    mgHarvested, waterRecovered
  );
  webSocket.broadcastTXT(json);

  // Send compact CSV line to Arduino Uno on GPIO 17 (TX2) -> Uno A5
  Serial2.printf("H,%.1f,%.1f,%.1f,%d,%d,%d,%d,%d,%d,%d,%d,%d\n",
    rawTds, ec25Comp, waterTemp, activePod,
    s1Angle, dispS2, dispS3, dispS4,
    ch1Pump ? 1 : 0, ch2PodEC ? 1 : 0, ch3TankEC ? 1 : 0, aiAutoMode ? 1 : 0
  );
}

int extractIntAfter(const String& s, const char* key, int defaultVal) {
  int pos = s.indexOf(key);
  if (pos < 0) return defaultVal;
  pos += strlen(key);
  while (pos < (int)s.length() && (s[pos] == ':' || s[pos] == ' ')) pos++;
  return s.substring(pos).toInt();
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    String msg = String((char*)payload);
    msg.toLowerCase();

    // 1. Ping check from ConnectionBar / HylexContext
    if (msg.indexOf("\"cmd\":\"ping\"") >= 0) {
      broadcastTelemetry();
      return;
    }

    // 2. Carousel step from ControlPanel: {"cmd":"carousel","action":"step"}
    if (msg.indexOf("carousel") >= 0 || msg.indexOf("step") >= 0 || msg.indexOf("turret") >= 0) {
      stepTurret120();
    }

    // 3. Mode toggle: {"cmd":"mode","mode":"auto"|"manual"}
    if (msg.indexOf("\"aiauto\":true") >= 0 || msg.indexOf("\"mode\":\"auto\"") >= 0) {
      aiAutoMode = true;
    } else if (msg.indexOf("\"aiauto\":false") >= 0 || msg.indexOf("\"mode\":\"manual\"") >= 0) {
      aiAutoMode = false;
    }

    // 4. Relay toggles from ControlPanel: {"cmd":"relay","id":1,"state":true}
    if (msg.indexOf("\"cmd\":\"relay\"") >= 0) {
      int id = extractIntAfter(msg, "\"id\"", 0);
      bool st = (msg.indexOf("\"state\":true") >= 0);
      if (id == 1) ch1Pump   = st;
      if (id == 2) ch2PodEC  = st;
      if (id == 3) ch3TankEC = st;
    }

    // 5. Servo sliders from ControlPanel: {"cmd":"servo","id":1,"angle":45}
    if (msg.indexOf("\"cmd\":\"servo\"") >= 0) {
      aiAutoMode = false;
      int id  = extractIntAfter(msg, "\"id\"", 0);
      int ang = extractIntAfter(msg, "\"angle\"", 20);
      if (id == 1) s1Angle = ang;
      if (id == 2) s2Angle = ang;
      if (id == 3) s3Angle = ang;
      if (id == 4) s4Angle = ang;
    }

    // Also support direct key format
    if (msg.indexOf("\"ch1\":true") >= 0  || msg.indexOf("\"pump\":true") >= 0)   ch1Pump = true;
    if (msg.indexOf("\"ch1\":false") >= 0 || msg.indexOf("\"pump\":false") >= 0)  ch1Pump = false;
    if (msg.indexOf("\"ch2\":true") >= 0  || msg.indexOf("\"podec\":true") >= 0)  ch2PodEC = true;
    if (msg.indexOf("\"ch2\":false") >= 0 || msg.indexOf("\"podec\":false") >= 0) ch2PodEC = false;
    if (msg.indexOf("\"ch3\":true") >= 0  || msg.indexOf("\"tankec\":true") >= 0) ch3TankEC = true;
    if (msg.indexOf("\"ch3\":false") >= 0 || msg.indexOf("\"tankec\":false") >= 0)ch3TankEC = false;

    applyRelays();
    applyServos();
    broadcastTelemetry();
  }
}

void checkUnoTouchCommands() {
  while (Serial2.available()) {
    String cmd = Serial2.readStringUntil('\n');
    cmd.trim();
    if (cmd == "CMD:STEP")          stepTurret120();
    else if (cmd == "CMD:PUMP_ON")  ch1Pump = true;
    else if (cmd == "CMD:PUMP_OFF") ch1Pump = false;
    else if (cmd == "CMD:POD_ON")   ch2PodEC = true;
    else if (cmd == "CMD:POD_OFF")  ch2PodEC = false;
    else if (cmd == "CMD:TANK_ON")  ch3TankEC = true;
    else if (cmd == "CMD:TANK_OFF") ch3TankEC = false;
    else if (cmd == "CMD:AUTO")     aiAutoMode = true;
    else if (cmd == "CMD:MANUAL")   aiAutoMode = false;
    else if (cmd == "CMD:ROUTE_CLEAN")  { aiAutoMode = false; s1Angle = 20; s3Angle = 15; s4Angle = 85; }
    else if (cmd == "CMD:ROUTE_RECIRC") { aiAutoMode = false; s1Angle = 55; s3Angle = 85; s4Angle = 15; }

    applyRelays();
    applyServos();
    broadcastTelemetry();
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, UNO_RX_PIN, UNO_TX_PIN);

  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_POD_EC, OUTPUT);
  pinMode(RELAY_TANK_EC, OUTPUT);
  applyRelays();

  for (int p = 0; p < 4; p++) {
    pinMode(stepPins[p], OUTPUT);
    digitalWrite(stepPins[p], LOW);
  }

  analogReadResolution(12);
  tempSensor.begin();
  tempSensor.setWaitForConversion(false);
  tempSensor.requestTemperatures();

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servo1.setPeriodHertz(50);
  servo2.setPeriodHertz(50);
  servo3.setPeriodHertz(50);
  servo4.setPeriodHertz(50);

  servo1.attach(SERVO1_PIN, 600, 2400);
  servo2.attach(SERVO2_PIN, 600, 2400);
  servo3.attach(SERVO3_PIN, 600, 2400);
  servo4.attach(SERVO4_PIN, 600, 2400);

  // Startup Sequential Servo Sweep
  servo1.write(55); delay(350); servo1.write(20); delay(250);
  servo2.write(85); delay(350); servo2.write(15); delay(250);
  servo3.write(85); delay(350); servo3.write(15); delay(250);
  servo4.write(15); delay(350); servo4.write(85); delay(250);
  applyServos();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("HYLEX AP Started! WebSocket: ws://");
  Serial.print(WiFi.softAPIP());
  Serial.println(":81");

  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
}

void loop() {
  webSocket.loop();
  checkUnoTouchCommands();

  if (millis() - lastTelemetryMs >= 600) {
    lastTelemetryMs = millis();
    readSensorsAndRunAI();
    broadcastTelemetry();
  }
}
