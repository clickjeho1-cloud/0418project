<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
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

>>>>>>> 11668c0fbc212c43a4fda083a78570f510dbafe8
