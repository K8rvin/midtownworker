import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const quests = JSON.parse(readFileSync(join(root, 'src/data/quests.json'), 'utf8'));

if (quests.length < 32) {
  throw new Error(`Expected 32+ quests, got ${quests.length}`);
}

const raceQuests = quests.filter((q) => q.type === 'race');
if (raceQuests.length < 7) {
  throw new Error(`Expected 7+ race quests, got ${raceQuests.length}`);
}
const withCheckpoints = raceQuests.filter((q) => Array.isArray(q.checkpoints) && q.checkpoints.length >= 3);
if (withCheckpoints.length < 4) {
  throw new Error(`Expected 4+ checkpoint races, got ${withCheckpoints.length}`);
}

for (const q of quests) {
  if (!q.giverId) throw new Error(`Quest ${q.id} missing giverId`);
  if (!Array.isArray(q.dialogStart) || q.dialogStart.length < 2) {
    throw new Error(`Quest ${q.id} needs multi-line dialogStart`);
  }
  if (!Array.isArray(q.dialogEnd) || q.dialogEnd.length < 1) {
    throw new Error(`Quest ${q.id} needs dialogEnd lines`);
  }
}

const givers = JSON.parse(readFileSync(join(root, 'src/data/quest-givers.json'), 'utf8'));
if (givers.length < 4) throw new Error(`Expected 4+ quest givers, got ${givers.length}`);

const types = new Set(quests.map((q) => q.type));
const required = ['delivery', 'kill', 'collect', 'escape', 'territory', 'escort', 'steal', 'gang_kill', 'survive', 'destroy', 'race', 'bribe', 'nocops', 'blockpost'];
for (const t of required) {
  if (!types.has(t)) throw new Error(`Missing quest type: ${t}`);
}

console.log('Quest count checks passed:', quests.length, 'types:', [...types].join(', '));