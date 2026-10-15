import { useEffect, useRef } from "react";

export interface PriceTick {
  event: "PRICE_TICK";
  market_id: string;
  slug: string;
  yes_prob: number;
  no_prob: number;
  volume_kp: number;
  last_trade_side: "YES" | "NO";
  timestamp: string;
}

export function useMarketWebSocket(onTick?: (tick: PriceTick) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws/markets";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Connected
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "PRICE_TICK" && onTickRef.current) {
            onTickRef.current(data);
          }
        } catch {
          // Ignore non-json or ping-pong
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    // Heartbeat ping every 25 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return wsRef;
}
