import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { NPC } from '../entities/NPC';
import type { NavigationGrid } from './NavigationGrid';
export function steerNPCAlongPath(
  npc: NPC,
  dt: number,
  targetPos: { x: number; y: number },
  speed: number,
  navigation: NavigationGrid | undefined,
  onChase: (npc: NPC, dt: number, targetPos: { x: number; y: number }, chase: boolean) => void
): void {
  if (!navigation) {
    onChase(npc, dt, targetPos, true);
    return;
  }

  npc.pathFollower.tickRetarget(dt);
  if (npc.pathFollower.getRetargetTimer() <= 0 || !npc.pathFollower.hasPath()) {
    const start = navigation.worldToTile(npc.sprite.x, npc.sprite.y, TILE_SIZE);
    const end = navigation.worldToTile(targetPos.x, targetPos.y, TILE_SIZE);
    npc.pathFollower.setPath(navigation.findPath(start, end, false));
    npc.pathFollower.setRetargetTimer(0.5);
  }

  const dir = npc.pathFollower.getSteerDirection(npc.sprite.x, npc.sprite.y, TILE_SIZE);
  if (dir) {
    npc.sprite.setVelocity(dir.x * speed, dir.y * speed);
  } else {
    onChase(npc, dt, targetPos, true);
  }
}