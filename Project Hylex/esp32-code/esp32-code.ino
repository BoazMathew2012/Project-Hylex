#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- PINS ---
#define TDS_PIN         34
#define ONE_WIRE_BUS    4
#define RELAY_PUMP      26   // Active LOW relay channel 1: 12V Pump
#define RELAY_EC        27   // Active LOW relay channel 2: 12V Graphite/Mesh Electrodes
#define SERVO1_PIN      13   // Backpressure valve (20..70 deg)
#define SERVO2_PIN      12   // Carousel chute cutoff (15=OPEN, 85=CLOSED)
#define SERVO3_PIN      14   // Clean Tank B gate (15=OPEN, 85=CLOSED)
#define SERVO4_PIN      25   // Recirculate Tank A gate (15=OPEN, 85=CLOSED)
#define STEP_IN1        18
#define STEP_IN2        19
#define STEP_IN3        21
#define STEP_IN4        22
#define UNO_TX_PIN      17   // Connects to Arduino Uno Pin 10 (RX)
#define UNO_RX_PIN      16

const char* AP_SSID = "HYLEX_COMMAND_CENTER";
const char* AP_PASS = "hylex2026";

WebSocketsServer webSocket = WebSocketsServer(81);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
Servo servos[4];
const int servoPins[4] = {SERVO1_PIN, SERVO2_PIN, SERVO3_PIN, SERVO4_PIN};
int currentAngles[4]   = {20, 15, 85, 15};

enum SystemState {
  STATE_WAITING_CONNECT = 0, // Waiting for laptop WebSocket
  STATE_CONNECTED_STANDBY,   // Connected! Waiting for user to click START on laptop
  STATE_PRE_COAGULATION,     // Stage 1: 30s Electro-Coagulation in Tank A (Pump OFF, EC ON)
  STATE_ACTIVE_SEPARATION,   // Stage 2: Pump ON + Vortex + Edge-AI/Ollama Routing
  STATE_POD_ROTATING         // Indexing 3-Slot Carousel 120 deg
};

SystemState sysState = STATE_WAITING_CONNECT;
uint8_t connectedClients = 0;
unsigned long stateStartMs = 0;
unsigned long lastTelemetryMs = 0;
const unsigned long PRE_COAG_DURATION_MS = 30000; // 30 sec pre-coagulation before pumping

float currentTemp = 25.0;
float currentTDS  = 1450.0;
float podLoadPct  = 0.0;
int activePod     = 1;
String aiReason   = "Standby - Waiting for Web Start";

// Anti-brownout staggered servo mover: moves 1 servo smoothly, then detaches PWM
void moveServoSmooth(int idx, int targetAngle) {
  targetAngle = constrain(targetAngle, 15, 85);
  if (currentAngles[idx] == targetAngle) return;
  servos[idx].attach(servoPins[idx], 500, 2400);
  int step = (targetAngle > currentAngles[idx]) ? 3 : -3;
  for (int a = currentAngles[idx]; (step > 0) ? (a < targetAngle) : (a > targetAngle); a += step) {
    servos[idx].write(a);
    delay(15);
  }
  servos[idx].write(targetAngle);
  delay(120);
  servos[idx].detach(); // Stops holding current so TFT screen NEVER flickers/whites out!
  currentAngles[idx] = targetAngle;
  delay(150);           // Gap before next servo can move
}

void setRelays(bool pumpOn, bool ecOn) {
  digitalWrite(RELAY_PUMP, pumpOn ? LOW : HIGH);
  digitalWrite(RELAY_EC,   ecOn   ? LOW : HIGH);
}

void rotateCarousel120() {
  sysState = STATE_POD_ROTATING;
  moveServoSmooth(1, 85); // Pinch chute closed
  const int seq[8][4] = {
    {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
    {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
  };
  for (int s = 0; s < 3072; s++) {
    int p = s % 8;
    digitalWrite(STEP_IN1, seq[p][0]);
    digitalWrite(STEP_IN2, seq[p][1]);
    digitalWrite(STEP_IN3, seq[p][2]);
    digitalWrite(STEP_IN4, seq[p][3]);
    delayMicroseconds(1200);
  }
  digitalWrite(STEP_IN1, 0); digitalWrite(STEP_IN2, 0);
  digitalWrite(STEP_IN3, 0); digitalWrite(STEP_IN4, 0);
  activePod = (activePod % 3) + 1;
  podLoadPct = 0.0;
  moveServoSmooth(1, 15); // Reopen chute
  sysState = STATE_ACTIVE_SEPARATION;
}

void readSensors() {
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t > 5.0 && t < 60.0) currentTemp = t;

  // 10-sample median/average filter to stop TDS jumping
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(TDS_PIN); delay(2); }
  float voltage = (sum / 10.0) * (3.3 / 4095.0);
  float ec25 = voltage / (1.0 + 0.02 * (currentTemp - 25.0));
  float rawTds = (133.42 * ec25 * ec25 * ec25 - 255.86 * ec25 * ec25 + 857.39 * ec25) * 0.5;
  if (rawTds > 50.0) currentTDS = (0.8 * currentTDS) + (0.2 * rawTds);
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    connectedClients++;
    if (sysState == STATE_WAITING_CONNECT) {
      sysState = STATE_CONNECTED_STANDBY;
      Serial2.println("EVENT:CONNECTED"); // Triggers 1-sec animation on Uno TFT!
    }
  } else if (type == WStype_DISCONNECTED) {
    if (connectedClients > 0) connectedClients--;
    if (connectedClients == 0) {
      setRelays(false, false);
      sysState = STATE_WAITING_CONNECT;
      Serial2.println("EVENT:WAITING");
    }
  } else if (type == WStype_TEXT) {
    String msg = String((char*)payload);
    if (msg.indexOf("START_PROCESS") >= 0) {
      sysState = STATE_PRE_COAGULATION;
      stateStartMs = millis();
      setRelays(false, true); // Stage 1: ONLY Electrodes ON, Pump OFF!
      aiReason = "Stage 1: Pre-Coagulating Mg/Ca Ions (30s)";
    } else if (msg.indexOf("STOP_PROCESS") >= 0) {
      setRelays(false, false);
      sysState = STATE_CONNECTED_STANDBY;
      aiReason = "Process Paused by Operator";
    } else if (msg.indexOf("OLLAMA_BACKPRESSURE:") >= 0) {
      int ang = msg.substring(msg.indexOf(":") + 1).toInt();
      moveServoSmooth(0, ang);
    } else if (msg.indexOf("ROTATE_POD") >= 0) {
      rotateCarousel120();
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, UNO_RX_PIN, UNO_TX_PIN);
  pinMode(RELAY_PUMP, OUTPUT); pinMode(RELAY_EC, OUTPUT);
  setRelays(false, false); // Everything OFF at boot!
  pinMode(STEP_IN1, OUTPUT); pinMode(STEP_IN2, OUTPUT);
  pinMode(STEP_IN3, OUTPUT); pinMode(STEP_IN4, OUTPUT);
  tempSensor.begin();

  WiFi.softAP(AP_SSID, AP_PASS);
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  Serial2.println("EVENT:WAITING");
}

void loop() {
  webSocket.loop();

  // State machine transitions
  if (sysState == STATE_PRE_COAGULATION) {
    if (millis() - stateStartMs >= PRE_COAG_DURATION_MS) {
      sysState = STATE_ACTIVE_SEPARATION;
      setRelays(true, true); // Now turn ON Pump + keep Electrodes ON!
      aiReason = "Stage 2: Vortex Separation + AI Routing";
    }
  } else if (sysState == STATE_ACTIVE_SEPARATION) {
    if (currentTDS <= 500.0) {
      moveServoSmooth(3, 85); // Close recirculate
      moveServoSmooth(2, 15); // Open Clean Tank B
    } else {
      moveServoSmooth(2, 85); // Close Clean Tank B
      moveServoSmooth(3, 15); // Open recirculate to Tank A
    }
    podLoadPct = min(100.0f, podLoadPct + 0.4f);
    if (podLoadPct >= 100.0f) rotateCarousel120();
  }

  // Send telemetry every 500ms to Laptop WebSocket & Arduino Uno TFT
  if (millis() - lastTelemetryMs >= 500) {
    lastTelemetryMs = millis();
    readSensors();
    int coagRem = (sysState == STATE_PRE_COAGULATION)
                  ? max(0L, (long)(PRE_COAG_DURATION_MS - (millis() - stateStartMs)) / 1000L) : 0;

    // 1. Send compact line to Arduino Uno TFT
    Serial2.printf("DATA:%d,%.0f,%.1f,%d,%.0f,%d\n",
                   (int)sysState, currentTDS, currentTemp, activePod, podLoadPct, coagRem);

    // 2. Broadcast JSON to Laptop Web App & Ollama 1.5B Controller
    String json = "{\"state\":" + String((int)sysState) +
                  ",\"tds\":" + String(currentTDS, 1) +
                  ",\"temp\":" + String(currentTemp, 1) +
                  ",\"pod\":" + String(activePod) +
                  ",\"podLoad\":" + String(podLoadPct, 0) +
                  ",\"coagRemaining\":" + String(coagRem) +
                  ",\"servo1\":" + String(currentAngles[0]) +
                  ",\"aiReason\":\"" + aiReason + "\"}";
    webSocket.broadcastTXT(json);
  }
}