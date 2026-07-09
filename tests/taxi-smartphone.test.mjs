import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const jobs = JSON.parse(readFileSync(join(root, 'src/data/jobs.json'), 'utf8'));
if (!jobs.some((j) => j.id === 'taxi' && j.jobType === 'taxi')) {
  throw new Error('Taxi job missing');
}

const needs = readFileSync(join(root, 'src/systems/NeedsManager.ts'), 'utf8');
if (!needs.includes('HUNGER_DECAY_PER_HOUR = 2')) throw new Error('Hunger decay should be ~2');
if (!needs.includes('SLEEP_DECAY_PER_HOUR = 1.6')) throw new Error('Sleep decay should be ~1.6');

const lids = readFileSync(join(root, 'src/ui/NeedsEffectsOverlay.ts'), 'utf8');
if (!lids.includes('doublePhase') && !lids.includes('secondBlink')) {
  throw new Error('Double eyelid blink missing');
}

const housing = readFileSync(join(root, 'src/systems/HousingManager.ts'), 'utf8');
if (!housing.includes('rentWarningMessage')) throw new Error('Rent warning missing');
if (!housing.includes('daysUntilRent')) throw new Error('daysUntilRent missing');

const jobMgr = readFileSync(join(root, 'src/systems/JobManager.ts'), 'utf8');
if (!jobMgr.includes('shiftOpen')) throw new Error('shiftOpen missing');
if (!jobMgr.includes('closeShift')) throw new Error('closeShift missing');
if (!jobMgr.includes('isTaxiJob')) throw new Error('isTaxiJob missing');

const courier = readFileSync(join(root, 'src/systems/CourierManager.ts'), 'utf8');
if (!courier.includes('shiftOpen')) throw new Error('Courier should require shiftOpen');

const taxi = readFileSync(join(root, 'src/systems/TaxiManager.ts'), 'utf8');
if (!taxi.includes('washCar')) throw new Error('Taxi wash missing');
if (!taxi.includes('takeFare')) throw new Error('Taxi takeFare missing');
if (!taxi.includes('rating')) throw new Error('Taxi rating missing');

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes('nav') || !phone.includes('food') || !phone.includes('work')) {
  throw new Error('Smartphone tabs incomplete');
}

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('openSmartphone')) throw new Error('openSmartphone missing');
if (!game.includes("justPressed('P')")) throw new Error('P key for phone missing');
if (!game.includes('job_end_shift')) throw new Error('end shift interact missing');
if (!game.includes('taxi_take_fare')) throw new Error('taxi interact missing');

const config = readFileSync(join(root, 'src/config.ts'), 'utf8');
if (!config.includes('TaxiFareState')) throw new Error('TaxiFareState missing');
if (!config.includes('navTarget')) throw new Error('navTarget missing');
if (!config.includes('shiftOpen')) throw new Error('JobState.shiftOpen missing');

const hud = readFileSync(join(root, 'src/ui/HUD.ts'), 'utf8');
if (!hud.includes('Аренда через') && !hud.includes('Аренда: сегодня')) {
  throw new Error('HUD rent countdown missing');
}

console.log('Taxi / smartphone checks passed');
