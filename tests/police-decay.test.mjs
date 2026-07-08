function simulateDecay({ wantedLevel, crimeCooldown, wantedDecayTimer, dt, nearCop }) {
  if (wantedLevel <= 0) return { wantedLevel: 0, crimeCooldown: 0, wantedDecayTimer: 0 };

  let cooldown = crimeCooldown;
  let timer = wantedDecayTimer;

  if (cooldown > 0) {
    cooldown -= dt;
    return { wantedLevel, crimeCooldown: cooldown, wantedDecayTimer: timer };
  }

  if (nearCop) {
    timer = Math.max(0, timer - dt * 0.5);
    return { wantedLevel, crimeCooldown: cooldown, wantedDecayTimer: timer };
  }

  timer += dt;
  const interval = 14 + wantedLevel * 5;
  if (timer >= interval) {
    return {
      wantedLevel: wantedLevel - 1,
      crimeCooldown: cooldown,
      wantedDecayTimer: 0,
    };
  }
  return { wantedLevel, crimeCooldown: cooldown, wantedDecayTimer: timer };
}

let state = { wantedLevel: 3, crimeCooldown: 0, wantedDecayTimer: 0 };
for (let i = 0; i < 100; i++) {
  state = simulateDecay({ ...state, dt: 1, nearCop: false });
}
if (state.wantedLevel >= 3) throw new Error('Wanted should decay without cops nearby');

state = { wantedLevel: 2, crimeCooldown: 5, wantedDecayTimer: 0 };
state = simulateDecay({ ...state, dt: 2, nearCop: false });
if (state.crimeCooldown !== 3) throw new Error('Crime cooldown should block decay');

console.log('Police decay checks passed');