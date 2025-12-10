export type WSMessage = { action: string; payload?: any };

export class ChatSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: { [action: string]: (payload: any) => void } = {};

  constructor(roomId: string, host?: string) {
    const token = localStorage.getItem('token') || '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const base = host || window.location.host;
    this.url = `${protocol}://${base}/ws/chat/${roomId}/?token=${token}`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WS connected');
      // explicit join - consumer supports this
      this.send({ action: 'join', payload: { room_id: this.extractRoomId() } });
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const action = data.action;
        const payload = data.payload ?? data;
        if (this.handlers[action]) this.handlers[action](payload);
        else if (this.handlers['*']) this.handlers['*'](data);
        else console.debug('Unhandled WS message', data);
      } catch (err) {
        console.error('Invalid WS message', ev.data, err);
      }
    };

    this.ws.onclose = (ev) => {
      console.log('WS closed', ev.code, ev.reason);
    };

    this.ws.onerror = (err) => {
      console.error('WS error', err);
    };
  }

  send(msg: WSMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WS not open', msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  on(action: string, cb: (payload: any) => void) {
    this.handlers[action] = cb;
  }

  off(action: string) {
    delete this.handlers[action];
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  private extractRoomId() {
    const m = this.url.match(/\/ws\/chat\/([^\/?]+)/);
    return m ? m[1] : '';
  }
}
