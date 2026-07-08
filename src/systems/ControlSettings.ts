export type MobileControlMode = 'auto' | 'on' | 'off';

export interface ControlKeyBindings {
  interact: string;
  sprint: string;
  questLog: string;
  map: string;
}

export interface ControlSettingsData {
  steerSensitivity: number;
  moveSensitivity: number;
  mobileControls: MobileControlMode;
  keys: ControlKeyBindings;
}

const SETTINGS_KEY = 'gta2_controls';

export const DEFAULT_CONTROL_SETTINGS: ControlSettingsData = {
  steerSensitivity: 1,
  moveSensitivity: 1,
  mobileControls: 'auto',
  keys: {
    interact: 'E',
    sprint: 'SHIFT',
    questLog: 'J',
    map: 'M',
  },
};

export class ControlSettings {
  static load(): ControlSettingsData {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_CONTROL_SETTINGS);
    try {
      const parsed = JSON.parse(raw) as Partial<ControlSettingsData>;
      return {
        ...DEFAULT_CONTROL_SETTINGS,
        ...parsed,
        keys: { ...DEFAULT_CONTROL_SETTINGS.keys, ...parsed.keys },
      };
    } catch {
      return structuredClone(DEFAULT_CONTROL_SETTINGS);
    }
  }

  static save(settings: ControlSettingsData): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  static shouldShowMobile(mode: MobileControlMode): boolean {
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 960)
    );
  }
}