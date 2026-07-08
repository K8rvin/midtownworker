export type PngAssetType = 'image' | 'spritesheet';

export interface PngAssetEntry {
  key: string;
  path: string;
  type: PngAssetType;
  frameWidth?: number;
  frameHeight?: number;
  category: string;
}

/** PNG paths under public/assets — optional replacements for procedural textures. */
export const PNG_ASSETS: PngAssetEntry[] = [
  { key: 'tile_grass', path: './assets/tiles/tile_grass.png', type: 'image', category: 'tiles' },
  { key: 'tile_road', path: './assets/tiles/tile_road.png', type: 'image', category: 'tiles' },
  { key: 'tile_sidewalk', path: './assets/tiles/tile_sidewalk.png', type: 'image', category: 'tiles' },
  { key: 'tile_building', path: './assets/tiles/tile_building.png', type: 'image', category: 'tiles' },
  { key: 'tile_roof', path: './assets/tiles/tile_roof.png', type: 'image', category: 'tiles' },
  { key: 'tile_stairs', path: './assets/tiles/tile_stairs.png', type: 'image', category: 'tiles' },
  {
    key: 'city_tileset',
    path: './assets/tilesets/city_tileset.png',
    type: 'image',
    category: 'tilesets',
  },
  {
    key: 'player',
    path: './assets/sprites/player.png',
    type: 'spritesheet',
    frameWidth: 28,
    frameHeight: 28,
    category: 'sprites',
  },
  {
    key: 'player2',
    path: './assets/sprites/player2.png',
    type: 'spritesheet',
    frameWidth: 28,
    frameHeight: 28,
    category: 'sprites',
  },
  { key: 'npc_civilian', path: './assets/npcs/npc_civilian.png', type: 'image', category: 'npcs' },
  { key: 'npc_yakuza', path: './assets/npcs/npc_yakuza.png', type: 'image', category: 'npcs' },
  { key: 'npc_rednecks', path: './assets/npcs/npc_rednecks.png', type: 'image', category: 'npcs' },
  { key: 'npc_scientists', path: './assets/npcs/npc_scientists.png', type: 'image', category: 'npcs' },
  { key: 'npc_police', path: './assets/npcs/npc_police.png', type: 'image', category: 'npcs' },
  { key: 'npc_target', path: './assets/npcs/npc_target.png', type: 'image', category: 'npcs' },
  { key: 'vehicle_sedan', path: './assets/vehicles/vehicle_sedan.png', type: 'image', category: 'vehicles' },
  { key: 'vehicle_sports', path: './assets/vehicles/vehicle_sports.png', type: 'image', category: 'vehicles' },
  { key: 'vehicle_truck', path: './assets/vehicles/vehicle_truck.png', type: 'image', category: 'vehicles' },
  { key: 'vehicle_police', path: './assets/vehicles/vehicle_police.png', type: 'image', category: 'vehicles' },
  { key: 'payphone', path: './assets/objects/payphone.png', type: 'image', category: 'objects' },
  { key: 'package', path: './assets/objects/package.png', type: 'image', category: 'objects' },
  { key: 'flag', path: './assets/objects/flag.png', type: 'image', category: 'objects' },
  { key: 'blockpost', path: './assets/objects/blockpost.png', type: 'image', category: 'objects' },
  { key: 'shop_weapon', path: './assets/objects/shop_weapon.png', type: 'image', category: 'objects' },
  { key: 'shop_vehicle', path: './assets/objects/shop_vehicle.png', type: 'image', category: 'objects' },
  { key: 'shop_hospital', path: './assets/objects/shop_hospital.png', type: 'image', category: 'objects' },
  { key: 'bullet', path: './assets/objects/bullet.png', type: 'image', category: 'objects' },
];

export function manifestPathForKey(key: string): string | undefined {
  return PNG_ASSETS.find((a) => a.key === key)?.path;
}