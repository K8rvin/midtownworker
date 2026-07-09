import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(root, 'docs', 'ROADMAP.md'))) {
  throw new Error('docs/ROADMAP.md missing');
}

const roadmap = readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8');
if (!roadmap.includes('Фаза 9')) throw new Error('Phase 9 not in roadmap');

for (const file of [
  'src/graphics/VfxManager.ts',
  'src/graphics/AtmosphereOverlay.ts',
  'src/graphics/TireMarkManager.ts',
  'src/ui/MenuTheme.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const spriteGen = readFileSync(join(root, 'src', 'graphics', 'SpriteGenerator.ts'), 'utf8');
if (!spriteGen.includes('addSpriteSheet')) throw new Error('Player spritesheet missing');
if (!spriteGen.includes('drawPlayerFaceUpWalk')) throw new Error('Face-up walk poses missing');
if (!spriteGen.includes('drawNpcWalkFrame') && !spriteGen.includes('genNpcWalkSheet')) {
  throw new Error('NPC walk sprites missing');
}

const player = readFileSync(join(root, 'src', 'entities', 'Player.ts'), 'utf8');
if (!player.includes('resolveWalkFrame')) throw new Error('Face-up frame resolve missing');
if (!player.includes('LEGACY_UP_ROW')) throw new Error('Legacy up row constant missing');
if (!player.includes('sheetLayout')) throw new Error('Spritesheet layout detection missing');
if (!player.includes('faceUpWalk')) throw new Error('Face-up walk sheet detection missing');
if (!player.includes('WALK_ROW_H_LEFT')) throw new Error('Horizontal left walk row missing');
if (!player.includes('WALK_ROW_H_RIGHT')) throw new Error('Horizontal right walk row missing');
if (!player.includes('WALK_FRAMES = 6')) throw new Error('Expected 6 walk frames');
if (!spriteGen.includes('walkCycle')) throw new Error('Walk cycle helper missing');
if (!spriteGen.includes('armVerticalPose')) throw new Error('Vertical arm pose missing');
if (!spriteGen.includes('armHorizontalPose')) throw new Error('Horizontal arm pose missing');
if (!spriteGen.includes('drawArmSegment')) throw new Error('Arm segment draw missing');
if (!spriteGen.includes('v_up')) throw new Error('Vertical up walk axis missing');
if (!spriteGen.includes('v_down')) throw new Error('Vertical down walk axis missing');
if (!spriteGen.includes('drawDirectionalHead')) throw new Error('Directional head draw missing');
if (!player.includes('WALK_ROW_V_UP')) throw new Error('Vertical up walk row missing');
if (!player.includes('WALK_ROW_V_DOWN')) throw new Error('Vertical down walk row missing');
if (player.includes('setAngle(this.facingAngle)')) throw new Error('Player should not rotate sprite');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('TireMarkManager')) throw new Error('Tire marks not integrated');

const minimap = readFileSync(join(root, 'src', 'ui', 'Minimap.ts'), 'utf8');
if (!minimap.includes('getDistrictTheme')) throw new Error('Minimap district themes missing');

console.log('Phase 9 graphics checks passed');