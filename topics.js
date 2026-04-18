// 토픽 규격은 README.md와 동일한 단일 소스가 되도록 유지한다.

export const JKH_TOPIC_PREFIX = "jkh/sf";

export function telemetryTopic(deviceId) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/telemetry`;
}

export function sensorTopic(deviceId, sensor) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/sensor/${sensor}`;
}

export function commandTopic(deviceId, actuator) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/cmd/${actuator}`;
}

export function stateTopic(deviceId, actuator) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/state/${actuator}`;
}

export function statusTopic(deviceId) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/status`;
}

export function eventTopic(deviceId) {
  return `${JKH_TOPIC_PREFIX}/${deviceId}/event`;
}

