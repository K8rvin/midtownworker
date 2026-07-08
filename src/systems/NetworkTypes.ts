export interface NetworkPlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  mapId?: string;
}

export type ClientMessage =
  | { type: 'join'; room: string; name: string }
  | { type: 'state'; x: number; y: number; angle: number; health: number; mapId: string }
  | { type: 'chat'; text: string }
  | { type: 'start_game' };

export type ServerMessage =
  | { type: 'joined'; playerId: string; room: string; isHost: boolean; players: NetworkPlayerInfo[] }
  | { type: 'player_joined'; player: NetworkPlayerInfo }
  | { type: 'player_left'; playerId: string }
  | { type: 'state'; playerId: string; x: number; y: number; angle: number; health: number; mapId: string }
  | { type: 'chat'; playerId: string; name: string; text: string }
  | { type: 'start_game'; room: string }
  | { type: 'error'; message: string };

export interface NetworkSession {
  playerId: string;
  room: string;
  isHost: boolean;
  players: NetworkPlayerInfo[];
}