export type InteractKind =
  | 'quest_giver'
  | 'shop_clerk'
  | 'shop_door_enter'
  | 'shop_door_exit'
  | 'interior_door_enter'
  | 'interior_door_exit'
  | 'payphone'
  | 'vehicle_exit'
  | 'garage_vehicle'
  | 'traffic_vehicle'
  | 'stairs'
  | 'transition'
  | 'job_hr'
  | 'job_shift'
  | 'courier_take_order'
  | 'courier_pickup'
  | 'courier_deliver'
  | 'job_end_shift'
  | 'job_start_shift'
  | 'taxi_take_fare'
  | 'taxi_pickup'
  | 'taxi_dropoff'
  | 'car_wash'
  | 'emergency_take_call'
  | 'emergency_resolve'
  | 'home_enter'
  | 'home_rent'
  | 'task_board'
  | 'employment_enter'
  | 'employment_exit'
  | 'employment_clerk';

export interface InteractCandidate {
  kind: InteractKind;
  distance: number;
  label: string;
  priority: number;
  payload?: unknown;
}

const PRIORITY: Record<InteractKind, number> = {
  stairs: 100,
  traffic_vehicle: 90,
  garage_vehicle: 88,
  vehicle_exit: 85,
  shop_clerk: 80,
  courier_deliver: 79,
  courier_pickup: 79,
  taxi_dropoff: 79,
  taxi_pickup: 79,
  courier_take_order: 78,
  taxi_take_fare: 78,
  emergency_take_call: 78,
  emergency_resolve: 79,
  job_start_shift: 77,
  job_end_shift: 77,
  car_wash: 76,
  job_shift: 75,
  job_hr: 74,
  home_enter: 74,
  home_rent: 72,
  task_board: 55,
  employment_clerk: 82,
  employment_exit: 71,
  employment_enter: 68,
  quest_giver: 75,
  shop_door_exit: 70,
  interior_door_exit: 70,
  shop_door_enter: 65,
  interior_door_enter: 65,
  transition: 60,
  payphone: 50,
};

export function makeCandidate(
  kind: InteractKind,
  distance: number,
  label: string,
  payload?: unknown
): InteractCandidate {
  return { kind, distance, label, priority: PRIORITY[kind], payload };
}

export function pickBest(candidates: InteractCandidate[]): InteractCandidate | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) > 8) return distDiff;
    return b.priority - a.priority;
  });
  return sorted[0];
}

export function hintFromCandidate(candidate: InteractCandidate | null): string {
  return candidate ? `[E] ${candidate.label}` : '';
}