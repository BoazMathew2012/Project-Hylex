#include <Adafruit_GFX.h>
#include <MCUFRIEND_kbv.h>
#include <SoftwareSerial.h>

MCUFRIEND_kbv tft;
SoftwareSerial espSerial(10, 11); // RX=10 (from ESP32 Pin 17), TX=11

#define BG_DARK   0x08A5
#define CYAN      0x07FF
#define GREEN     0x07E0
#define YELLOW    0xFFE0
#define WHITE     0xFFFF
#define CARD_BG   0x1149

int uiScreen = 0; // 0=Waiting, 1=Main Dashboard
int lastState = -1, lastTds = -1, lastPod = -1, lastCoag = -1;
String rxBuf = "";

void drawWaitingScreen() {
  tft.fillScreen(BG_DARK);
  tft.drawRoundRect(20, 40, 440, 240, 12, CYAN);
  tft.setTextColor(CYAN); tft.setTextSize(3);
  tft.setCursor(85, 95);  tft.print("PROJECT HYLEX");
  tft.setTextColor(YELLOW); tft.setTextSize(2);
  tft.setCursor(95, 155); tft.print("WAITING TO CONNECT...");
  tft.setTextColor(WHITE); tft.setTextSize(1);
  tft.setCursor(115, 200); tft.print("Connect Laptop to Wi-Fi: HYLEX_COMMAND_CENTER");
}

void playConnectedAnimation() {
  tft.fillScreen(BG_DARK);
  for (int r = 10; r <= 70; r += 15) {
    tft.drawCircle(240, 140, r, GREEN);
    delay(120);
  }
  tft.fillCircle(240, 140, 45, GREEN);
  tft.setTextColor(WHITE); tft.setTextSize(3);
  tft.setCursor(135, 215); tft.print("CONNECTED!");
  delay(1000); // 1-second celebration screen
  drawDashboardShell();
  uiScreen = 1;
}

void drawDashboardShell() {
  tft.fillScreen(BG_DARK);
  tft.fillRect(0, 0, 480, 40, CARD_BG);
  tft.setTextColor(CYAN); tft.setTextSize(2);
  tft.setCursor(15, 12); tft.print("HYLEX EDGE-AI HMI");

  tft.fillRoundRect(15, 55, 215, 110, 8, CARD_BG);
  tft.setTextColor(CYAN); tft.setTextSize(1);
  tft.setCursor(25, 65); tft.print("SALINITY (TEMP-COMPENSATED)");

  tft.fillRoundRect(250, 55, 215, 110, 8, CARD_BG);
  tft.setCursor(260, 65); tft.print("WATER TEMP & CAROUSEL POD");

  tft.fillRoundRect(15, 180, 450, 120, 8, CARD_BG);
  tft.setCursor(25, 192); tft.print("SYSTEM STAGE & AI CONTROLLER STATUS");
  lastState = -1; lastTds = -1; lastPod = -1; lastCoag = -1;
}

void updateDashboard(int st, int tds, float temp, int pod, int load, int coagRem) {
  if (tds != lastTds) {
    tft.setTextColor(tds <= 500 ? GREEN : YELLOW, CARD_BG);
    tft.setTextSize(4);
    tft.setCursor(30, 95);
    char buf[12]; sprintf(buf, "%4d PPM", tds);
    tft.print(buf);
    lastTds = tds;
  }
  if (pod != lastPod) {
    tft.setTextColor(WHITE, CARD_BG); tft.setTextSize(2);
    tft.setCursor(265, 90);
    tft.print("Temp: "); tft.print(temp, 1); tft.print(" C  ");
    tft.setCursor(265, 125);
    tft.print("Pod #"); tft.print(pod); tft.print(" ("); tft.print(load); tft.print("%)  ");
    lastPod = pod;
  }
  if (st != lastState || coagRem != lastCoag) {
    tft.fillRect(25, 215, 430, 75, CARD_BG);
    tft.setCursor(25, 220); tft.setTextSize(2);
    if (st == 1) {
      tft.setTextColor(YELLOW);
      tft.print("READY - START ON LAPTOP WEB");
    } else if (st == 2) {
      tft.setTextColor(CYAN);
      tft.print("STAGE 1: PRE-COAGULATION ("); tft.print(coagRem); tft.print("s)");
    } else if (st == 3) {
      tft.setTextColor(GREEN);
      tft.print("STAGE 2: VORTEX & AI ROUTING");
    } else if (st == 4) {
      tft.setTextColor(YELLOW);
      tft.print("ROTATING CAROUSEL 120 DEG...");
    }
    lastState = st; lastCoag = coagRem;
  }
}

void setup() {
  espSerial.begin(9600);
  uint16_t id = tft.readID();
  if (id == 0xD3D3) id = 0x9486;
  tft.begin(id);
  tft.setRotation(1);
  drawWaitingScreen();
}

void loop() {
  while (espSerial.available()) {
    char c = espSerial.read();
    if (c == '\n') {
      rxBuf.trim();
      if (rxBuf == "EVENT:WAITING") {
        uiScreen = 0; drawWaitingScreen();
      } else if (rxBuf == "EVENT:CONNECTED") {
        playConnectedAnimation();
      } else if (rxBuf.startsWith("DATA:")) {
        if (uiScreen == 0) playConnectedAnimation();
        String d = rxBuf.substring(5);
        int s1 = d.indexOf(','), s2 = d.indexOf(',', s1+1), s3 = d.indexOf(',', s2+1), s4 = d.indexOf(',', s3+1), s5 = d.indexOf(',', s4+1);
        int st   = d.substring(0, s1).toInt();
        int tds  = d.substring(s1+1, s2).toInt();
        float tp = d.substring(s2+1, s3).toFloat();
        int pod  = d.substring(s3+1, s4).toInt();
        int ld   = d.substring(s4+1, s5).toInt();
        int cg   = d.substring(s5+1).toInt();
        updateDashboard(st, tds, tp, pod, ld, cg);
      }
      rxBuf = "";
    } else {
      rxBuf += c;
    }
  }
}