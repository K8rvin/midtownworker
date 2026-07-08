const WEAPON_SLOTS = ['fists', 'pistol', 'shotgun', 'uzi'];

function switchSlot(state, slot) {
  const idx = slot - 1;
  if (idx < 0 || idx >= WEAPON_SLOTS.length) return false;
  const weaponId = WEAPON_SLOTS[idx];
  if (!state.ownedWeapons.includes(weaponId)) return false;
  if (state.currentWeapon === weaponId) return false;
  state.currentWeapon = weaponId;
  return true;
}

const state = { currentWeapon: 'fists', ownedWeapons: ['fists', 'pistol'] };

if (switchSlot(state, 1)) throw new Error('Should not switch when already on fists');
if (!switchSlot(state, 2)) throw new Error('Should switch to pistol');
if (state.currentWeapon !== 'pistol') throw new Error('Expected pistol');
if (switchSlot(state, 3)) throw new Error('Shotgun not owned');
if (switchSlot(state, 0)) throw new Error('Invalid slot');

console.log('Weapon manager checks passed');