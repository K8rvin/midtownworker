import weaponsData from './data/weapons.json';
import vehiclesData from './data/vehicles.json';

const weapons = weaponsData as { id: string; name: string }[];
const vehicles = vehiclesData as { id: string; name: string }[];

const WEAPON_NAMES: Record<string, string> = Object.fromEntries(
  weapons.map((w) => [w.id, w.name])
);

const VEHICLE_NAMES: Record<string, string> = Object.fromEntries(
  vehicles.map((v) => [v.id, v.name])
);

export function weaponName(id: string): string {
  return WEAPON_NAMES[id] ?? id;
}

export function vehicleName(id: string): string {
  return VEHICLE_NAMES[id] ?? id;
}

export function wantedText(level: number): string {
  if (level <= 0) return 'Розыск: нет';
  return `Розыск: ${'★'.repeat(level)}`;
}

export function questProgressText(type: string, progress: number, total?: number): string {
  switch (type) {
    case 'collect':
      return `Собрано: ${progress}/${total ?? 5}`;
    case 'territory':
      return `Точки: ${progress}/${total ?? 3}`;
    case 'escape':
      return `Побег: ${progress} сек`;
    case 'gang_kill':
      return `Убито: ${progress}/${total ?? 3}`;
    case 'survive':
      return `В зоне: ${progress}/${total ?? 20} сек`;
    case 'destroy':
      return `Уничтожено: ${progress}/${total ?? 2}`;
    case 'race': {
      const limit = total ?? 50;
      return `Время: ${progress}/${limit} сек`;
    }
    case 'blockpost':
      return `Блокпосты: ${progress}/${total ?? 2}`;
    case 'nocops':
      return progress > 0 ? 'Розыск! Квест провален' : 'Без розыска — идите к цели';
    default:
      return `Прогресс: ${progress}`;
  }
}