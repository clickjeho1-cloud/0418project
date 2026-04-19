import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(20);

  if (error) return <pre>{error.message}</pre>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Smart Farm Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}