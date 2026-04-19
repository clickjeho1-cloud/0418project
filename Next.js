// 프론트 (Next.js / 브라우저)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

supabase
  .channel("telemetry_channel")
  .on("INSERT", (payload) => {
    console.log(payload.new);
  })
  .on("UPDATE", (payload) => {
    console.log(payload.new);
  })
  .subscribe();