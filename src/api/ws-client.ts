export type WsMessage = { type: string; data: Record<string, unknown> };

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(msg: WsMessage) => void>> = new Map();
  private pingTimer: number | null = null;

  connect(channel: string, symbols?: string[]) {
    this.disconnect();
    const t = localStorage.getItem('token');
    let url = `ws://${location.host}/api/v1/ws/${channel}?token=${t || ''}`;
    if (symbols?.length) url += `&symbols=${symbols.join(',')}`;

    this.ws = new WebSocket(url);
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        this.listeners.get(channel)?.forEach(fn => fn(msg));
      } catch {}
    };
    this.ws.onclose = () => { setTimeout(() => this.connect(channel, symbols), 3000); };
    this.pingTimer = window.setInterval(() => this.ws?.send(JSON.stringify({ action: 'ping' })), 30000);
  }

  on(channel: string, fn: (msg: WsMessage) => void) {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(fn);
  }

  disconnect() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WsClient();
