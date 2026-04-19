import { z } from "zod";

export const TelemetrySchema = z.object({
  device_id: z.string(),
  timestamp: z.string(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  ec: z.number().optional(),
  ph: z.number().optional(),
});

export const ActuatorStateSchema = z.object({
  device_id: z.string(),
  actuator: z.string(),
  timestamp: z.string(),
  state: z.string(),
  brightness: z.number().optional(),
});

export const StatusSchema = z.object({
  device_id: z.string(),
  timestamp: z.string(),
  status: z.string(),
});

export const EventSchema = z.object({
  device_id: z.string(),
  timestamp: z.string(),
  level: z.string(),
  message: z.string(),
  sensor: z.string().optional(),
});

export const ActuatorCommandSchema = z.object({
  timestamp: z.string(),
  state: z.string(),
  brightness: z.number().optional(),
});