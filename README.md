# jkh-backend

## 실행(로컬)
### 1) DB 실행(PostgreSQL)
`jkh-infra/docker-compose.yml` 기준.

PowerShell:
```powershell
cd C:\Users\ds20\Documents\pythonpractice\0409project\jhk\jkh-smartfarm\jkh-infra
docker compose up -d
```

### 2) 환경변수 설정
`.env.example`을 복사해서 `.env`를 만들고 값을 채운다.

### 3) 설치/마이그레이션/실행
```powershell
cd C:\Users\ds20\Documents\pythonpractice\0409project\jhk\jkh-smartfarm\jkh-backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## 엔드포인트(최소)
- `GET /api/stream` : SSE(실시간)
- `GET /api/devices/:deviceId/latest` : 최신 센서(간단)
- `POST /api/devices/:deviceId/actuators/:actuator/cmd` : 제어 명령 발행(QoS1, retain=false)

