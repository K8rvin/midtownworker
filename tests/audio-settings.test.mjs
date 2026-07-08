const DEFAULT = { sfxVolume: 0.8, musicVolume: 0.5, muted: false };

function loadSettings(raw) {
  if (!raw) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

function saveSettings(settings) {
  return JSON.stringify(settings);
}

const loaded = loadSettings('{"sfxVolume":0.3,"muted":true}');
if (loaded.sfxVolume !== 0.3 || loaded.musicVolume !== 0.5 || loaded.muted !== true) {
  throw new Error(`Merge failed: ${JSON.stringify(loaded)}`);
}

const fallback = loadSettings('{invalid');
if (fallback.sfxVolume !== 0.8 || fallback.muted !== false) {
  throw new Error('Invalid JSON should fall back to defaults');
}

const roundTrip = JSON.parse(saveSettings({ sfxVolume: 0, musicVolume: 1, muted: true }));
if (roundTrip.sfxVolume !== 0 || roundTrip.musicVolume !== 1 || roundTrip.muted !== true) {
  throw new Error('Round-trip save failed');
}

console.log('Audio settings checks passed');