import { z } from "zod";

export const TelemetrySchema = z.object({
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  ec: z.number().optional(),
  ph: z.number().optional(),
  timestamp: z.number(),
  device_id: z.string(),
});

export const SensorSchema = z.object({
  sensor: z.enum(["temperature", "humidity", "ec", "ph"]),
  value: z.number(),
  unit: z.string(),
  timestamp: z.number(),
  device_id: z.string(),
});

export const ActuatorCommandSchema = z.object({
  state: z.boolean(),
  brightness: z.number().int().min(0).max(100).optional(),
  timestamp: z.number(),
});

export const ActuatorStateSchema = z.object({
  actuator: z.enum(["led", "pump", "fan1", "fan2"]),
  state: z.boolean(),
  brightness: z.number().int().min(0).max(100).optional(),
  timestamp: z.number(),
  device_id: z.string(),
});

export const StatusSchema = z.object({
  status: z.enum(["online", "offline"]),
  device_id: z.string(),
  uptime: z.number().int().nonnegative().optional(),
  timestamp: z.number(),
});

export const EventSchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  message: z.string(),
  sensor: z.string().optional(),
  timestamp: z.number(),
  device_id: z.string(),
});

