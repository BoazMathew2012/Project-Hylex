#include <Adafruit_GFX.h>
#include <MCUFRIEND_kbv.h>
#include <TouchScreen.h>
#include <SoftwareSerial.h>

MCUFRIEND_kbv tft;

// UART Link: RX = A5 (from ESP32 GPIO 17), TX = Pin 10 (to ESP32 GPIO 16 RX2)
SoftwareSerial espSerial(A5, 10);

// Standard 3.5" Uno Shield Resistive Touch Pins & Calibration
#define YP A3
#define XM A2
#define YM 9
#define XP 8
#define TS_MINX 120
#define TS_MAXX 900
#define TS_MINY 70
#define TS_MAXY 920
#define MINPRESSURE 10
#define MAXPRESSURE 1000

TouchScreen ts = TouchScreen(XP, YP, XM, YM, 300);

// 16-bit RGB565 Dashboard Palette
#define BG_DARK     0x0842
#define CARD_BG     0x10A4
#define CYAN_GLOW   0x07FF
#define GREEN_OK    0x07E8
#define AMBER_WARN  0xFD20
#define VIOLET_EC   0x919E
#define BTN_OFF     0x2124
#define TEXT_WHITE  0xFFFF
#define TEXT_MUTED  0x8410

float tds = 381.3, ec25 = 392.3, temp = 23.6;
int pod = 1, s1 = 20, s2 = 0, s3 = 0, s4 = 90;
int pump = 1, podEC = 1, tankEC = 0, aiAuto = 1;
String rxBuffer = "";
unsigned long lastTouchMs = 0;

void drawTouchButtons() {
  // Header Mode Toggle Button (x: 350..470, y: 4..32)
  tft.fillRoundRect(350, 4, 120, 28, 5, aiAuto ? GREEN_OK : AMBER_WARN);
  tft.setTextColor(BG_DARK);
  tft.setTextSize(1);
  tft.setCursor(366, 14);
  tft.print(aiAuto ? "MODE: AI AUTO" : "MODE: MANUAL");

  // Bottom 4 Touch Buttons (y: 268..314)
  // Btn 1: Ch1 Pump (x: 10..118)
  tft.fillRoundRect(10, 268, 108, 46, 6, pump ? CYAN_GLOW : BTN_OFF);
  tft.drawRoundRect(10, 268, 108, 46, 6, CYAN_GLOW);
  tft.setTextColor(pump ? BG_DARK : TEXT_WHITE);
  tft.setCursor(22, 282); tft.print("CH1: PUMP");
  tft.setCursor(38, 296); tft.print(pump ? "[ ON ]" : "[ OFF ]");

  // Btn 2: Ch2 Pod EC (x: 126..234)
  tft.fillRoundRect(126, 268, 108, 46, 6, podEC ? AMBER_WARN : BTN_OFF);
  tft.drawRoundRect(126, 268, 108, 46, 6, AMBER_WARN);
  tft.setTextColor(podEC ? BG_DARK : TEXT_WHITE);
  tft.setCursor(136, 282); tft.print("CH2: POD EC");
  tft.setCursor(154, 296); tft.print(podEC ? "[ ON ]" : "[ OFF ]");

  // Btn 3: Ch3 Tank EC (x: 242..350)
  tft.fillRoundRect(242, 268, 108, 46, 6, tankEC ? VIOLET_EC : BTN_OFF);
  tft.drawRoundRect(242, 268, 108, 46, 6, VIOLET_EC);
  tft.setTextColor(TEXT_WHITE);
  tft.setCursor(250, 282); tft.print("CH3: TANK EC");
  tft.setCursor(270, 296); tft.print(tankEC ? "[ ON ]" : "[ OFF ]");

  // Btn 4: Step Turret +120 deg (x: 358..470)
  tft.fillRoundRect(358, 268, 112, 46, 6, CARD_BG);
  tft.drawRoundRect(358, 268, 112, 46, 6, AMBER_WARN);
  tft.setTextColor(AMBER_WARN);
  tft.setCursor(368, 282); tft.print("STEP +120 DEG");
  tft.setTextColor(TEXT_WHITE);
  tft.setCursor(378, 296); tft.print("-> POD #"); tft.print((pod % 3) + 1);
}

void drawStaticLayout() {
  tft.fillScreen(BG_DARK);
  tft.fillRect(0, 0, 480, 36, CARD_BG);
  tft.setTextColor(CYAN_GLOW);
  tft.setTextSize(2);
  tft.setCursor(10, 10);
  tft.print("HYLEX SDG-6 TOUCH HMI");

  // 4 Telemetry Cards (y: 42..260)
  tft.drawRoundRect(10, 42, 225, 104, 6, CYAN_GLOW);
  tft.drawRoundRect(245, 42, 225, 104, 6, CYAN_GLOW);
  tft.drawRoundRect(10, 154, 225, 104, 6, CYAN_GLOW);
  tft.drawRoundRect(245, 154, 225, 104, 6, CYAN_GLOW);

  tft.setTextColor(TEXT_MUTED);
  tft.setTextSize(1);
  tft.setCursor(20, 50);  tft.print("GRAVITY ANALOG TDS (PPM)");
  tft.setCursor(255, 50); tft.print("DS18B20 THERMAL COMP");
  tft.setCursor(20, 162); tft.print("AI GATE (TAP IN MANUAL)");
  tft.setCursor(255, 162);tft.print("3-SLOT TURRET CAROUSEL");
}

void updateDynamicValues() {
  // Card 1: TDS
  tft.fillRect(18, 64, 210, 76, BG_DARK);
  tft.setTextColor(CYAN_GLOW);
  tft.setTextSize(3);
  tft.setCursor(20, 68);
  tft.print(tds, 1);
  tft.setTextSize(2);
  tft.print(" ppm");
  tft.setTextColor(TEXT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(20, 104);
  tft.print("EC25 Comp: "); tft.print(ec25, 1); tft.print(" ppm");
  tft.setCursor(20, 120);
  tft.print("Target: <= 500 ppm Dubai");

  // Card 2: Temp
  tft.fillRect(253, 64, 210, 76, BG_DARK);
  tft.setTextColor(CYAN_GLOW);
  tft.setTextSize(3);
  tft.setCursor(255, 68);
  tft.print(temp, 1); tft.print(" C");
  tft.setTextColor(TEXT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(255, 108);
  tft.print("Ind. Equiv: "); tft.print(tds * 82.35, 0); tft.print(" ppm");

  // Card 3: AI Gate & Servos
  tft.fillRect(18, 176, 210, 76, BG_DARK);
  bool isClean = (s3 == 0);
  tft.setTextColor(isClean ? GREEN_OK : AMBER_WARN);
  tft.setTextSize(2);
  tft.setCursor(20, 180);
  tft.print(isClean ? "CLEAN -> TANK B" : "RECIRC -> TANK A");
  tft.setTextColor(TEXT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(20, 210);
  tft.print("S1 BackP: "); tft.print(s1); tft.print("d   S2 Chute: "); tft.print(s2); tft.print("d");
  tft.setCursor(20, 228);
  tft.print("S3 Clean: "); tft.print(s3); tft.print("d   S4 Brine: "); tft.print(s4); tft.print("d");

  // Card 4: Active Turret Pod
  tft.fillRect(253, 176, 210, 76, BG_DARK);
  tft.setTextColor(AMBER_WARN);
  tft.setTextSize(2);
  tft.setCursor(255, 180);
  tft.print("ACTIVE: POD #"); tft.print(pod);
  tft.setTextColor(TEXT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(255, 210);
  tft.print("28BYJ-48 Geared Stepper (120d)");
  tft.setCursor(255, 228);
  tft.print("Graphite +12V / 304 SS -12V");

  drawTouchButtons();
}

void checkTouch() {
  TSPoint p = ts.getPoint();
  // CRITICAL: Restore shared pins XM (A2) and YP (A3) to OUTPUT for TFT drawing!
  pinMode(XM, OUTPUT);
  pinMode(YP, OUTPUT);

  if (p.z > MINPRESSURE && p.z < MAXPRESSURE && (millis() - lastTouchMs > 350)) {
    lastTouchMs = millis();
    // Map raw touch coordinates to 480x320 Landscape (Rotation 1)
    int tx = map(p.y, TS_MINY, TS_MAXY, 0, 480);
    int ty = map(p.x, TS_MINX, TS_MAXX, 0, 320);

    // 1. Header Mode Button (x: 340..480, y: 0..42)
    if (tx >= 340 && ty <= 42) {
      aiAuto = !aiAuto;
      espSerial.println(aiAuto ? "CMD:AUTO" : "CMD:MANUAL");
      Serial.println(aiAuto ? "CMD:AUTO" : "CMD:MANUAL");
      drawTouchButtons();
    }
    // 2. Card 3 Tap in Manual Mode: Toggle Clean Tank B vs Recirculate Tank A
    else if (!aiAuto && tx >= 10 && tx <= 235 && ty >= 154 && ty <= 260) {
      if (s3 == 0) { s3 = 90; s4 = 0; s1 = 65; }
      else         { s3 = 0;  s4 = 90; s1 = 20; }
      espSerial.println(s3 == 0 ? "CMD:ROUTE_CLEAN" : "CMD:ROUTE_RECIRC");
      updateDynamicValues();
    }
    // 3. Bottom Touch Control Bar (y: 260..320)
    else if (ty >= 260) {
      if (tx >= 10 && tx <= 120) {
        pump = !pump;
        espSerial.println(pump ? "CMD:PUMP_ON" : "CMD:PUMP_OFF");
        drawTouchButtons();
      } else if (tx >= 125 && tx <= 235) {
        podEC = !podEC;
        espSerial.println(podEC ? "CMD:POD_ON" : "CMD:POD_OFF");
        drawTouchButtons();
      } else if (tx >= 240 && tx <= 352) {
        tankEC = !tankEC;
        espSerial.println(tankEC ? "CMD:TANK_ON" : "CMD:TANK_OFF");
        drawTouchButtons();
      } else if (tx >= 355) {
        pod = (pod % 3) + 1;
        espSerial.println("CMD:STEP");
        updateDynamicValues();
      }
    }
  }
}

void parseLine(String line) {
  if (!line.startsWith("H,")) return;
  float v[12];
  int idx = 2, count = 0;
  while (idx < line.length() && count < 12) {
    int comma = line.indexOf(',', idx);
    if (comma == -1) comma = line.length();
    v[count++] = line.substring(idx, comma).toFloat();
    idx = comma + 1;
  }
  if (count >= 11) {
    tds = v[0]; ec25 = v[1]; temp = v[2];
    pod = (int)v[3];
    s1 = (int)v[4]; s2 = (int)v[5]; s3 = (int)v[6]; s4 = (int)v[7];
    pump = (int)v[8]; podEC = (int)v[9]; tankEC = (int)v[10];
    if (count >= 12) aiAuto = (int)v[11];
    updateDynamicValues();
  }
}

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);

  uint16_t id = tft.readID();
  if (id == 0xD3D3 || id == 0xFFFF || id == 0x0000) id = 0x9486;
  tft.begin(id);
  tft.setRotation(1); // 480x320 Landscape

  drawStaticLayout();
  updateDynamicValues();
}

void loop() {
  checkTouch();
  while (espSerial.available()) {
    char c = (char)espSerial.read();
    if (c == '\n') {
      rxBuffer.trim();
      parseLine(rxBuffer);
      rxBuffer = "";
    } else {
      rxBuffer += c;
    }
  }
}
