import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.SSE_ORIGIN || true,
    credentials: false,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

export default app;