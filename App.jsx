import { useEffect, useState } from "react";
import { connectMQTT, disconnectMQTT, publishControl } from "./mqtt";

export default function App() {
  const [sensorData, setSensorData] = useState({
    airTemp: 25.1,
    airHum: 62,
    light: 15200,
    moisture: 68,
    tankLevel: 74,
    ec: 1.7,
    ph: 6.1,
  });

  const [devices, setDevices] = useState({
    mainPump: false,
    nutrientPump: false,
    led: false,
    fan: false,
  });

  const [mqttStatus, setMqttStatus] = useState("connecting");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    connectMQTT(
      (topic, payload) => {
        if (topic === "glovera/smartfarm/sensors") {
          setSensorData((prev) => ({
            ...prev,
            airTemp: payload.airTemp ?? prev.airTemp,
            airHum: payload.airHum ?? prev.airHum,
            light: payload.light ?? prev.light,
            moisture: payload.moisture ?? prev.moisture,
            tankLevel: payload.tankLevel ?? prev.tankLevel,
            ec: payload.ec ?? prev.ec,
            ph: payload.ph ?? prev.ph,
          }));
        }

        if (topic === "glovera/smartfarm/status" && payload.devices) {
          setDevices((prev) => ({
            ...prev,
            ...payload.devices,
          }));
        }
      },
      (status) => setMqttStatus(status)
    );

    return () => disconnectMQTT();
  }, []);

  const toggleDevice = (key, value) => {
    setDevices((prev) => ({ ...prev, [key]: value }));
    publishControl(key, value);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>GLOVERA SmartFarm</h1>
          <p>Hydroponic Monitoring Dashboard</p>
        </div>
        <div className="top-status">
          <div className="badge online">● ONLINE</div>
          <div className="badge mqtt">📡 MQTT: {mqttStatus}</div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-tag">SMART FARM CONTROL</div>
          <h2>실시간 센서 모니터링 & 장치 제어</h2>
          <p>온습도 / 광량 / 함수율 / 수위 / EC / pH 기반 발표용 스마트팜 UI</p>
        </div>

        <div className="hero-right">
          <div className="clock-title">현재 시간</div>
          <div className="clock-time">{currentTime.toLocaleTimeString("ko-KR")}</div>
          <div className="clock-date">{currentTime.toLocaleDateString("ko-KR")}</div>
        </div>
      </section>

      <section className="section">
        <div className="section-title">환경 센서 상태</div>
        <div className="grid sensors">
          <Card title="기온" icon="🌡️" value={`${sensorData.airTemp} °C`} />
          <Card title="습도" icon="💧" value={`${sensorData.airHum} %`} />
          <Card title="광량" icon="☀️" value={`${sensorData.light} lux`} />
          <Card title="함수율" icon="🌱" value={`${sensorData.moisture} %`} />
          <Card title="수위" icon="🛢️" value={`${sensorData.tankLevel} %`} />
          <Card title="EC" icon="⚡" value={`${sensorData.ec} mS/cm`} />
          <Card title="pH" icon="⚗️" value={`${sensorData.ph}`} />
        </div>
      </section>

      <section className="section">
        <div className="section-title">장치 제어</div>
        <div className="grid controls">
          <ControlCard
            title="메인 펌프"
            icon="🚰"
            active={devices.mainPump}
            onOn={() => toggleDevice("mainPump", true)}
            onOff={() => toggleDevice("mainPump", false)}
          />
          <ControlCard
            title="양액 펌프"
            icon="🧪"
            active={devices.nutrientPump}
            onOn={() => toggleDevice("nutrientPump", true)}
            onOff={() => toggleDevice("nutrientPump", false)}
          />
          <ControlCard
            title="LED 조명"
            icon="💡"
            active={devices.led}
            onOn={() => toggleDevice("led", true)}
            onOff={() => toggleDevice("led", false)}
          />
          <ControlCard
            title="환기 팬"
            icon="🌀"
            active={devices.fan}
            onOn={() => toggleDevice("fan", true)}
            onOff={() => toggleDevice("fan", false)}
          />
        </div>
      </section>
    </div>
  );
}

function Card({ title, icon, value }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="icon">{icon}</div>
      </div>
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
  );
}

function ControlCard({ title, icon, active, onOn, onOff }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="icon">{icon}</div>
      </div>
      <h3>{title}</h3>
      <div className={active ? "device-on" : "device-off"}>
        {active ? "작동 중" : "정지"}
      </div>
      <div className="btns">
        <button className="on" onClick={onOn}>ON</button>
        <button className="off" onClick={onOff}>OFF</button>
      </div>
    </div>
  );
}