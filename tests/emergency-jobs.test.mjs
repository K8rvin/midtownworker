import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const jobs = JSON.parse(readFileSync(join(root, 'src/data/jobs.json'), 'utf8'));
const police = jobs.find((j) => j.id === 'police');
const fire = jobs.find((j) => j.id === 'firefighter');
if (!police || police.jobType !== 'police') throw new Error('Police job missing');
if (!fire || fire.jobType !== 'firefighter') throw new Error('Firefighter job missing');
if (!police.doorX || !fire.doorX) throw new Error('Stations need door coords');

const em = readFileSync(join(root, 'src/systems/EmergencyManager.ts'), 'utf8');
if (!em.includes('takeCall')) throw new Error('takeCall missing');
if (!em.includes('resolveCall')) throw new Error('resolveCall missing');
if (!em.includes('getStationTile')) throw new Error('getStationTile missing');
if (!em.includes("service === 'police'")) throw new Error('Police service branch missing');

const jobMgr = readFileSync(join(root, 'src/systems/JobManager.ts'), 'utf8');
if (!jobMgr.includes('isPoliceJob')) throw new Error('isPoliceJob missing');
if (!jobMgr.includes('isFirefighterJob')) throw new Error('isFirefighterJob missing');
if (!jobMgr.includes('isEmergencyJob')) throw new Error('isEmergencyJob missing');

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('handleEmergencyTakeCall')) throw new Error('Emergency take not wired');
if (!game.includes('handleEmergencyResolve')) throw new Error('Emergency resolve not wired');
if (!game.includes('emergency_take_call')) throw new Error('Interact kind missing');
if (!game.includes('setUiScale')) throw new Error('UI zoom compensation missing');

const hud = readFileSync(join(root, 'src/ui/HUD.ts'), 'utf8');
if (!hud.includes('setUiScale')) throw new Error('HUD setUiScale missing');
if (!hud.includes('policeCalls')) throw new Error('HUD police status missing');

const config = readFileSync(join(root, 'src/config.ts'), 'utf8');
if (!config.includes('EmergencyCallState')) throw new Error('EmergencyCallState missing');
if (!config.includes('emergencyCall')) throw new Error('GameState.emergencyCall missing');
if (!config.includes('policeCalls')) throw new Error('lifeStats.policeCalls missing');
if (!config.includes('fireCalls')) throw new Error('lifeStats.fireCalls missing');

const mapGen = readFileSync(join(root, 'src/world/MapDataGenerator.ts'), 'utf8');
if (!mapGen.includes('placeJobBuildings')) throw new Error('placeJobBuildings missing');

const vehicles = JSON.parse(readFileSync(join(root, 'src/data/vehicles.json'), 'utf8'));
if (!vehicles.some((v) => v.id === 'firetruck')) throw new Error('Firetruck vehicle missing');
if (!vehicles.some((v) => v.id === 'police')) throw new Error('Police vehicle missing');

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes('onTakeEmergencyCall')) throw new Error('Phone emergency callback missing');
if (!phone.includes('EmergencyManager')) throw new Error('Phone emergency manager missing');

console.log('Emergency jobs / HUD zoom checks passed');
