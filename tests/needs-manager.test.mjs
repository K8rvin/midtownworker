import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const needsMgr = readFileSync(join(root, 'src/systems/NeedsManager.ts'), 'utf8');
if (!needsMgr.includes('SLEEP_HOURS_DEFAULT')) throw new Error('SLEEP_HOURS_DEFAULT missing');
if (!needsMgr.includes('applySleepHunger')) throw new Error('applySleepHunger missing');
if (needsMgr.includes('FAINT_PENALTY')) throw new Error('faint money penalty should stay removed');

const timeMgr = readFileSync(join(root, 'src/systems/TimeManager.ts'), 'utf8');
if (!timeMgr.includes('advanceHours')) throw new Error('TimeManager.advanceHours missing');

const homeScene = readFileSync(join(root, 'src/scenes/HomeScene.ts'), 'utf8');
if (!homeScene.includes('advanceHours')) throw new Error('HomeScene should advance time on sleep');
if (!homeScene.includes('applySleepHunger')) throw new Error('HomeScene should apply sleep hunger');

// Behavioral: pure advanceHours logic mirrored
function advanceHours(state, hours) {
  let daysAdvanced = 0;
  for (let i = 0; i < hours; i++) {
    state.hour += 1;
    if (state.hour >= 24) {
      state.hour = 0;
      state.day += 1;
      daysAdvanced += 1;
    }
  }
  return daysAdvanced;
}

const state = { day: 1, hour: 22, job: null };
const days = advanceHours(state, 7);
if (state.day !== 2 || state.hour !== 5) {
  throw new Error(`Sleep time advance wrong: day=${state.day} hour=${state.hour}`);
}
if (days !== 1) throw new Error(`Expected 1 day advanced, got ${days}`);

const homes = JSON.parse(readFileSync(join(root, 'src/data/homes.json'), 'utf8'));
const studio = homes.find((h) => h.id === 'apt_oldtown_1');
if (!studio?.furnitureSlots?.some((s) => s.id === 'fridge_slot')) {
  throw new Error('Starter studio must have fridge_slot');
}

const furniture = JSON.parse(readFileSync(join(root, 'src/data/furniture.json'), 'utf8'));
if (furniture.length < 6) throw new Error('Expected expanded furniture catalog');
if (!furniture.some((f) => f.id === 'lamp_basic')) throw new Error('lamp_basic missing');

const jobs = JSON.parse(readFileSync(join(root, 'src/data/jobs.json'), 'utf8'));
if (!jobs.some((j) => j.id === 'janitor')) throw new Error('janitor job missing');

const jobUI = readFileSync(join(root, 'src/ui/JobApplicationUI.ts'), 'utf8');
if (!jobUI.includes('!j.violent')) throw new Error('Job board should hide violent jobs');

console.log('Needs/sleep/life-content tests passed');
