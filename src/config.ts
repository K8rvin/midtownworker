/** Life simulator mode — no combat, gangs, or police. */
export const LIFE_SIM = true;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;
export const MAP_WIDTH = 200;
export const MAP_HEIGHT = 200;

export const COLORS = {
  asphalt: 0x1a1a2e,
  road: 0x2d2d44,
  roadLine: 0x4a4a6a,
  building: 0x3d3d5c,
  buildingRoof: 0x4e4e72,
  grass: 0x1e3a2f,
  sidewalk: 0x3a3a50,
  yakuza: 0xff2d55,
  rednecks: 0xff6b35,
  scientists: 0x00e676,
  police: 0xffd600,
  player: 0xc8f542,
  neutral: 0x6b7280,
  hudBg: 0x0d0d14,
  hudText: 0xc8f542,
  health: 0xff2d55,
  money: 0xffd600,
};

export const GANG_IDS = ['yakuza', 'rednecks', 'scientists'] as const;
export type GangId = (typeof GANG_IDS)[number];

export const GANG_COLORS: Record<GangId, number> = {
  yakuza: COLORS.yakuza,
  rednecks: COLORS.rednecks,
  scientists: COLORS.scientists,
};

export const GANG_NAMES: Record<GangId, string> = {
  yakuza: 'Якудза',
  rednecks: 'Реднеки',
  scientists: 'Учёные',
};

export interface QuestSnapshot {
  escortX?: number;
  escortY?: number;
  escortHp?: number;
  packagePositions?: { x: number; y: number }[];
  captureCaptured?: boolean[];
  blockpostsPassed?: string[];
  raceCheckpointIndex?: number;
  raceElapsed?: number;
}

export type HousingType = 'none' | 'rent' | 'owned';

export interface HousingState {
  type: HousingType;
  homeId: string | null;
  rentDueDay: number;
  lastRentPaidDay: number;
}

export interface JobState {
  id: string;
  name: string;
  salary: number;
  remote: boolean;
  remoteUnlocked: boolean;
  shiftStart: number;
  shiftEnd: number;
  employedDay: number;
  daysWorked: number;
  workedToday: boolean;
}

export interface CourierDeliveryState {
  orderId: string;
  pickupId: string;
  pickupName: string;
  pickupX: number;
  pickupY: number;
  dropoffHomeId: string;
  dropoffName: string;
  dropoffX: number;
  dropoffY: number;
  distanceTiles: number;
  hasPackage: boolean;
}

export interface LifeStats {
  tasksCompleted: number;
  shiftsWorked: number;
  remoteShifts: number;
  foodBought: number;
  rentPaid: number;
  contractKills: number;
  courierDeliveries: number;
}

export interface GameState {
  lives: number;
  money: number;
  health: number;
  maxHealth: number;
  wantedLevel: number;
  respect: Record<GangId, number>;
  currentWeapon: string;
  ammo: Record<string, number>;
  ownedWeapons: string[];
  completedQuests: string[];
  activeQuestId: string | null;
  questProgress: Record<string, number>;
  questSnapshot: QuestSnapshot | null;
  playerX: number;
  playerY: number;
  onRoof: boolean;
  inVehicle: boolean;
  vehicleType: string | null;
  stats: {
    kills: number;
    questsCompleted: number;
    arrests: number;
    vehiclesStolen: number;
  };
  chosenBranch: GangId | null;
  blockedQuests: string[];
  ownedVehicles: string[];
  usedWeapons: string[];
  ngPlusLevel: number;
  achievements: string[];
  currentMapId: string;
  coopPlayer2?: CoopPlayerData;
  /** Life sim (phase 15) */
  hunger: number;
  sleep: number;
  day: number;
  hour: number;
  housing: HousingState;
  job: JobState | null;
  homeFurniture: string[];
  furniturePlaced: Record<string, string>;
  inventory: { food: Record<string, number> };
  lifeStats: LifeStats;
  completedLifeTasks: string[];
  activeLifeTaskId: string | null;
  /** Life-sim tutorial chapter (0 = before intro, 1+ = story steps). */
  storyChapter: number;
  /** Active courier delivery (courier job only). */
  courierDelivery: CourierDeliveryState | null;
}

export interface CoopPlayerData {
  health: number;
  maxHealth: number;
  lives: number;
  playerX: number;
  playerY: number;
  onRoof: boolean;
}

export const DEFAULT_COOP_PLAYER2: CoopPlayerData = {
  health: 100,
  maxHealth: 100,
  lives: 3,
  playerX: 0,
  playerY: 0,
  onRoof: false,
};

export const DEFAULT_LIFE_STATS: LifeStats = {
  tasksCompleted: 0,
  shiftsWorked: 0,
  remoteShifts: 0,
  foodBought: 0,
  rentPaid: 0,
  contractKills: 0,
  courierDeliveries: 0,
};

export const DEFAULT_HOUSING: HousingState = {
  type: 'none',
  homeId: null,
  rentDueDay: 0,
  lastRentPaidDay: 0,
};

export const DEFAULT_GAME_STATE: GameState = {
  lives: 3,
  money: 300,
  health: 100,
  maxHealth: 100,
  wantedLevel: 0,
  respect: { yakuza: 0, rednecks: 0, scientists: 0 },
  currentWeapon: 'fists',
  ammo: {},
  ownedWeapons: ['fists'],
  completedQuests: [],
  activeQuestId: null,
  questProgress: {},
  questSnapshot: null,
  playerX: 100 * TILE_SIZE,
  playerY: 100 * TILE_SIZE,
  onRoof: false,
  inVehicle: false,
  vehicleType: null,
  stats: { kills: 0, questsCompleted: 0, arrests: 0, vehiclesStolen: 0 },
  chosenBranch: null,
  blockedQuests: [],
  ownedVehicles: [],
  usedWeapons: [],
  ngPlusLevel: 0,
  achievements: [],
  currentMapId: 'city',
  hunger: 85,
  sleep: 90,
  day: 1,
  hour: 8,
  housing: { ...DEFAULT_HOUSING },
  job: null,
  homeFurniture: [],
  furniturePlaced: {},
  inventory: { food: {} },
  lifeStats: { ...DEFAULT_LIFE_STATS },
  completedLifeTasks: [],
  activeLifeTaskId: null,
  storyChapter: 0,
  courierDelivery: null,
};