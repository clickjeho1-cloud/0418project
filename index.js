import "dotenv/config";
import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import { PrismaClient } from "@prisma/client";
import {
  TelemetrySchema,
  ActuatorStateSchema,
  StatusSchema,
  EventSchema,
  ActuatorCommandSchema,
} from "./mqttPayloads.js";
import { createSseHub } from "./sseHub.js";

const prisma = new PrismaClient();
const app = express();
const sse = createSseHub();

app.use(express.json());
app.use(
  cors({
    origin: process.env.SSE_ORIGIN || true,
    credentials: false,
  }),
);

// ---- SSE (프론트 실시간) ----
app.get("/api/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: hello\ndata: {}\n\n");
  sse.addClient(res);
});

// ---- REST: 제어 명령 발행 ----
// POST /api/devices/:deviceId/actuators/:actuator/cmd
app.post("/api/devices/:deviceId/actuators/:actuator/cmd", async (req, res) => {
  const { deviceId, actuator } = req.params;
  const parsed = ActuatorCommandSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", detail: parsed.error.flatten() });
  }

  if (!["led", "pump", "fan1", "fan2"].includes(actuator)) {
    return res.status(400).json({ error: "invalid_actuator" });
  }

  const topic = `jkh/sf/${deviceId}/cmd/${actuator}`;
  const payload = JSON.stringify(parsed.data);

  try {
    // 제어 명령은 일회성: retain 미사용
    mqttClient.publish(topic, payload, { qos: 1, retain: false });
    await prisma.device.upsert({
      where: { id: deviceId },
      update: { lastSeenAt: new Date() },
      create: { id: deviceId, lastSeenAt: new Date() },
    });

    await prisma.actuatorCommand.create({
      data: {
        deviceId,
        actuator,
        timestamp: new Date(parsed.data.timestamp),
        state: parsed.data.state,
        brightness: parsed.data.brightness ?? null,
        qos: 1,
        retained: false,
      },
    });

    sse.broadcast("actuator_command", { device_id: deviceId, actuator, ...parsed.data });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "publish_failed" });
  }
});

// ---- REST: 최근 센서(간단) ----
app.get("/api/devices/:deviceId/latest", async (req, res) => {
  const { deviceId } = req.params;
  const latest = await prisma.sensorReading.findFirst({
    where: { deviceId },
    orderBy: { timestamp: "desc" },
  });
  return res.json({ device_id: deviceId, latest });
});

// ---- MQTT 연결/구독 ----
const mqttUrl = process.env.MQTT_URL;
if (!mqttUrl) {
  // eslint-disable-next-line no-console
  console.error("MQTT_URL 이 설정되지 않았습니다(.env).");
  process.exit(1);
}

const mqttClient = mqtt.connect(mqttUrl, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  reconnectPeriod: 2000,
  clean: true,
});

mqttClient.on("connect", () => {
  // eslint-disable-next-line no-console
  console.log("MQTT connected");
  mqttClient.subscribe("jkh/sf/+/telemetry", { qos: 0 });
  mqttClient.subscribe("jkh/sf/+/state/+", { qos: 1 });
  mqttClient.subscribe("jkh/sf/+/status", { qos: 1 });
  mqttClient.subscribe("jkh/sf/+/event", { qos: 1 });
});

mqttClient.on("message", async (topic, message) => {
  const text = message.toString("utf-8");
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return;
  }

  // telemetry
  if (topic.includes("/telemetry")) {
    const parsed = TelemetrySchema.safeParse(json);
    if (!parsed.success) return;
    const t = parsed.data;
    const deviceId = t.device_id;
    const ts = new Date(t.timestamp);

    await prisma.device.upsert({
      where: { id: deviceId },
      update: { lastSeenAt: new Date() },
      create: { id: deviceId, lastSeenAt: new Date() },
    });

    await prisma.sensorReading.create({
      data: {
        deviceId,
        timestamp: ts,
        temperature: t.temperature ?? null,
        humidity: t.humidity ?? null,
        ec: t.ec ?? null,
        ph: t.ph ?? null,
      },
    });

    // 경계값 규칙 체크(활성 규칙만)
    const rules = await prisma.thresholdRule.findMany({
      where: { deviceId, enabled: true },
    });
    const breaches = [];
    for (const r of rules) {
      const value = t[r.key];
      if (typeof value !== "number") continue;
      if (r.min != null && value < r.min) breaches.push({ key: r.key, value, bound: "min", limit: r.min });
      if (r.max != null && value > r.max) breaches.push({ key: r.key, value, bound: "max", limit: r.max });
    }
    if (breaches.length > 0) {
      const msg = `임계값 이탈: ${breaches.map((b) => `${b.key}=${b.value}(${b.bound}:${b.limit})`).join(", ")}`;
      await prisma.alert.create({
        data: {
          deviceId,
          type: "threshold_breach",
          message: msg,
          level: "warn",
          timestamp: ts,
        },
      });
      sse.broadcast("alert", { device_id: deviceId, type: "threshold_breach", breaches, timestamp: t.timestamp });
    }

    sse.broadcast("telemetry", t);
    return;
  }

  // actuator state
  if (topic.includes("/state/")) {
    const parsed = ActuatorStateSchema.safeParse(json);
    if (!parsed.success) return;
    const s = parsed.data;
    await prisma.device.upsert({
      where: { id: s.device_id },
      update: { lastSeenAt: new Date() },
      create: { id: s.device_id, lastSeenAt: new Date() },
    });
    await prisma.actuatorState.create({
      data: {
        deviceId: s.device_id,
        actuator: s.actuator,
        timestamp: new Date(s.timestamp),
        state: s.state,
        brightness: s.brightness ?? null,
      },
    });
    sse.broadcast("actuator_state", s);
    return;
  }

  // status
  if (topic.endsWith("/status")) {
    const parsed = StatusSchema.safeParse(json);
    if (!parsed.success) return;
    const st = parsed.data;
    await prisma.device.upsert({
      where: { id: st.device_id },
      update: { lastStatus: st.status, lastSeenAt: new Date(st.timestamp) },
      create: { id: st.device_id, lastStatus: st.status, lastSeenAt: new Date(st.timestamp) },
    });
    sse.broadcast("status", st);
    return;
  }

  // event
  if (topic.endsWith("/event")) {
    const parsed = EventSchema.safeParse(json);
    if (!parsed.success) return;
    const ev = parsed.data;
    await prisma.device.upsert({
      where: { id: ev.device_id },
      update: { lastSeenAt: new Date() },
      create: { id: ev.device_id, lastSeenAt: new Date() },
    });
    await prisma.deviceEvent.create({
      data: {
        deviceId: ev.device_id,
        level: ev.level,
        message: ev.message,
        sensor: ev.sensor ?? null,
        timestamp: new Date(ev.timestamp),
      },
    });
    sse.broadcast("event", ev);
    return;
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`jkh-backend listening on :${port}`);
});

