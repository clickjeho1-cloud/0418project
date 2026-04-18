"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Telemetry = {
  temperature?: number;
  humidity?: number;
  ec?: number;
  ph?: number;
  timestamp: number;
  device_id: string;
};

type AlertMsg = {
  device_id: string;
  type: string;
  breaches: Array<{ key: string; value: number; bound: "min" | "max"; limit: number }>;
  timestamp: number;
};

type Actuator = "led" | "pump" | "fan1" | "fan2";

function getEnv(name: string, fallback: string) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export default function DashboardPage() {
  const backendUrl = useMemo(
    () => getEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:4000"),
    [],
  );
  const deviceId = useMemo(() => getEnv("NEXT_PUBLIC_DEVICE_ID", "arduino_uno_r4_001"), []);

  const [connected, setConnected] = useState(false);
  const [latest, setLatest] = useState<Telemetry | null>(null);
  const [series, setSeries] = useState<Telemetry[]>([]);
  const [alert, setAlert] = useState<AlertMsg | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${backendUrl}/api/stream`);
    esRef.current = es;

    es.addEventListener("hello", () => setConnected(true));
    es.addEventListener("telemetry", (e) => {
      try {
        const t = JSON.parse((e as MessageEvent).data) as Telemetry;
        if (t.device_id !== deviceId) return;
        setLatest(t);
        setSeries((prev) => {
          const next = [...prev, t];
          return next.slice(-120); // 최근 120포인트만 유지(예: 3초 주기면 약 6분)
        });
      } catch {}
    });
    es.addEventListener("alert", (e) => {
      try {
        const a = JSON.parse((e as MessageEvent).data) as AlertMsg;
        if (a.device_id !== deviceId) return;
        setAlert(a);
      } catch {}
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [backendUrl, deviceId]);

  const labels = useMemo(() => series.map((t) => new Date(t.timestamp).toLocaleTimeString()), [series]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "온도(°C)",
          data: series.map((t) => t.temperature ?? null),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          spanGaps: true,
        },
        {
          label: "습도(%)",
          data: series.map((t) => t.humidity ?? null),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          spanGaps: true,
        },
        {
          label: "EC",
          data: series.map((t) => t.ec ?? null),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          spanGaps: true,
        },
        {
          label: "pH",
          data: series.map((t) => t.ph ?? null),
          borderColor: "rgb(168, 85, 247)",
          backgroundColor: "rgba(168, 85, 247, 0.2)",
          spanGaps: true,
        },
      ],
    }),
    [labels, series],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false as const,
      plugins: {
        legend: { position: "top" as const },
        title: { display: false },
      },
      scales: {
        y: { ticks: { maxTicksLimit: 6 } },
        x: { ticks: { maxTicksLimit: 8 } },
      },
    }),
    [],
  );

  async function sendCmd(actuator: Actuator, cmd: { state: boolean; brightness?: number }) {
    const payload = {
      ...cmd,
      timestamp: Date.now(),
    };
    await fetch(`${backendUrl}/api/devices/${deviceId}/actuators/${actuator}/cmd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>JKH 스마트팜 대시보드</h2>
        <div style={{ fontSize: 13, color: connected ? "#16a34a" : "#dc2626" }}>
          {connected ? "SSE 연결됨" : "연결 끊김"}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>device_id: {deviceId}</div>
      </div>

      {alert && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setAlert(null)}
        >
          <div
            style={{ background: "white", borderRadius: 12, width: "min(560px, 100%)", padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#b45309" }}>경고: 임계값 이탈</h3>
              <button
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                onClick={() => setAlert(null)}
              >
                닫기
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, color: "#374151" }}>
              <div style={{ marginBottom: 8 }}>
                발생 시각: {new Date(alert.timestamp).toLocaleString()}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {alert.breaches.map((b, idx) => (
                  <li key={idx}>
                    {b.key}: {b.value} (기준 {b.bound}={b.limit})
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
              * 임계값은 백엔드 DB의 threshold_rules 기반입니다.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <Card title="온도" value={latest?.temperature} unit="°C" />
        <Card title="습도" value={latest?.humidity} unit="%" />
        <Card title="EC" value={latest?.ec} unit="" />
        <Card title="pH" value={latest?.ph} unit="" />
      </div>

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ height: 320 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <ActuatorCard
          title="LED"
          onOn={() => sendCmd("led", { state: true, brightness: 80 })}
          onOff={() => sendCmd("led", { state: false })}
        />
        <ActuatorCard title="펌프" onOn={() => sendCmd("pump", { state: true })} onOff={() => sendCmd("pump", { state: false })} />
        <ActuatorCard title="팬1" onOn={() => sendCmd("fan1", { state: true })} onOff={() => sendCmd("fan1", { state: false })} />
        <ActuatorCard title="팬2" onOn={() => sendCmd("fan2", { state: true })} onOff={() => sendCmd("fan2", { state: false })} />
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        경고창은 백엔드가 임계값(threshold_rules) 이탈을 감지해 SSE의 <code>alert</code> 이벤트로 전송하면 뜹니다.
      </div>
    </div>
  );
}

function Card({ title, value, unit }: { title: string; value: number | undefined; unit: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>
        {typeof value === "number" ? value.toFixed(1) : "-"}{" "}
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>{unit}</span>
      </div>
    </div>
  );
}

function ActuatorCard({
  title,
  onOn,
  onOff,
}: {
  title: string;
  onOn: () => void;
  onOff: () => void;
}) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{title}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          style={{
            flex: 1,
            border: "1px solid #16a34a",
            background: "#16a34a",
            color: "white",
            borderRadius: 10,
            padding: "8px 10px",
            cursor: "pointer",
          }}
          onClick={onOn}
        >
          ON
        </button>
        <button
          style={{
            flex: 1,
            border: "1px solid #dc2626",
            background: "#dc2626",
            color: "white",
            borderRadius: 10,
            padding: "8px 10px",
            cursor: "pointer",
          }}
          onClick={onOff}
        >
          OFF
        </button>
      </div>
    </div>
  );
}

