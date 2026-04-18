// jhk-backend (Node.js)
mqttClient.on("message", async (topic, message) => {
  const json = JSON.parse(message.toString());

  await supabase
    .from("telemetry")
    .insert({
      device_id: json.device_id,
      temperature: json.temperature,
      humidity: json.humidity,
      timestamp: new Date(),
    });
});