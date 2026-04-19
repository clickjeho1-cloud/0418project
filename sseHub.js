export function createSseHub() {
  /** @type {Set<import("express").Response>} */
  const clients = new Set();

  function addClient(res) {
    clients.add(res);
    res.on("close", () => clients.delete(res));
  }

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch {
        // 연결이 끊긴 클라이언트는 close 이벤트로 정리된다.
      }
    }
  }

  return { addClient, broadcast };
}

