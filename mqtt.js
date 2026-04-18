import mqtt from "mqtt";

let client = null;

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

export function connectMQTT(onMessage, onStatusChange) {
  if (client && client.connected) return client;

  client = mqtt.connect(BROKER_URL, {
    clientId: "glovera-web-" + Math.random().toString(16).slice(2, 10),
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    console.log("MQTT 연결 성공");
    onStatusChange?.("connected");

    client.subscribe("glovera/smartfarm/sensors");
    client.subscribe("glovera/smartfarm/status");
  });

  client.on("reconnect", () => {
    console.log("MQTT 재연결 중...");
    onStatusChange?.("reconnecting");
  });

  client.on("close", () => {
    console.log("MQTT 연결 종료");
    onStatusChange?.("offline");
  });

  client.on("error", (err) => {
    console.error("MQTT 오류:", err);
    onStatusChange?.("error");
  });

  client.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log("수신:", topic, payload);
      onMessage?.(topic, payload);
    } catch (e) {
      console.error("JSON 파싱 오류:", e);
    }
  });

  return client;
}

export function disconnectMQTT() {
  if (client) {
    client.end(true);
    client = null;
  }
}

export function publishControl(device, state) {
  if (!client || !client.connected) {
    console.warn("MQTT 미연결 상태");
    return;
  }

  const payload = {
    device,
    state,
    ts: new Date().toISOString(),
  };

  client.publish("glovera/smartfarm/control", JSON.stringify(payload));
  console.log("제어 전송:", payload);
}