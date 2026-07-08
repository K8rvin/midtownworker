const META_KEY = 'gta2_meta';

export interface MetaProgressData {
  hasBeatenGame: boolean;
  ngPlusLevel: number;
}

const DEFAULT_META: MetaProgressData = {
  hasBeatenGame: false,
  ngPlusLevel: 0,
};

export class MetaProgress {
  static load(): MetaProgressData {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META };
    try {
      return { ...DEFAULT_META, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_META };
    }
  }

  static save(data: MetaProgressData): void {
    localStorage.setItem(META_KEY, JSON.stringify(data));
  }

  static onVictory(): MetaProgressData {
    const meta = this.load();
    meta.hasBeatenGame = true;
    meta.ngPlusLevel += 1;
    this.save(meta);
    return meta;
  }
}