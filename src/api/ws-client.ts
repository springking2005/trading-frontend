export type WsMessage = {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<(msg: WsMessage) => void>>();
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private channel = '';
  private manualClose = false;

  connect(channel: string) {
    this.disconnect();
    this.manualClose = false;
    this.channel = channel;

    const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/${channel}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      const token = localStorage.getItem('token') || '';
      this.ws?.send(JSON.stringify({ type: 'auth', token }));
      this.ws?.send(JSON.stringify({ type: 'subscribe', channels: [channel] }));
      this.pingTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping', client_time: Date.now() }));
        }
      }, 30000);
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        if (!msg || typeof msg.type !== 'string') throw new Error('Malformed WS message');
        this.emit(msg.type, msg);
        if (msg.type !== channel) this.emit(channel, msg);
      } catch (error) {
        this.emit('error', {
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Malformed WS message' },
        });
      }
    };

    this.ws.onclose = () => {
      this.clearPingTimer();
      if (!this.manualClose) {
        this.reconnectTimer = window.setTimeout(() => this.connect(this.channel), 3000);
      }
    };

    this.ws.onerror = () => {
      this.emit('error', { type: 'error', data: { message: 'WebSocket connection error' } });
    };
  }

  on(channel: string, fn: (msg: WsMessage) => void) {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(fn);
    return () => this.listeners.get(channel)?.delete(fn);
  }

  disconnect() {
    this.manualClose = true;
    this.clearPingTimer();
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.ws;
    this.ws = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
  }

  private clearPingTimer() {
    if (this.pingTimer != null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private emit(channel: string, msg: WsMessage) {
    this.listeners.get(channel)?.forEach((fn) => fn(msg));
  }
}
