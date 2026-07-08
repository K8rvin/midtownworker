import type { ClientMessage, NetworkPlayerInfo, NetworkSession, ServerMessage } from './NetworkTypes';

type MessageHandler = (msg: ServerMessage) => void;

let active: NetworkManager | null = null;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  session: NetworkSession | null = null;

  static getActive(): NetworkManager | null {
    return active;
  }

  static connect(url: string, room: string, name: string): Promise<NetworkManager> {
    return new Promise((resolve, reject) => {
      if (active) active.disconnect();

      const mgr = new NetworkManager();
      active = mgr;
      let settled = false;

      const ws = new WebSocket(url);
      mgr.ws = ws;

      ws.onopen = () => {
        mgr.send({ type: 'join', room, name });
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage;

          if (msg.type === 'error' && !settled) {
            settled = true;
            reject(new Error(msg.message));
            mgr.disconnect();
            return;
          }

          if (msg.type === 'joined') {
            mgr.session = {
              playerId: msg.playerId,
              room: msg.room,
              isHost: msg.isHost,
              players: msg.players,
            };
            if (!settled) {
              settled = true;
              resolve(mgr);
            }
          }

          if (msg.type === 'player_joined' && mgr.session) {
            if (!mgr.session.players.some((p) => p.id === msg.player.id)) {
              mgr.session.players.push(msg.player);
            }
          }

          if (msg.type === 'player_left' && mgr.session) {
            mgr.session.players = mgr.session.players.filter((p) => p.id !== msg.playerId);
          }

          for (const h of [...mgr.handlers]) h(msg);
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('Ошибка подключения к серверу'));
        }
      };

      ws.onclose = () => {
        if (active === mgr) active = null;
      };
    });
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.add(handler);
  }

  offMessage(handler: MessageHandler): void {
    this.handlers.delete(handler);
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendState(x: number, y: number, angle: number, health: number, mapId: string): void {
    this.send({ type: 'state', x, y, angle, health, mapId });
  }

  startGame(): void {
    this.send({ type: 'start_game' });
  }

  getPlayers(): NetworkPlayerInfo[] {
    return this.session?.players ?? [];
  }

  disconnect(): void {
    this.handlers.clear();
    this.ws?.close();
    this.ws = null;
    this.session = null;
    if (active === this) active = null;
  }
}