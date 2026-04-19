"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TelemetryRow = {
  id?: number;
  temperature?: number | null;
  humidity?: number | null;
  soil?: number | null;
  light?: number | null;
  motor_state?: string | null;
  created_at?: string | null;
};

const emptyLatest: TelemetryRow = {
  temperature: null,
  humidity: null,
  soil: null,
  light: null,
  motor_state: null,
  created_at: null,
};

function fmt(value: number | null | undefined, unit = "") {
  if (value === null || value === undefined) return "-";
  return `${value}${unit}`;
}

export default function Page() {
  const [latest, setLatest] = useState<TelemetryRow>(emptyLatest);
  const [rows, setRows] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    return [
      {
        label: "온도",
        value: fmt(latest.temperature, "°C"),
      },
      {
        label: "습도",
        value: fmt(latest.humidity, "%"),
      },
      {
        label: "토양수분",
        value: fmt(latest.soil),
      },
      {
        label: "조도",
        value: fmt(latest.light),
      },
      {
        label: "모터",
        value: latest.motor_state ?? "-",
      },
      {
        label: "시간",
        value: latest.created_at ? new Date(latest.created_at).toLocaleString() : "-",
      },
    ];
  }, [latest]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("telemetry")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as TelemetryRow[];
      setRows(list);
      setLatest(list[0] ?? emptyLatest);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("telemetry_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry" },
        (payload) => {
          const row = payload.new as TelemetryRow;
          setLatest(row);
          setRows((prev) => [row, ...prev].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "telemetry" },
        (payload) => {
          const row = payload.new as TelemetryRow;
          setLatest(row);
          setRows((prev) =>
            [row, ...prev.filter((item) => item.id !== row.id)].slice(0, 20)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Smart Farm Dashboard</h1>
            <p className="text-slate-400">Supabase realtime telemetry monitor</p>
          </div>
          <div className="rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-300">
            {loading ? "Loading..." : "Live"}
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-semibold">Latest Record</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Temperature</p>
                <p className="text-lg">{fmt(latest.temperature, "°C")}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Humidity</p>
                <p className="text-lg">{fmt(latest.humidity, "%")}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Soil</p>
                <p className="text-lg">{fmt(latest.soil)}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Light</p>
                <p className="text-lg">{fmt(latest.light)}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <p className="text-sm text-slate-400">Motor State</p>
                <p className="text-lg">{latest.motor_state ?? "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-xl font-semibold">Recent Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3 pr-4">Temp</th>
                    <th className="py-3 pr-4">Hum</th>
                    <th className="py-3 pr-4">Soil</th>
                    <th className="py-3 pr-4">Light</th>
                    <th className="py-3 pr-4">Motor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id ?? idx} className="border-b border-slate-800/60">
                      <td className="py-3 pr-4">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 pr-4">{fmt(row.temperature, "°C")}</td>
                      <td className="py-3 pr-4">{fmt(row.humidity, "%")}</td>
                      <td className="py-3 pr-4">{fmt(row.soil)}</td>
                      <td className="py-3 pr-4">{fmt(row.light)}</td>
                      <td className="py-3 pr-4">{row.motor_state ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
