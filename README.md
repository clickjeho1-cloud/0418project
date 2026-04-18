# jkh-smartfarm (Arduino UNO R4 + HiveMQ + Web Dashboard)

## 1) 목표
- **센서**: 온도, 습도, EC, pH
- **액츄에이터**: 식물성장 LED, 양액 펌프, 팬 2개
- **보드**: Arduino UNO R4
- **통신**: MQTT (HiveMQ 브로커는 이미 설정 완료)
- **웹**: 프론트/백엔드 분리, 실시간 대시보드(경계값 이탈 시 경고), 데이터 저장(시계열), 제어 이력/설정/알림

## 2) 권장 아키텍처(프론트/백/DB/MQTT)
- **Device(Arduino)** → MQTT Publish(센서/상태/에러)
- **Backend(Node.js/Express)**:
  - MQTT Subscribe(센서/상태/에러) → DB 저장(시계열/이력)
  - REST API 제공(히스토리/설정/알림/제어)
  - 제어 요청 수신 → MQTT Publish(QoS1, retain 미사용) → Device 응답 수신 → DB 저장
  - 실시간 스트림(SSE)로 프론트에 최신값/경고 전송
- **DB(PostgreSQL)**:
  - 센서 시계열 저장
  - 제어 이력 저장
  - 임계값/스케줄/자동제어 설정 저장
  - 알림 이벤트 저장
- **Frontend(Next.js, Vercel 배포)**:
  - 실시간 센서값/상태 표시(SSE)
  - 그래프/차트(온도/습도/EC/pH)
  - 액츄에이터 제어 UI(LED/펌프/팬1/팬2)
  - 임계값 이탈 시 경고 모달/배너

> 주의: Vercel 환경에서 “프론트가 MQTT(wss)로 직접 브로커 연결”도 가능하지만, 본 프로젝트는 **백엔드가 MQTT를 전담**하고 프론트는 HTTP/SSE로 받는 구조를 기본으로 잡습니다(권한/비밀키 관리와 안정성 측면에서 유리).

## 3) MQTT 토픽 구조(정의)
토픽은 **프로젝트 접두어 `jkh/`**를 사용합니다.

### 3.1 디바이스 식별
- `device_id`: 예) `arduino_uno_r4_001`

### 3.2 센서(통합) Publish
- **Topic**: `jkh/sf/{device_id}/telemetry`
- **QoS**: 0(일반) 또는 1(중요)
- **Retain**: `false` (실시간 데이터 성격)
- **Payload(JSON)**: 5.2 형식

### 3.3 센서(개별) Publish(선택)
- **Topic**: `jkh/sf/{device_id}/sensor/{sensor}`
  - `{sensor}` ∈ `temperature | humidity | ec | ph`
- **QoS**: 0 또는 1
- **Retain**: `false`
- **Payload(JSON)**: 5.1 형식

### 3.4 액츄에이터 제어 명령(백엔드→디바이스)
- **Topic**: `jkh/sf/{device_id}/cmd/{actuator}`
  - `{actuator}` ∈ `led | pump | fan1 | fan2`
- **QoS**: 1
- **Retain**: `false` (일회성 명령)
- **Payload(JSON)**: 5.3 형식

### 3.5 액츄에이터 상태 응답(디바이스→백엔드)
- **Topic**: `jkh/sf/{device_id}/state/{actuator}`
- **QoS**: 1
- **Retain**: `true` (최신 상태를 항상 유지)
- **Payload(JSON)**: 5.4 형식

### 3.6 시스템 상태(LWT 포함)
- **Online/Heartbeat Topic**: `jkh/sf/{device_id}/status`
- **QoS**: 1
- **Retain**: `true`
- **Payload(JSON)**: 5.5 형식
- **LWT**: `status=offline` retain=true 권장

### 3.7 에러/경고
- **Topic**: `jkh/sf/{device_id}/event`
- **QoS**: 1
- **Retain**: `false` (이벤트는 이력으로 남기고, retain은 최신 이벤트가 오해를 만들 수 있음)
- **Payload(JSON)**: 5.6 형식

## 4) MQTT 권한(ACL) 설계(권장)
브로커 설정은 이미 되어 있으므로, 아래 방향으로 **토픽 접근 권한을 분리**하는 것을 권장합니다.
- **device 계정**:
  - Publish: `jkh/sf/{device_id}/telemetry`, `.../sensor/+`, `.../state/+`, `.../status`, `.../event`
  - Subscribe: `jkh/sf/{device_id}/cmd/+`
- **backend 계정**:
  - Subscribe: `jkh/sf/+/telemetry`, `jkh/sf/+/sensor/+`, `jkh/sf/+/state/+`, `jkh/sf/+/status`, `jkh/sf/+/event`
  - Publish: `jkh/sf/+/cmd/+`
- **frontend 계정(가능하면 미사용)**:
  - MQTT 직접 연결을 하지 않는 구조이므로 불필요

## 5) 데이터 형식(JSON) (요구사항 반영)
### 5.1 센서 데이터(개별)
```json
{
  "sensor": "temperature",
  "value": 25.5,
  "unit": "°C",
  "timestamp": 1704067200000,
  "device_id": "arduino_uno_r4_001"
}
```

### 5.2 통합 센서 데이터
```json
{
  "temperature": 25.5,
  "humidity": 60.0,
  "ec": 2.5,
  "ph": 6.5,
  "timestamp": 1704067200000,
  "device_id": "arduino_uno_r4_001"
}
```

### 5.3 액츄에이터 제어
```json
{
  "state": true,
  "brightness": 80,
  "timestamp": 1704067200000
}
```

### 5.4 액츄에이터 상태 응답
```json
{
  "actuator": "led",
  "state": true,
  "brightness": 80,
  "timestamp": 1704067200000,
  "device_id": "arduino_uno_r4_001"
}
```

### 5.5 시스템 상태
```json
{
  "status": "online",
  "device_id": "arduino_uno_r4_001",
  "uptime": 3600,
  "timestamp": 1704067200000
}
```

### 5.6 에러/경고
```json
{
  "level": "error",
  "message": "Sensor read failed",
  "sensor": "temperature",
  "timestamp": 1704067200000,
  "device_id": "arduino_uno_r4_001"
}
```

## 6) QoS/Retain 규칙(요구사항 반영)
- **센서 데이터**: QoS0(일반), QoS1(중요). Retain=false
- **액츄에이터 제어**: QoS1. Retain=false
- **상태 메시지**: QoS1. Retain=true
- **에러/경고 이벤트**: QoS1. Retain=false(권장)

## 7) DB 스키마 설계(요약)
PostgreSQL 기준(시계열은 `sensor_readings`에 누적).
- **devices**: 디바이스 메타
- **sensor_readings**: 온도/습도/EC/pH 시계열
- **actuator_commands**: 제어 명령 이력(요청/발행)
- **actuator_states**: 디바이스가 보고한 상태 스냅샷/이력
- **threshold_rules**: 임계값(경계값) 규칙(대시보드 경고/자동제어)
- **schedules**: 스케줄(예: 야간 팬 가동)
- **alerts**: 이상 상황 알림 이력(이메일/푸시 확장)

## 8) 레포 구조(프론트/백 분리, jkh 네이밍)
```
jkh-smartfarm/
  jkh-backend/     # Node.js/Express + MQTT + DB + SSE
  jkh-frontend/    # Next.js 대시보드(Vercel)
  jkh-shared/      # 공통 타입/토픽 상수/검증 스키마
  jkh-infra/       # docker-compose, DB 초기화, 운영 스크립트
```

