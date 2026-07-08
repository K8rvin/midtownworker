import Phaser from 'phaser';
import { TILE_SIZE, GangId } from '../config';
import { generateMapData, gidToTileType, zoneGidToGang } from './MapDataGenerator';
import { parseTiledObjects } from './TiledObjectParser';
import { NavigationGrid } from './NavigationGrid';
import { DEFAULT_MAP_ID, getMapConfig } from './MapRegistry';
import type { BlockpostConfig, MapTransitionConfig, NpcSpawnConfig } from './MapTypes';
import { NPC_SPAWNS } from './SpawnPoints';
import shopsData from '../data/shops.json';
import questGiversData from '../data/quest-givers.json';
import { buildRoofZones, findRoofZoneAt, isTileInZone, type RoofZone } from './RoofZone';
import {
  buildDistrictGrid,
  getDistrictAt,
  getDistrictTheme,
  type DistrictTheme,
} from './DistrictGrid';

export enum TileType {
  Grass = 0,
  Road = 1,
  Sidewalk = 2,
  Building = 3,
  Roof = 4,
  Stairs = 5,
}

export interface MapObject {
  type: 'payphone' | 'shop' | 'flag' | 'stairs' | 'package' | 'landmark' | 'tree' | 'district_marker';
  x: number;
  y: number;
  data?: Record<string, unknown>;
}

export class CityMap {
  public mapId: string;
  public mapWidth: number;
  public mapHeight: number;
  public tiles: TileType[][] = [];
  public gangZones: (GangId | null)[][] = [];
  public objects: MapObject[] = [];
  public npcSpawns: NpcSpawnConfig[] = [];
  public blockposts: BlockpostConfig[] = [];
  public transitions: MapTransitionConfig[] = [];
  public worldWidth: number;
  public worldHeight: number;
  public navigation!: NavigationGrid;
  public roofZones: RoofZone[] = [];
  public districtGrid: (string | null)[][] = [];

  private scene: Phaser.Scene;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Container;
  private roofLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Container;
  private collisionGroup!: Phaser.Physics.Arcade.StaticGroup;
  private roofCollisionGroup!: Phaser.Physics.Arcade.StaticGroup;
  private roofZoneGroups = new Map<string, Phaser.Physics.Arcade.StaticGroup>();
  private shopPassableTiles = new Set<string>();
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;

  constructor(scene: Phaser.Scene, mapId = DEFAULT_MAP_ID) {
    this.scene = scene;
    this.mapId = mapId;
    const cfg = getMapConfig(mapId);
    this.mapWidth = cfg.width;
    this.mapHeight = cfg.height;
    this.worldWidth = this.mapWidth * TILE_SIZE;
    this.worldHeight = this.mapHeight * TILE_SIZE;
  }

  generate(): void {
    const cfg = getMapConfig(this.mapId);
    if (this.scene.cache.tilemap.exists(cfg.cacheKey)) {
      this.loadFromTilemap(cfg.cacheKey);
    } else {
      const data = generateMapData();
      this.applyMapData(data.tiles, data.gangZones, data.objects);
      this.applyEntitiesFallback();
      this.renderProcedural();
    }
    this.districtGrid = buildDistrictGrid(this.mapWidth, this.mapHeight);
    this.navigation = new NavigationGrid(this.tiles);
    this.buildInteriorPassableTiles();
    this.roofZones = buildRoofZones(
      this.tiles,
      this.mapWidth,
      this.mapHeight,
      this.getStairsLocations()
    );
    this.buildCollisions();
    this.buildRoofZoneCollisions();
  }

  destroy(): void {
    this.groundLayer?.destroy(true);
    this.roofLayer?.destroy(true);
    this.collisionGroup?.clear(true, true);
    this.roofCollisionGroup?.clear(true, true);
    for (const group of this.roofZoneGroups.values()) group.clear(true, true);
    this.roofZoneGroups.clear();
    this.tilemap?.destroy();
  }

  getRoofLayer(): Phaser.GameObjects.Container | Phaser.Tilemaps.TilemapLayer {
    return this.roofLayer;
  }

  getStairsLocations(): { x: number; y: number }[] {
    return this.objects.filter((o) => o.type === 'stairs').map((o) => ({ x: o.x, y: o.y }));
  }

  getCollisionGroup(onRoof: boolean, roofZoneId: string | null = null): Phaser.Physics.Arcade.StaticGroup {
    if (!onRoof) return this.collisionGroup;
    if (roofZoneId && this.roofZoneGroups.has(roofZoneId)) {
      return this.roofZoneGroups.get(roofZoneId)!;
    }
    return this.roofCollisionGroup;
  }

  getRoofZone(id: string): RoofZone | undefined {
    return this.roofZones.find((z) => z.id === id);
  }

  getRoofZoneAtWorld(wx: number, wy: number): RoofZone | null {
    const { tx, ty } = this.worldToTile(wx, wy);
    return findRoofZoneAt(this.roofZones, tx, ty, 0);
  }

  getStairsZoneAtWorld(wx: number, wy: number, radius = 1): RoofZone | null {
    const { tx, ty } = this.worldToTile(wx, wy);
    return findRoofZoneAt(this.roofZones, tx, ty, radius);
  }

  isValidRoofPosition(wx: number, wy: number, roofZoneId: string | null): boolean {
    if (!roofZoneId) return false;
    const zone = this.getRoofZone(roofZoneId);
    if (!zone) return false;
    const { tx, ty } = this.worldToTile(wx, wy);
    return isTileInZone(zone, tx, ty);
  }

  isShopPassable(tx: number, ty: number): boolean {
    return this.shopPassableTiles.has(`${tx},${ty}`);
  }

  getLayers(): {
    ground: Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Container;
    roof: Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Container;
  } {
    return { ground: this.groundLayer, roof: this.roofLayer };
  }

  isRoad(tx: number, ty: number): boolean {
    return this.navigation?.isRoad(tx, ty) ?? false;
  }

  worldToTile(wx: number, wy: number): { tx: number; ty: number } {
    return { tx: Math.floor(wx / TILE_SIZE), ty: Math.floor(wy / TILE_SIZE) };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
  }

  getGangAt(wx: number, wy: number): GangId | null {
    const { tx, ty } = this.worldToTile(wx, wy);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return null;
    return this.gangZones[ty][tx];
  }

  private loadFromTilemap(cacheKey: string): void {
    try {
      this.tilemap = this.scene.make.tilemap({ key: cacheKey });
      const tileset = this.tilemap.addTilesetImage('city_tileset', 'city_tileset', TILE_SIZE, TILE_SIZE, 0, 0);
      if (!tileset) throw new Error('tileset missing');

      const ground = this.tilemap.createLayer('ground', tileset, 0, 0);
      const roof = this.tilemap.createLayer('roof', tileset, 0, 0);
      if (!ground || !roof) throw new Error('layers missing');

      ground.setDepth(0);
      roof.setDepth(10);
      this.groundLayer = ground;
      this.roofLayer = roof;

      this.parseTilemapLayers();
      this.applyDistrictTints(ground);
    } catch {
      this.tilemap = null;
      const data = generateMapData();
      this.applyMapData(data.tiles, data.gangZones, data.objects);
      this.applyEntitiesFallback();
      this.renderProcedural();
    }
  }

  private parseTilemapLayers(): void {
    if (!this.tilemap) return;

    const objectLayer = this.tilemap.getObjectLayer('objects');
    if (objectLayer?.objects?.length) {
      const parsed = parseTiledObjects(
        objectLayer.objects as Parameters<typeof parseTiledObjects>[0]
      );
      this.objects = parsed.objects;
      this.npcSpawns = parsed.npcSpawns;
      this.blockposts = parsed.blockposts;
      this.transitions = parsed.transitions;
    } else {
      const data = generateMapData();
      this.objects = data.objects;
      this.applyEntitiesFallback();
    }

    if (this.npcSpawns.length === 0) this.applyNpcFallback();
    if (this.blockposts.length === 0) this.applyBlockpostFallback();

    const groundLayer = this.tilemap.layers.find((l) => l.name === 'ground');
    const zoneLayer = this.tilemap.layers.find((l) => l.name === 'zones');

    for (let y = 0; y < this.mapHeight; y++) {
      this.tiles[y] = [];
      this.gangZones[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        const groundGid = groundLayer?.data?.[y]?.[x]?.index ?? 0;
        this.tiles[y][x] = gidToTileType(groundGid) ?? TileType.Grass;

        const zoneGid = zoneLayer?.data?.[y]?.[x]?.index ?? 0;
        this.gangZones[y][x] = zoneGidToGang(zoneGid);
      }
    }
  }

  private applyEntitiesFallback(): void {
    this.applyNpcFallback();
    this.applyBlockpostFallback();
  }

  private applyNpcFallback(): void {
    if (this.mapId !== 'city') return;
    this.npcSpawns = NPC_SPAWNS.map((s) => ({
      x: Math.floor(s.x / TILE_SIZE),
      y: Math.floor(s.y / TILE_SIZE),
      gang: s.gang,
      count: s.count,
    }));
  }

  private applyBlockpostFallback(): void {
    if (this.mapId !== 'city') return;
    this.blockposts = [
      { id: 'bp_nw', tx: 50, ty: 100 },
      { id: 'bp_ne', tx: 150, ty: 100 },
      { id: 'bp_sw', tx: 100, ty: 50 },
      { id: 'bp_se', tx: 100, ty: 150 },
    ];
  }

  private tileDistrictTint(tile: TileType, theme: DistrictTheme): number | null {
    switch (tile) {
      case TileType.Grass:
        return theme.grass;
      case TileType.Sidewalk:
        return theme.sidewalk;
      case TileType.Building:
        return theme.building;
      case TileType.Roof:
        return theme.roof;
      default:
        return null;
    }
  }

  private applyDistrictTints(ground: Phaser.Tilemaps.TilemapLayer): void {
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        if (tile === TileType.Road || tile === TileType.Stairs) continue;
        const districtId = getDistrictAt(this.districtGrid, x, y);
        const theme = getDistrictTheme(districtId);
        const tint = this.tileDistrictTint(tile, theme);
        if (tint === null) continue;
        const t = ground.getTileAt(x, y);
        if (!t) continue;
        t.tint = tint;
        t.alpha = tile === TileType.Grass ? 0.92 : 1;
      }
    }
  }

  private applyMapData(
    tiles: TileType[][],
    gangZones: (GangId | null)[][],
    objects: MapObject[]
  ): void {
    this.tiles = tiles;
    this.gangZones = gangZones;
    this.objects = objects;
  }

  private renderProcedural(): void {
    const containerGround = this.scene.add.container(0, 0);
    const containerRoof = this.scene.add.container(0, 0);
    containerRoof.setDepth(10);
    this.groundLayer = containerGround;
    this.roofLayer = containerRoof;

    const textureMap: Record<TileType, string> = {
      [TileType.Grass]: 'tile_grass',
      [TileType.Road]: 'tile_road',
      [TileType.Sidewalk]: 'tile_sidewalk',
      [TileType.Building]: 'tile_building',
      [TileType.Roof]: 'tile_roof',
      [TileType.Stairs]: 'tile_stairs',
    };

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        const sprite = this.scene.add.image(px, py, textureMap[tile]);
        if (tile === TileType.Roof) {
          containerRoof.add(sprite);
        } else {
          containerGround.add(sprite);
        }
        if (tile !== TileType.Road && tile !== TileType.Stairs) {
          const districtId = getDistrictAt(this.districtGrid, x, y);
          const theme = getDistrictTheme(districtId);
          const tint = this.tileDistrictTint(tile, theme);
          if (tint !== null) {
            sprite.setTint(tint);
            if (tile === TileType.Grass) sprite.setAlpha(0.92);
          }
        }
      }
    }
  }

  private buildInteriorPassableTiles(): void {
    this.shopPassableTiles.clear();
    const addInterior = (layout: {
      doorX: number;
      doorY: number;
      interiorX: number;
      interiorY: number;
      interiorW: number;
      interiorH: number;
    }) => {
      this.shopPassableTiles.add(`${layout.doorX},${layout.doorY}`);
      for (let y = layout.interiorY; y < layout.interiorY + layout.interiorH; y++) {
        for (let x = layout.interiorX; x < layout.interiorX + layout.interiorW; x++) {
          this.shopPassableTiles.add(`${x},${y}`);
        }
      }
    };

    for (const shop of shopsData as {
      doorX: number;
      doorY: number;
      interiorX: number;
      interiorY: number;
      interiorW: number;
      interiorH: number;
    }[]) {
      addInterior(shop);
    }

    for (const giver of questGiversData as {
      interior?: {
        doorX: number;
        doorY: number;
        interiorX: number;
        interiorY: number;
        interiorW: number;
        interiorH: number;
      };
    }[]) {
      if (giver.interior) addInterior(giver.interior);
    }
  }

  private buildCollisions(): void {
    this.collisionGroup = this.scene.physics.add.staticGroup();
    this.roofCollisionGroup = this.scene.physics.add.staticGroup();

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        if (tile === TileType.Building && !this.isShopPassable(x, y)) {
          const wall = this.collisionGroup.create(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'tile_building'
          ) as Phaser.Physics.Arcade.Sprite;
          wall.setVisible(false);
          wall.refreshBody();
        }
      }
    }
  }

  private buildRoofZoneCollisions(): void {
    for (const group of this.roofZoneGroups.values()) group.clear(true, true);
    this.roofZoneGroups.clear();

    for (const zone of this.roofZones) {
      const group = this.scene.physics.add.staticGroup();
      for (const k of zone.walkTiles) {
        const [tx, ty] = k.split(',').map(Number);
        if (this.tiles[ty]?.[tx] !== TileType.Roof) continue;
        const roof = group.create(
          tx * TILE_SIZE + TILE_SIZE / 2,
          ty * TILE_SIZE + TILE_SIZE / 2,
          'tile_roof'
        ) as Phaser.Physics.Arcade.Sprite;
        roof.setVisible(false);
        roof.refreshBody();
      }
      this.roofZoneGroups.set(zone.id, group);
    }
  }
}