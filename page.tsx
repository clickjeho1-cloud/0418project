'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mqtt from 'mqtt'

interface SensorData {
  temp: number | null
  humi: number | null
  timestamp: string
}

export default function Page() {
  const [data, setData] = useState<SensorData>({
    temp: null,
    humi: null,
    timestamp: '',
  })
  const [status, setStatus] = useState('연결중...')

  const tempBuffer = useRef<number[]>([])
  const humiBuffer = useRef<number[]>([])
  const clientRef = useRef<mqtt.MqttClient | null>(null)

  const filterData = useCallback(
    (newTemp: string, newHumi: string) => {
      const tempNum = parseFloat(newTemp)
      const humiNum = parseFloat(newHumi)

      if (
        isNaN(tempNum) ||
        isNaN(humiNum) ||
        tempNum < -10 ||
        tempNum > 60 ||
        humiNum < 0 ||
        humiNum > 100
      ) {
        return false
      }

      tempBuffer.current.push(tempNum)
      humiBuffer.current.push(humiNum)
      if (tempBuffer.current.length > 10) tempBuffer.current.shift()
      if (humiBuffer.current.length > 10) humiBuffer.current.shift()

      const tempSlice = tempBuffer.current.slice(-5)
      const humiSlice = humiBuffer.current.slice(-5)

      const avgTemp =
        tempSlice.reduce((a, b) => a + b, 0) / Math.min(5, tempSlice.length)
      const avgHumi =
        humiSlice.reduce((a, b) => a + b, 0) / Math.min(5, humiSlice.length)

      const lastTemp = data.temp ?? avgTemp
      const lastHumi = data.humi ?? avgHumi

      if (Math.abs(avgTemp - lastTemp) > 5 || Math.abs(avgHumi - lastHumi) > 10) {
        return false
      }

      return {
        temp: Number(avgTemp.toFixed(1)),
        humi: Number(avgHumi.toFixed(1)),
      }
    },
    [data.temp, data.humi]
  )

  useEffect(() => {
    const mqttUrl = process.env.NEXT_PUBLIC_MQTT_URL
    const mqttUsername = process.env.NEXT_PUBLIC_MQTT_USERNAME
    const mqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD

    if (!mqttUrl) {
      setStatus('MQTT_URL 누락')
      return
    }

    const client = mqtt.connect(mqttUrl, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `vercel_dashboard_${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 5000,
    })

    clientRef.current = client

    client.on('connect', () => {
      setStatus('연결됨 ✅')
      client.subscribe('temp1', { qos: 1 })
      client.subscribe('humi1', { qos: 1 })
    })

    client.on('message', (topic, message) => {
      const value = message.toString()

      if (topic === 'temp1') {
        const filtered = filterData(value, String(data.humi ?? 0))
        if (filtered) {
          setData(prev => ({
            ...prev,
            temp: filtered.temp,
            timestamp: new Date().toLocaleString('ko-KR'),
          }))
        }
      }

      if (topic === 'humi1') {
        const filtered = filterData(String(data.temp ?? 0), value)
        if (filtered) {
          setData(prev => ({
            ...prev,
            humi: filtered.humi,
            timestamp: new Date().toLocaleString('ko-KR'),
          }))
        }
      }
    })

    client.on('error', (err) => {
      setStatus('연결 오류: ' + err.message)
    })

    return () => {
      client.end(true)
      clientRef.current = null
    }
  }, [filterData, data.temp, data.humi])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-12 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-center text-4xl font-bold text-transparent">
          🌱 스마트팜 대시보드
        </h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl">
            <div className="text-center">
              <div className="mb-4 text-5xl">🌡️</div>
              <div className="mb-2 text-4xl font-black text-blue-600">
                {data.temp ?? '--.--'}
              </div>
              <div className="text-lg font-medium text-gray-600">온도 (°C)</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl">
            <div className="text-center">
              <div className="mb-4 text-5xl">💧</div>
              <div className="mb-2 text-4xl font-black text-green-600">
                {data.humi ?? '--.--'}
              </div>
              <div className="text-lg font-medium text-gray-600">습도 (%)</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
            <div className="text-center">
              <div className="mb-4 text-2xl font-bold">{status}</div>
              <div className="text-sm text-gray-500">
                마지막 업데이트
                <br />
                {data.timestamp || '-'}
              </div>
              <div className="mt-4 rounded-xl bg-gray-100 p-3 text-xs">
                HiveMQ Cloud
                <br />
                temp1 / humi1
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-xl bg-white/60 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-bold">📊 최근 데이터 로그</h3>
          <pre className="max-h-40 overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
            {data.timestamp &&
              `✅ 안정화: T${data.temp}°C H${data.humi}% (${data.timestamp})`}
          </pre>
        </div>
      </div>
    </div>
  )
}