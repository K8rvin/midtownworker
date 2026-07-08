/**
 * Lightweight WebSocket lobby + state relay for GTA2 online co-op.
 * Run: npm run server  (default ws://localhost:8787)
 */
import { WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';

const PORT = Number(process.env.WS_PORT ?? 8787);
const MAX_PLAYERS = 4;

/** @type {Map<string, Map<string, { id: string, name: string, ws: import('ws').WebSocket, isHost: boolean, x: number, y: number, angle: number, health: number, mapId: string }>>} */
const rooms = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(roomId, msg, exceptId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [id, player] of room) {
    if (id === exceptId) continue;
    send(player.ws, msg);
  }
}

function roomList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.values()].map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    mapId: p.mapId,
  }));
}

function leaveRoom(playerId, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(playerId);
  if (room.size === 0) rooms.delete(roomId);
  else broadcast(roomId, { type: 'player_left', playerId });
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  let playerId = null;
  let roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    if (msg.type === 'join') {
      const code = String(msg.room ?? 'lobby').slice(0, 16).toUpperCase() || 'LOBBY';
      const name = String(msg.name ?? 'Игрок').slice(0, 16) || 'Игрок';

      if (!rooms.has(code)) rooms.set(code, new Map());
      const room = rooms.get(code);

      if (room.size >= MAX_PLAYERS) {
        send(ws, { type: 'error', message: 'Комната заполнена' });
        return;
      }

      playerId = randomBytes(4).toString('hex');
      roomId = code;
      const isHost = room.size === 0;

      room.set(playerId, {
        id: playerId,
        name,
        ws,
        isHost,
        x: 0,
        y: 0,
        angle: 0,
        health: 100,
        mapId: 'city',
      });

      send(ws, {
        type: 'joined',
        playerId,
        room: roomId,
        isHost,
        players: roomList(roomId),
      });

      broadcast(roomId, { type: 'player_joined', player: { id: playerId, name, isHost } }, playerId);
      return;
    }

    if (!playerId || !roomId) {
      send(ws, { type: 'error', message: 'Сначала join' });
      return;
    }

    const room = rooms.get(roomId);
    const self = room?.get(playerId);
    if (!self) return;

    if (msg.type === 'state') {
      self.x = Number(msg.x) || 0;
      self.y = Number(msg.y) || 0;
      self.angle = Number(msg.angle) || 0;
      self.health = Number(msg.health) || 0;
      self.mapId = String(msg.mapId ?? 'city');
      broadcast(roomId, {
        type: 'state',
        playerId,
        x: self.x,
        y: self.y,
        angle: self.angle,
        health: self.health,
        mapId: self.mapId,
      }, playerId);
      return;
    }

    if (msg.type === 'chat') {
      broadcast(roomId, {
        type: 'chat',
        playerId,
        name: self.name,
        text: String(msg.text ?? '').slice(0, 120),
      });
      return;
    }

    if (msg.type === 'start_game') {
      if (!self.isHost) {
        send(ws, { type: 'error', message: 'Только хост может начать' });
        return;
      }
      broadcast(roomId, { type: 'start_game', room: roomId });
      return;
    }
  });

  ws.on('close', () => {
    if (playerId && roomId) leaveRoom(playerId, roomId);
  });
});

console.log(`GTA2 WebSocket server on ws://localhost:${PORT}`);