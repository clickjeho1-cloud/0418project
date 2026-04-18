export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h2 style={{ marginTop: 0 }}>JKH 스마트팜</h2>
      <p style={{ color: "#6b7280" }}>대시보드는 아래 링크로 이동합니다.</p>
      <a
        href="/dashboard"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          textDecoration: "none",
          color: "#111827",
        }}
      >
        대시보드 열기
      </a>
    </div>
  );
}
