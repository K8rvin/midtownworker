import Phaser from 'phaser';
import {
  DEFAULT_GAME_STATE,
  DEFAULT_COOP_PLAYER2,
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  GANG_COLORS,
  LIFE_SIM,
  type GameState,
  type GangId,
} from '../config';
import { CityMap } from '../world/CityMap';
import { DEFAULT_MAP_ID, getMapConfig, spawnToWorld } from '../world/MapRegistry';
import type { MapTransitionConfig } from '../world/MapTypes';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Vehicle } from '../entities/Vehicle';
import { InputManager } from '../systems/InputManager';
import { GangManager } from '../systems/GangManager';
import { CombatManager } from '../systems/CombatManager';
import { PoliceManager } from '../systems/PoliceManager';
import { TrafficManager } from '../systems/TrafficManager';
import { TrafficLightManager } from '../systems/TrafficLightManager';
import { RoadLayer } from '../world/RoadLayer';
import { LaneNavigation } from '../world/LaneNavigation';
import { PedestrianManager } from '../systems/PedestrianManager';
import {
  makeCandidate,
  pickBest,
  hintFromCandidate,
  type InteractCandidate,
  type InteractKind,
} from '../systems/InteractResolver';
import type { QuestGiverConfig } from '../systems/QuestManager';
import { clampToZone } from '../world/RoofZone';
import { ShopManager, type ShopConfig } from '../systems/ShopManager';
import { QuestManager } from '../systems/QuestManager';
import { SaveManager } from '../systems/SaveManager';
import { HUD } from '../ui/HUD';
import { Minimap } from '../ui/Minimap';
import { WaypointArrow } from '../ui/WaypointArrow';
import { NeedsEffectsOverlay } from '../ui/NeedsEffectsOverlay';
import { QuestLog } from '../ui/QuestLog';
import { ShopUI } from '../ui/ShopUI';
import { DialogBox } from '../ui/DialogBox';
import shopsData from '../data/shops.json';
import { getAudio } from '../systems/AudioManager';
import { WeaponManager } from '../systems/WeaponManager';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { BlockpostManager } from '../systems/BlockpostManager';
import { steerNPCAlongPath } from '../world/NPCSteering';
import { FullMapOverlay } from '../ui/FullMapOverlay';
import { VfxManager } from '../graphics/VfxManager';
import { AtmosphereOverlay } from '../graphics/AtmosphereOverlay';
import { TireMarkManager } from '../graphics/TireMarkManager';
import { ControlSettings } from '../systems/ControlSettings';
import { RunStats } from '../systems/RunStats';
import { ContextTip } from '../ui/ContextTip';
import { MobileControls } from '../ui/MobileControls';
import { GarageManager } from '../systems/GarageManager';
import { MetaProgress } from '../systems/MetaProgress';
import { AchievementManager } from '../systems/AchievementManager';
import { DynamicEventManager } from '../systems/DynamicEventManager';
import {
  TimeOfDayManager,
  getPedestrianCountForHour,
  getTrafficCountForHour,
} from '../systems/TimeOfDayManager';
import { DailyQuestManager } from '../systems/DailyQuestManager';
import { LeaderboardManager } from '../systems/LeaderboardManager';
import { CoopInputManager } from '../systems/CoopInputManager';
import { NetworkManager } from '../systems/NetworkManager';
import type { ServerMessage } from '../systems/NetworkTypes';
import { RemotePlayer } from '../entities/RemotePlayer';
import { TimeManager } from '../systems/TimeManager';
import { NeedsManager } from '../systems/NeedsManager';
import { JobManager, type JobConfig } from '../systems/JobManager';
import { CourierManager } from '../systems/CourierManager';
import { HousingManager, type HomeConfig } from '../systems/HousingManager';
import { LifeTaskManager } from '../systems/LifeTaskManager';
import { GroceryManager } from '../systems/GroceryManager';
import { LifeTaskLog } from '../ui/LifeTaskLog';
import { LifeShopUI } from '../ui/LifeShopUI';
import { JobApplicationUI } from '../ui/JobApplicationUI';
import { ScopeOverlay } from '../ui/ScopeOverlay';
import { LifeSimIntro } from '../ui/LifeSimIntro';
import { applyLifeSimNewGameStart } from '../systems/LifeSimStart';
import { LifeSimStoryManager } from '../systems/LifeSimStoryManager';
import { EmploymentOfficeManager, type EmploymentOfficeConfig } from '../systems/EmploymentOfficeManager';
import { isScopedWeapon } from '../systems/WeaponManager';

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private cityMap!: CityMap;
  private player!: Player;
  private player2: Player | null = null;
  private inputMgr!: InputManager;
  private coopInput: CoopInputManager | null = null;
  private isCoop = false;
  private isPvp = false;
  private isOnline = false;
  private network: NetworkManager | null = null;
  private remotePlayers = new Map<string, RemotePlayer>();
  private networkSyncTimer = 0;
  private onNetworkMessage = (msg: ServerMessage) => this.handleNetworkMessage(msg);
  private gangManager!: GangManager;
  private combatManager!: CombatManager;
  private policeManager!: PoliceManager;
  private blockpostManager!: BlockpostManager;
  private trafficManager!: TrafficManager;
  private roadLayer: RoadLayer | null = null;
  private trafficLights: TrafficLightManager | null = null;
  private laneNavigation: LaneNavigation | null = null;
  private pedestrianManager!: PedestrianManager;
  private shopManager!: ShopManager;
  private questManager!: QuestManager;
  private hud!: HUD;
  private minimap!: Minimap;
  private questLog!: QuestLog;
  private shopUI!: ShopUI;
  private dialogBox = new DialogBox();
  private npcs: NPC[] = [];
  private questGivers: NPC[] = [];
  private questGiverLabels: Phaser.GameObjects.Text[] = [];
  private shopClerks: NPC[] = [];
  private shopClerkLabels: Phaser.GameObjects.Text[] = [];
  private payphones: Phaser.GameObjects.Sprite[] = [];
  private shopSprites: Phaser.GameObjects.Sprite[] = [];
  private shopInteriorMarkers: Phaser.GameObjects.Rectangle[] = [];
  private shopDoorMarkers: Phaser.GameObjects.Rectangle[] = [];
  private questOfficeDoorMarkers: Phaser.GameObjects.Rectangle[] = [];
  private homeDoorMarkers: Phaser.GameObjects.Rectangle[] = [];
  private timeManager = new TimeManager();
  private needsManager = new NeedsManager();
  private jobManager!: JobManager;
  private courierManager!: CourierManager;
  private courierMarkerGfx: Phaser.GameObjects.Graphics | null = null;
  private courierMarkerLabels: Phaser.GameObjects.Text[] = [];
  private courierWaypointArrow: WaypointArrow | null = null;
  private housingManager!: HousingManager;
  private lifeTaskManager!: LifeTaskManager;
  private lifeSimStory!: LifeSimStoryManager;
  private tutorialMarkerGfx: Phaser.GameObjects.Graphics | null = null;
  private tutorialMarkerLabel: Phaser.GameObjects.Text | null = null;
  private groceryManager!: GroceryManager;
  private lifeTaskLog!: LifeTaskLog;
  private lifeShopUI: LifeShopUI | null = null;
  private jobApplicationUI: JobApplicationUI | null = null;
  private scopeOverlay!: ScopeOverlay;
  private employmentOfficeManager!: EmploymentOfficeManager;
  private contractTargets: NPC[] = [];
  private contractTargetLabels: Phaser.GameObjects.Text[] = [];
  private employmentDoorMarkers: Phaser.GameObjects.Rectangle[] = [];
  private lastHour = -1;
  private cityActivityTimer = 0;
  private stairMarkers: Phaser.GameObjects.Sprite[] = [];
  private districtFlags: Phaser.GameObjects.Sprite[] = [];
  private landmarkSprites: Phaser.GameObjects.Sprite[] = [];
  private fullMap!: FullMapOverlay;
  private vfx!: VfxManager;
  private atmosphere!: AtmosphereOverlay;
  private tireMarks!: TireMarkManager;
  private smokeTimer = 0;
  private playTimeSeconds = 0;
  private needsEffects: NeedsEffectsOverlay | null = null;
  private cameraFollowTarget: Phaser.GameObjects.GameObject | null = null;
  private sprintBlockedCooldown = 0;
  private mobileControls: MobileControls | null = null;
  private garageManager!: GarageManager;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private weaponManager!: WeaponManager;
  private tutorial!: TutorialOverlay;
  private lifeSimIntro!: LifeSimIntro;
  private isNewGame = true;
  private lastMoveInput = { x: 0, y: 0 };
  private dynamicEvents!: DynamicEventManager;
  private timeOfDay!: TimeOfDayManager;
  private transitionMarkers: Phaser.GameObjects.Sprite[] = [];
  private transitionCooldown = 0;
  private dailyQuest: DailyQuestManager | null = null;
  private lastKills = 0;
  private lastQuestsCompleted = 0;
  private lastMoney = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: {
    loadSave?: boolean;
    ngPlus?: boolean;
    coop?: boolean;
    pvp?: boolean;
    online?: boolean;
    lifeSimReturn?: { mapId: string; x: number; y: number };
    passedState?: GameState;
  } = {}): void {
    this.isCoop = data.coop ?? false;
    this.isPvp = data.pvp ?? false;
    this.isOnline = data.online ?? false;
    this.isNewGame = !data.loadSave && !data.passedState && !data.lifeSimReturn;
    if (data.passedState) {
      this.state = data.passedState;
    } else if (data.loadSave && !this.isOnline) {
      this.state = SaveManager.load() ?? structuredClone(DEFAULT_GAME_STATE);
    } else if (data.ngPlus) {
      const meta = MetaProgress.load();
      this.state = structuredClone(DEFAULT_GAME_STATE);
      this.state.ngPlusLevel = Math.max(1, meta.ngPlusLevel);
    } else {
      this.state = structuredClone(DEFAULT_GAME_STATE);
      if (LIFE_SIM) applyLifeSimNewGameStart(this.state);
    }
    if (data.lifeSimReturn) {
      this.state.currentMapId = data.lifeSimReturn.mapId;
      this.state.playerX = data.lifeSimReturn.x;
      this.state.playerY = data.lifeSimReturn.y;
    }
    this.lastHour = this.state.hour;
  }

  create(): void {
    this.ensureSceneRunning();
    this.resetSceneUI();
    this.resetWorldEntities();

    const mapId = this.state.currentMapId || DEFAULT_MAP_ID;
    this.state.currentMapId = mapId;
    const mapCfg = getMapConfig(mapId);
    const defaultSpawn = spawnToWorld(mapCfg.defaultSpawn.tx, mapCfg.defaultSpawn.ty);

    this.cityMap = new CityMap(this, mapId);
    this.cityMap.generate();

    this.physics.world.setBounds(0, 0, this.cityMap.worldWidth, this.cityMap.worldHeight);

    const spawnX = this.state.playerX || defaultSpawn.x;
    const spawnY = this.state.playerY || defaultSpawn.y;
    this.player = new Player(this, spawnX, spawnY, this.state);
    if (this.state.onRoof) {
      const zone = this.cityMap.getRoofZoneAtWorld(spawnX, spawnY);
      this.player.toggleRoof(true, zone?.id ?? null);
    }

    if (this.isCoop) {
      if (!this.state.coopPlayer2) {
        this.state.coopPlayer2 = {
          ...DEFAULT_COOP_PLAYER2,
          playerX: spawnX + 48,
          playerY: spawnY,
        };
      }
      this.player2 = new Player(this, this.state.coopPlayer2.playerX, this.state.coopPlayer2.playerY, this.state, {
        slot: 2,
        textureKey: 'player2',
        coopData: this.state.coopPlayer2,
      });
      if (this.state.coopPlayer2.onRoof) {
        const zone = this.cityMap.getRoofZoneAtWorld(
          this.state.coopPlayer2.playerX,
          this.state.coopPlayer2.playerY
        );
        this.player2.toggleRoof(true, zone?.id ?? null);
      }
      this.coopInput = new CoopInputManager(this);
    }

    if (!this.isCoop && ControlSettings.shouldShowMobile(ControlSettings.load().mobileControls)) {
      this.mobileControls = new MobileControls(this);
    }
    this.inputMgr = new InputManager(this, this.mobileControls);
    this.vfx = new VfxManager(this);
    this.registry.set('vfx', this.vfx);
    this.gangManager = new GangManager(this.state);
    this.policeManager = new PoliceManager(this, this.state);
    if (mapId === 'city') {
      this.roadLayer = new RoadLayer(this, this.cityMap);
      const roadNetwork = this.roadLayer.getNetwork();
      this.trafficLights = new TrafficLightManager(this, roadNetwork);
      this.laneNavigation = new LaneNavigation(roadNetwork);
    } else {
      this.roadLayer = null;
      this.trafficLights = null;
      this.laneNavigation = null;
    }
    this.trafficManager = new TrafficManager(
      this,
      this.cityMap,
      this.trafficLights ?? undefined,
      this.laneNavigation ?? undefined
    );
    this.shopManager = new ShopManager(this.state);
    this.jobManager = new JobManager(this.state);
    this.courierManager = new CourierManager(this.state);
    this.housingManager = new HousingManager(this.state);
    this.lifeTaskManager = new LifeTaskManager(this.state);
    this.lifeSimStory = new LifeSimStoryManager(this.state, this.lifeTaskManager);
    this.groceryManager = new GroceryManager(this.state);
    this.employmentOfficeManager = new EmploymentOfficeManager();
    this.scopeOverlay = new ScopeOverlay(this);
    this.questManager = new QuestManager(this, this.state, this.gangManager, this.cityMap);
    this.combatManager = new CombatManager(
      this,
      this.player,
      this.state,
      this.gangManager,
      this.policeManager,
      this.questManager,
      this.vfx,
      this.player2,
      this.isPvp,
      {
        onContractTargetKilled: () => {
          this.showMessage('Контракт выполнен +$250');
          this.lifeTaskManager.onLifeEvent('contract_kill');
        },
      }
    );
    this.blockpostManager = new BlockpostManager(this);
    if (!LIFE_SIM) this.blockpostManager.spawn(this.cityMap.blockposts);
    this.weaponManager = new WeaponManager(this.state);
    this.tutorial = new TutorialOverlay(this);
    this.lifeSimIntro = new LifeSimIntro(this);
    this.fullMap = new FullMapOverlay(this, this.cityMap, this.questManager, this.policeManager);

    this.garageManager = new GarageManager(this, this.state);
    this.garageManager.refresh();

    this.pedestrianManager = new PedestrianManager(this, this.cityMap);
    if (!LIFE_SIM) this.spawnNPCs();
    if (!LIFE_SIM) this.spawnQuestGivers();
    this.spawnShopClerks();
    this.spawnWorldObjects();
    this.spawnShopMarkers();
    if (!LIFE_SIM) this.spawnQuestOfficeDoorMarkers();
    if (LIFE_SIM) {
      this.spawnHomeDoorMarkers();
      this.spawnEmploymentDoorMarkers();
      if (this.jobManager.isViolentJobActive()) this.spawnContractTargets();
      this.refreshCourierMarkers();
    }
    this.spawnTransitionMarkers();

    this.setupCamera();
    this.atmosphere = new AtmosphereOverlay(this);
    this.timeOfDay = new TimeOfDayManager(this.atmosphere);
    if (LIFE_SIM) {
      this.timeOfDay.enableGameClock();
      this.applyCityActivity();
    } else {
      this.trafficManager.spawnInitial();
      this.pedestrianManager.spawn();
    }
    this.setupCollisions();
    this.dynamicEvents = new DynamicEventManager(this, this.state, this.cityMap);
    if (!LIFE_SIM) {
      this.dailyQuest = new DailyQuestManager();
      if (mapId === 'port') this.dailyQuest.onVisitPort();
    }
    this.lastKills = this.state.stats.kills;
    this.lastQuestsCompleted = this.state.stats.questsCompleted;
    this.lastMoney = this.state.money;
    this.tireMarks = new TireMarkManager(this, this.cityMap);
    this.updateElevationVisuals();

    this.hud = new HUD(
      this,
      this.state,
      this.questManager,
      this.gangManager,
      LIFE_SIM ? undefined : this.dailyQuest ?? undefined
    );
    this.minimap = new Minimap(this, this.cityMap, this.questManager);
    if (LIFE_SIM) {
      this.courierWaypointArrow = new WaypointArrow(this);
      this.needsEffects = new NeedsEffectsOverlay(this);
    }
    this.cameras.main.roundPixels = true;
    this.questLog = new QuestLog(
      this,
      this.questManager,
      (id) => this.handleQuestStart(id),
      () => {},
      (msg) => this.showMessage(msg)
    );
    this.shopUI = new ShopUI(this, this.shopManager, (type, id) => this.handleShopBuy(type, id), () => {});
    this.lifeTaskLog = new LifeTaskLog(this, this.lifeTaskManager, (id) => this.handleLifeTaskStart(id), () => {});

    if (this.isNewGame && TutorialOverlay.shouldShow() && !this.isCoop && !LIFE_SIM) {
      this.tutorial.show(() => {});
    }
    if (LIFE_SIM && this.isNewGame && !this.isCoop) {
      if (LifeSimIntro.shouldShow()) {
        this.lifeSimIntro.show(() => {
          const msg = this.lifeSimStory.beginAfterIntro();
          this.showTutorialDialog([msg], () => {
            this.refreshTutorialMarkers();
            this.hudUpdate(this.getInteractHint());
          });
        });
      } else if (this.state.storyChapter === 0) {
        const msg = this.lifeSimStory.beginAfterIntro();
        this.showTutorialDialog([msg], () => {
          this.refreshTutorialMarkers();
          this.hudUpdate(this.getInteractHint());
        });
      }
    } else if (LIFE_SIM) {
      const resume = this.lifeSimStory.syncTutorialTask();
      if (resume) {
        this.showTutorialDialog([resume], () => {
          this.refreshTutorialMarkers();
          this.hudUpdate(this.getInteractHint());
        });
      } else {
        this.refreshTutorialMarkers();
      }
    }

    this.events.off('resume', this.onResumeFromHome);
    this.events.on('resume', this.onResumeFromHome);

    if (this.isCoop) {
      const mode = this.isPvp ? 'PvP' : 'Кооп';
      this.showMessage(`${mode}: P1 WASD+мышь · P2 стрелки+Ctrl`);
    }

    if (this.isOnline) this.setupOnline();

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.isUIBlocking()) return;
      if (pointer.rightButtonDown() && this.canUseScope()) {
        this.scopeOverlay.enter(this.player);
        return;
      }
      if (this.scopeOverlay.isActive() && pointer.leftButtonDown() && currentlyOver.length === 0) {
        this.fireScopedShot();
        return;
      }
      const combatOk = this.isCombatAllowed();
      if (!LIFE_SIM && pointer.leftButtonDown() && currentlyOver.length === 0) {
        if (pointer.x < GAME_WIDTH * 0.5 && pointer.y > GAME_HEIGHT * 0.45) return;
        this.tryFireWeapon();
      } else if (LIFE_SIM && combatOk && pointer.leftButtonDown() && currentlyOver.length === 0) {
        if (pointer.x < GAME_WIDTH * 0.5 && pointer.y > GAME_HEIGHT * 0.45) return;
        if (!this.canUseScope() || !isScopedWeapon(this.state.currentWeapon)) {
          this.tryFireWeapon();
        }
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2 && this.scopeOverlay.isActive()) {
        this.scopeOverlay.exit(this.player);
      }
    });

    if (!LIFE_SIM && this.state.activeQuestId) {
      const quest = this.questManager.quests.find((q) => q.id === this.state.activeQuestId);
      if (quest) {
        this.questManager.restoreQuest(quest, this.state.questSnapshot);
        if (this.state.questSnapshot?.blockpostsPassed) {
          this.blockpostManager.restorePasses(this.state.questSnapshot.blockpostsPassed);
        }
      }
    }
    if (LIFE_SIM && !this.state.housing.homeId) {
      this.showMessage('Симулятор жизни: снимите жильё (зелёная дверь) или найдите работу');
    }

    getAudio(this).ensureContext();
    getAudio(this).startMusic();

    this.events.off('shutdown', this.handleShutdown);
    this.events.on('shutdown', this.handleShutdown);

    this.events.off('vehicle-destroyed', this.handleVehicleDestroyed);
    this.events.on('vehicle-destroyed', this.handleVehicleDestroyed);

    if (import.meta.env.DEV) {
      (window as unknown as { __gta2?: object }).__gta2 = {
        getState: () => this.state,
        isQuestLogVisible: () => this.questLog.isVisible(),
        isDialogVisible: () => this.dialogBox.isVisible(),
        isShopVisible: () => this.shopUI.isVisible(),
        openQuestLog: () => this.questLog.open(),
        startQuestByIndex: (index: number) => {
          const q = this.questManager.getAvailableQuests()[index];
          return q ? this.handleQuestStart(q.id) : false;
        },
        switchWeapon: (slot: number) => this.weaponManager.switchSlot(slot),
        isTutorialVisible: () => this.tutorial.isVisible(),
        dismissTutorial: () => {
          if (this.tutorial.isVisible()) {
            TutorialOverlay.markSeen();
            this.tutorial.close();
          }
        },
        getQuestCount: () => this.questManager.quests.length,
        getAvailableQuestCount: () => this.questManager.getAvailableQuests().length,
        isScenePaused: () => this.sys.isPaused(),
        isUIBlocked: () => this.isUIBlocking(),
        getDebug: () => ({
          blocking: this.isUIBlocking(),
          dialog: this.dialogBox.isVisible(),
          fullMap: this.fullMap.isVisible(),
          shop: this.shopUI.isVisible(),
          questLog: this.questLog.isVisible(),
          tutorial: this.tutorial.isVisible(),
          inVehicle: this.player.inVehicle,
          inputEnabled: this.input.enabled,
          lastMove: this.lastMoveInput,
          spriteY: this.player.sprite.y,
          bodyVel: (this.player.sprite.body as Phaser.Physics.Arcade.Body | null)?.velocity,
        }),
      };
    }
  }

  update(_time: number, delta: number): void {
    this.ensureSceneRunning();
    this.handleUIInput();

    const dt = delta / 1000;

    if (LIFE_SIM) {
      const { dayAdvanced, hourChanged } = this.timeManager.update(dt, this.state);
      if (hourChanged && this.state.hour !== this.lastHour) {
        this.lastHour = this.state.hour;
        const needs = this.needsManager.onHourPassed(this.state);
        if (needs.fainted && needs.message) {
          this.needsEffects?.triggerCollapseBlink();
          this.showMessage(needs.message);
        }
        this.applyCityActivity();
      }
      this.timeOfDay.syncFromHour(this.timeManager.getClockFraction(this.state));
      if (dayAdvanced) {
        const rentMsg = this.housingManager.onDayAdvanced();
        if (rentMsg) this.showMessage(rentMsg);
      }
    }

    if (this.isUIBlocking()) {
      this.player.stopMovement();
      this.player2?.stopMovement();
      getAudio(this).stopEngine();
      const pos = this.player.getPosition();
      const p2 = this.player2?.getPosition();
      this.minimap.update(pos.x, pos.y, p2?.x, p2?.y, this.getLifeSimMinimapMarkers());
      this.updateCourierWaypoint();
      if (LIFE_SIM && this.needsEffects) {
        this.needsEffects.update(dt, this.state.sleep, this.state.drunkLevel);
      }
      this.hudUpdate('');
      return;
    }
    this.playTimeSeconds += dt;
    this.tireMarks?.update(dt);
    if (!LIFE_SIM) this.timeOfDay.update(dt);
    if (LIFE_SIM) {
      this.cityActivityTimer -= dt;
      if (this.cityActivityTimer <= 0) {
        this.cityActivityTimer = 40;
        this.applyCityActivity(true);
      }
    }
    this.transitionCooldown = Math.max(0, this.transitionCooldown - dt);

    const pointer = this.input.activePointer;
    if (this.scopeOverlay.isActive()) {
      this.player.stopMovement();
      this.scopeOverlay.updateAim(this.player, pointer);
      const pos = this.player.getPosition();
      this.minimap.update(pos.x, pos.y, undefined, undefined, this.getLifeSimMinimapMarkers());
      this.updateCourierWaypoint();
      this.hudUpdate('');
      return;
    }

    const move = this.inputMgr.getMovementVector();
    this.lastMoveInput = move;
    let sprint = this.inputMgr.isSprinting();
    if (LIFE_SIM && sprint && !this.needsManager.canSprint(this.state)) {
      sprint = false;
      this.sprintBlockedCooldown -= dt;
      if (this.sprintBlockedCooldown <= 0) {
        const reason = this.needsManager.sprintBlockedReason(this.state);
        if (reason) this.showMessage(reason);
        this.sprintBlockedCooldown = 4;
      }
    } else if (LIFE_SIM) {
      this.sprintBlockedCooldown = 0;
    }

    if (this.player.inVehicle && this.player.currentVehicle) {
      this.updateVehicleDriving(move, dt);
    } else {
      getAudio(this).stopEngine();
      this.player.update(this, dt, move, sprint, pointer);
      this.enforceRoofBounds(this.player);
      this.updateInteriorVisibility();
    }

    if (this.player2 && this.coopInput) {
      const move2 = this.coopInput.getMovementVector();
      const sprint2 = this.coopInput.isSprinting();
      this.player2.update(this, dt, move2, sprint2, undefined, true);
      this.enforceRoofBounds(this.player2);
      if (this.coopInput.consumeShoot()) {
        this.tryFireWeapon(this.player2);
      }
      if (this.coopInput.justPressedInteract()) {
        this.handleCoopInteract(this.player2);
      }
    }

    this.trafficLights?.update(dt);
    this.trafficManager.update(dt);
    const speedMul = this.timeOfDay.getNpcSpeedMultiplier();
    const trafficVehicles = this.trafficManager.getAllVehicles().filter((v) => v.active);
    this.pedestrianManager?.update(dt, speedMul, trafficVehicles);
    if (!LIFE_SIM) this.updateNPCs(dt, speedMul);
    if (!LIFE_SIM) {
      const eventMsg = this.dynamicEvents.update(dt, this.player);
      if (eventMsg) this.showMessage(eventMsg);
    }
    if (!LIFE_SIM) this.processDailyQuest(dt);
    this.updateOnline(dt);
    this.checkMapTransitions();

    if (LIFE_SIM) {
      if (this.jobManager.isViolentJobActive()) {
        const pos = this.player.getPosition();
        for (const t of this.contractTargets) {
          if (t.active) t.update(dt, pos, false);
        }
        const vehicles = this.trafficManager.getAllVehicles().filter((v) => v.active);
        this.combatManager.update(this.getContractTargets(), vehicles);
        if (this.inputMgr.consumeShoot()) this.tryFireWeapon();
      }
    } else {
      const nav = this.cityMap.navigation;
      this.policeManager.update(dt, this.player, nav);
      const allVehicles = [
        ...this.trafficManager.getAllVehicles(),
        ...this.policeManager.policeVehicles,
      ];
      this.combatManager.update(this.getAllNPCs(), allVehicles);

      const passedBlockpost = this.blockpostManager.update(dt, this.player, this.state.wantedLevel, nav);
      if (passedBlockpost) this.questManager.onBlockpostPassed(passedBlockpost);

      const questResult = this.questManager.update(dt, this.player);
      if (questResult === 'complete') this.handleQuestComplete();
      if (questResult === 'fail') this.handleQuestFail();

      if (this.inputMgr.consumeShoot()) {
        this.tryFireWeapon();
      }
    }

    if (!LIFE_SIM && this.policeManager.checkArrest(this.player)) {
      this.showMessage('Задержан! Штраф $200');
      ContextTip.show(this, 'arrest');
      if (this.isCoop ? this.isCoopGameOver() : this.state.lives <= 0) this.gameOver();
    } else if (!LIFE_SIM && this.player2 && this.policeManager.checkArrest(this.player2)) {
      this.showMessage('Игрок 2 задержан! Штраф $200');
      if (this.isCoopGameOver()) this.gameOver();
    } else if (!LIFE_SIM && this.blockpostManager.checkArrest(this.player, this.state.wantedLevel)) {
      if (this.policeManager.arrestPlayer(this.player)) {
        if (this.isCoop ? this.isCoopGameOver() : true) this.gameOver();
      } else {
        this.showMessage('Задержан на блокпосту! Штраф $200');
        ContextTip.show(this, 'arrest');
      }
    }

    if (!LIFE_SIM) {
      this.handlePlayerDeath(this.player, 'Игрок 1 выбит!');
      if (this.player2) this.handlePlayerDeath(this.player2, 'Игрок 2 выбит!');
    }

    if (this.isCoop) this.updateCoopCamera();
    else this.updateSmoothCamera();

    if (LIFE_SIM && this.needsEffects) {
      this.needsEffects.update(dt, this.state.sleep, this.state.drunkLevel);
    }

    const pos = this.player.getPosition();
    const p2pos = this.player2?.getPosition();
    this.minimap.update(pos.x, pos.y, p2pos?.x, p2pos?.y, this.getLifeSimMinimapMarkers());
    this.updateCourierWaypoint();
    this.hudUpdate(this.getInteractHint());
  }

  private getLifeSimMinimapMarkers(): { x: number; y: number; kind: 'target' | 'objective' }[] {
    if (!LIFE_SIM) return [];
    const markers: { x: number; y: number; kind: 'target' | 'objective' }[] = [];
    const story = this.lifeSimStory.getMarker();
    if (story) {
      markers.push({
        x: story.x * TILE_SIZE + TILE_SIZE / 2,
        y: story.y * TILE_SIZE + TILE_SIZE / 2,
        kind: 'target',
      });
    }
    const wp = this.courierManager.getWaypoint();
    if (wp) {
      markers.push({
        x: wp.tileX * TILE_SIZE + TILE_SIZE / 2,
        y: wp.tileY * TILE_SIZE + TILE_SIZE / 2,
        kind: 'objective',
      });
    }
    return markers;
  }

  private updateCourierWaypoint(): void {
    if (!LIFE_SIM || !this.courierWaypointArrow) return;
    const wp = this.courierManager.getWaypoint();
    if (!wp) {
      this.courierWaypointArrow.update(null);
      return;
    }
    const colors = {
      warehouse: { fill: 0xffd600, text: '#ffd600' },
      pickup: { fill: 0x00b4ff, text: '#00b4ff' },
      dropoff: { fill: 0xff6b35, text: '#ff6b35' },
    } as const;
    const c = colors[wp.phase];
    this.courierWaypointArrow.update({
      x: wp.tileX * TILE_SIZE + TILE_SIZE / 2,
      y: wp.tileY * TILE_SIZE + TILE_SIZE / 2,
      label: wp.label,
      color: c.fill,
      labelColor: c.text,
    });
  }

  private handlePlayerDeath(player: Player, msg: string): void {
    if (player.getHealth() > 0) return;
    const out = player.die();
    if (!out) {
      this.showMessage(msg);
      if (player.slot === 1) ContextTip.show(this, 'death');
    } else {
      player.sprite.setVisible(false);
      if (player.sprite.body) (player.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    if (this.isPvp && this.isCoop) {
      const p2lives = this.state.coopPlayer2?.lives ?? 0;
      if (this.state.lives <= 0 && p2lives > 0) {
        this.showMessage('Игрок 2 побеждает в PvP!');
        this.time.delayedCall(1200, () => this.gameOver());
        return;
      }
      if (p2lives <= 0 && this.state.lives > 0) {
        this.showMessage('Игрок 1 побеждает в PvP!');
        this.time.delayedCall(1200, () => this.gameOver());
        return;
      }
    }

    if (this.isCoop) {
      if (this.isCoopGameOver()) this.gameOver();
    } else if (out) {
      this.gameOver();
    }
  }

  private isCoopGameOver(): boolean {
    const p2lives = this.state.coopPlayer2?.lives ?? 0;
    return this.state.lives <= 0 && p2lives <= 0;
  }

  private updateCoopCamera(): void {
    if (!this.player2) return;
    const p1 = this.player.getPosition();
    const p2 = this.player2.getPosition();
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    const zoom = dist > 320 ? 0.82 : dist > 180 ? 0.9 : 1;
    this.cameras.main.centerOn(mx, my);
    this.cameras.main.setZoom(this.player.inVehicle ? 0.9 : zoom);
  }

  private handleCoopInteract(player: Player): void {
    const candidate = pickBest(this.collectInteractCandidates(player));
    if (candidate) this.executeInteract(player, candidate);
  }

  private getVehicleHpInfo(): { current: number; max: number } | null {
    if (!this.player.inVehicle || !this.player.currentVehicle) return null;
    const v = this.player.currentVehicle;
    return { current: v.hp, max: v.config.hp };
  }

  private isUIBlocking(): boolean {
    return (
      this.tutorial.isVisible() ||
      this.shopUI.isVisible() ||
      this.lifeShopUI?.isVisible() ||
      this.jobApplicationUI?.isVisible() ||
      this.lifeSimIntro.isVisible() ||
      this.scopeOverlay.isActive() ||
      (LIFE_SIM ? this.lifeTaskLog.isVisible() : this.questLog.isVisible()) ||
      this.fullMap.isVisible() ||
      this.dialogBox.isVisible()
    );
  }

  private handleUIInput(): void {
    if (this.inputMgr.justPressed('ESC')) {
      if (this.shopUI.isVisible()) {
        this.shopUI.close();
        return;
      }
      if (LIFE_SIM && this.lifeTaskLog.isVisible()) {
        this.lifeTaskLog.close();
        return;
      }
      if (!LIFE_SIM && this.questLog.isVisible()) {
        this.questLog.close();
        return;
      }
      if (this.lifeShopUI?.isVisible()) {
        this.lifeShopUI.close();
        return;
      }
      if (this.jobApplicationUI?.isVisible()) {
        this.jobApplicationUI.close();
        return;
      }
      if (this.lifeSimIntro.isVisible()) {
        this.lifeSimIntro.close();
        LifeSimIntro.markSeen();
        return;
      }
      if (this.scopeOverlay.isActive()) {
        this.scopeOverlay.exit(this.player);
        return;
      }
      if (this.fullMap.isVisible()) {
        this.toggleFullMap();
        return;
      }
      if (!this.dialogBox.isVisible()) this.pauseGame();
    }

    if (this.inputMgr.justPressedQuestLog() && !this.shopUI.isVisible() && !this.lifeShopUI?.isVisible()) {
      if (LIFE_SIM) this.lifeTaskLog.toggle();
      else this.questLog.toggle();
    }

    if (
      this.inputMgr.justPressedMap() &&
      !this.shopUI.isVisible() &&
      !this.lifeShopUI?.isVisible() &&
      !(LIFE_SIM ? this.lifeTaskLog.isVisible() : this.questLog.isVisible())
    ) {
      this.toggleFullMap();
    }

    if (
      this.inputMgr.justPressedInteract() &&
      !this.shopUI.isVisible() &&
      !this.lifeShopUI?.isVisible() &&
      !(LIFE_SIM ? this.lifeTaskLog.isVisible() : this.questLog.isVisible())
    ) {
      this.handleInteract();
    }

    if (this.inputMgr.justPressed('F5')) {
      SaveManager.save(this.syncState());
      this.showMessage('Сохранено');
    }

    if (this.inputMgr.justPressed('F9')) {
      const loaded = SaveManager.load();
      if (loaded) this.scene.restart({ loadSave: true });
    }

    if (this.canUseScope() && this.inputMgr.justPressed('Q')) {
      if (this.scopeOverlay.isActive()) this.scopeOverlay.exit(this.player);
      else this.scopeOverlay.enter(this.player);
    }

    const weaponKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const;
    for (let i = 0; i < weaponKeys.length; i++) {
      if (this.inputMgr.justPressed(weaponKeys[i])) {
        if (this.weaponManager.switchSlot(i + 1)) {
          getAudio(this).playSfx('ui');
        }
      }
    }
  }

  private handleInteract(): void {
    if (this.dialogBox.isVisible() || this.shopUI.isVisible()) return;
    const candidate = pickBest(this.collectInteractCandidates(this.player));
    if (candidate) this.executeInteract(this.player, candidate);
  }

  private updateVehicleDriving(_move: { x: number; y: number }, dt: number): void {
    const vehicle = this.player.currentVehicle!;
    const throttle = this.inputMgr.getThrottleInput();
    const steer = this.inputMgr.getSteerInput();

    vehicle.updateDriving(throttle, steer, dt);
    getAudio(this).updateEngine(vehicle.state.speed, vehicle.config.maxSpeed);
    this.tireMarks.tryAddMark(
      vehicle.sprite.x,
      vehicle.sprite.y,
      vehicle.state.angle,
      vehicle.state.speed,
      steer,
      dt
    );
    if (Math.abs(vehicle.state.speed) > 90 && Math.abs(throttle) > 0.2) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.15;
        const rad = Phaser.Math.DegToRad(vehicle.state.angle + 180);
        this.vfx.tireSmoke(
          vehicle.sprite.x + Math.cos(rad) * 14,
          vehicle.sprite.y + Math.sin(rad) * 14
        );
      }
    }
    this.player.syncToVehicle();

    for (const npc of this.getAllNPCs()) {
      if (!npc.active) continue;
      const dist = Phaser.Math.Distance.Between(vehicle.sprite.x, vehicle.sprite.y, npc.sprite.x, npc.sprite.y);
      if (dist < 20 && Math.abs(vehicle.state.speed) > 50) {
        const killed = npc.takeDamage(40);
        if (killed) {
          this.state.stats.kills++;
          this.gangManager.onKill(true, npc.gang);
          this.policeManager.addWanted(npc.role === 'police' ? 2 : 1);
        }
      }
    }

    if (Math.abs(vehicle.state.speed) > 65) {
      for (const other of this.trafficManager.getAllVehicles()) {
        if (other === vehicle || !other.active) continue;
        const vDist = Phaser.Math.Distance.Between(vehicle.sprite.x, vehicle.sprite.y, other.sprite.x, other.sprite.y);
        if (vDist < 28) other.takeDamage(20);
      }
    }
  }

  private handleQuestStart(questId: string, skipDialog = false): boolean {
    if (this.state.activeQuestId) {
      this.showMessage('Сначала завершите текущий квест');
      return false;
    }
    const questDef = this.questManager.quests.find((q) => q.id === questId);
    const unlock = questDef ? this.questManager.getQuestUnlockStatus(questDef) : null;
    if (unlock && !unlock.unlocked) {
      this.showMessage(unlock.reason ?? 'Квест заблокирован');
      return false;
    }
    if (questDef?.type === 'territory' && questDef.territoryGang) {
      if (!this.gangManager.canCaptureTerritory(questDef.territoryGang)) {
        this.showMessage('Слишком низкое уважение для захвата территории');
        return false;
      }
    }
    if (!skipDialog && questDef && this.questManager.questRequiresInPersonAccept(questDef)) {
      const giver = this.questManager.getGiver(questDef.giverId);
      if (giver) {
        this.showMessage(`Возьмите задание у заказчика: ${this.questManager.getGiverLocationHint(giver)}`);
      }
      return false;
    }
    const quest = this.questManager.startQuest(questId);
    if (!quest) {
      this.showMessage('Не удалось начать квест');
      return false;
    }
    this.questLog.close();
    this.player.stopMovement();
    if (quest.type === 'steal') this.spawnStealVehicle(quest.vehicleType ?? 'sports');
    if (quest.type === 'race' && quest.requireVehicle && !this.player.inVehicle) {
      this.spawnRaceVehicle(quest.vehicleType ?? 'sports');
    }
    if (quest.type === 'blockpost') this.blockpostManager.resetPasses();
    getAudio(this).playSfx('quest');
    if (!skipDialog) {
      this.dialogBox.showSequence(this, this.questManager.getStartDialogue(quest));
    }
    return true;
  }

  private getNearestQuestGiver(px: number, py: number, player: Player, radius = 55): NPC | null {
    let best: NPC | null = null;
    let bestDist = radius;
    for (const giver of this.questGivers) {
      if (!giver.active || !giver.questGiverId) continue;
      const config = this.questManager.getGiver(giver.questGiverId);
      if (!config) continue;
      if (config.interior) {
        if (player.insideInteriorId !== config.id) continue;
      } else if (player.insideInteriorId || player.insideShopId) {
        continue;
      }
      const dist = Phaser.Math.Distance.Between(px, py, giver.sprite.x, giver.sprite.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = giver;
      }
    }
    return best;
  }

  private talkToQuestGiver(npc: NPC): void {
    const giverId = npc.questGiverId;
    const giverName = npc.questGiverName ?? 'Контакт';
    if (!giverId) return;

    if (this.state.activeQuestId) {
      const active = this.questManager.getActiveQuest();
      const lines =
        active?.giverId === giverId
          ? [{ speaker: giverName, text: 'Выполняй задание. Не подведи.' }]
          : [{ speaker: giverName, text: 'Сначала закончи текущее дело.' }];
      this.dialogBox.showSequence(this, lines);
      return;
    }

    const available = this.questManager.getAvailableQuestsForGiver(giverId);
    if (available.length === 0) {
      this.dialogBox.showSequence(this, this.questManager.getIdleDialogue(giverId));
      return;
    }

    const quest = available[0];
    this.dialogBox.showSequence(this, this.questManager.getStartDialogue(quest), () => {
      this.handleQuestStart(quest.id, true);
    });
  }

  private spawnRaceVehicle(type: string): void {
    const pos = this.player.getPosition();
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const v = new Vehicle(
      this,
      pos.x + Math.cos(angle) * 70,
      pos.y + Math.sin(angle) * 70,
      type
    );
    this.trafficManager.parkedVehicles.push(v);
    this.setupCollisions();
    this.showMessage('Гоночная машина рядом — садись и стартуй!');
  }

  private spawnStealVehicle(type: string): void {
    const pos = this.player.getPosition();
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const v = new Vehicle(
      this,
      pos.x + Math.cos(angle) * 90,
      pos.y + Math.sin(angle) * 90,
      type
    );
    this.trafficManager.parkedVehicles.push(v);
    this.setupCollisions();
  }

  private handleQuestComplete(): void {
    const quest = this.questManager.completeQuest();
    if (quest) {
      this.player.stopMovement();
      getAudio(this).playSfx('quest');
      this.dialogBox.showSequence(this, this.questManager.getEndDialogue(quest));
      SaveManager.save(this.syncState());
      if (this.questManager.isFinaleQuest(quest)) {
        this.time.delayedCall(1200, () => this.victory());
      }
    }
  }

  private handleQuestFail(): void {
    this.questManager.failQuest();
    this.showMessage('Квест провален');
    ContextTip.show(this, 'quest_fail');
  }

  private isCombatAllowed(): boolean {
    if (!LIFE_SIM) return true;
    return this.jobManager.isViolentJobActive();
  }

  private canUseScope(): boolean {
    return this.isCombatAllowed() && isScopedWeapon(this.state.currentWeapon) && !this.player.inVehicle;
  }

  private fireScopedShot(): void {
    if (!this.scopeOverlay.isActive()) return;
    const angle = this.scopeOverlay.getAimAngle();
    if (this.state.currentWeapon === 'fists') {
      this.combatManager.meleeAttack(this.getContractTargets(), this.player);
    } else {
      this.combatManager.shoot(this.player, angle);
    }
  }

  private getContractTargets(): NPC[] {
    return this.contractTargets.filter((t) => t.active);
  }

  private openJobBoard(source: import('../ui/JobApplicationUI').JobBoardSource): void {
    this.jobApplicationUI?.close();
    this.jobApplicationUI = new JobApplicationUI(
      this,
      this.jobManager,
      (job) => {
        const err = this.jobManager.apply(job);
        if (!err) {
          this.notifyLifeEvent('get_job');
          if (job.violent) {
            this.clearContractTargets();
            this.spawnContractTargets();
            this.showMessage('Контрактные цели отмечены на карте. Оружейная «Тень» открыта.');
          }
          if (job.jobType === 'courier' || job.id === 'courier') {
            this.refreshCourierMarkers();
            this.showMessage('Склад отмечен на карте — следуйте за стрелкой');
          }
        }
        return err;
      },
      () => {
        this.jobManager.quit();
        this.courierManager.clearDelivery();
        this.refreshCourierMarkers();
        this.clearContractTargets();
      },
      (msg) => this.showMessage(msg),
      () => {}
    );
    this.jobApplicationUI.show(source);
  }

  private enterEmploymentOffice(office: EmploymentOfficeConfig, player: Player = this.player): void {
    const center = this.employmentOfficeManager.getInteriorCenter(office);
    player.sprite.setPosition(center.x, center.y);
    player.insideEmploymentOfficeId = office.id;
    if (player.slot === 1) {
      this.updateInteriorVisibility();
      this.showMessage(`Вошли: ${office.name}`);
    }
  }

  private exitEmploymentOffice(office: EmploymentOfficeConfig, player: Player = this.player): void {
    const exit = this.employmentOfficeManager.getExitPosition(office);
    player.sprite.setPosition(exit.x, exit.y);
    player.insideEmploymentOfficeId = null;
    if (player.slot === 1) {
      this.jobApplicationUI?.close();
      this.updateInteriorVisibility();
      this.showMessage('Вы вышли из офиса занятости');
    }
  }

  private spawnEmploymentDoorMarkers(): void {
    for (const office of this.employmentOfficeManager.getOfficesForMap(this.state.currentMapId)) {
      const door = this.add
        .rectangle(
          office.doorX * TILE_SIZE + TILE_SIZE / 2,
          office.doorY * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 6,
          TILE_SIZE - 6,
          0x00bfff,
          0.4
        )
        .setDepth(2);
      this.employmentDoorMarkers.push(door);
    }
  }

  private spawnContractTargets(): void {
    this.clearContractTargets();
    const spots = [
      { x: 108, y: 115 },
      { x: 122, y: 102 },
      { x: 88, y: 106 },
    ];
    for (const s of spots) {
      const wx = s.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = s.y * TILE_SIZE + TILE_SIZE / 2;
      const npc = new NPC(this, wx, wy, null, 'target');
      this.contractTargets.push(npc);
      const label = this.add
        .text(wx, wy - 28, 'Цель', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ff2d55',
          backgroundColor: '#0d0d14cc',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.contractTargetLabels.push(label);
    }
    this.setupCollisions();
  }

  private clearContractTargets(): void {
    for (const t of this.contractTargets) {
      if (t.sprite.active) t.sprite.destroy();
    }
    for (const l of this.contractTargetLabels) l.destroy();
    this.contractTargets = [];
    this.contractTargetLabels = [];
  }

  private tryFireWeapon(shooter: Player = this.player): void {
    if (this.isUIBlocking()) return;
    if (LIFE_SIM && !this.isCombatAllowed()) return;
    if (this.state.currentWeapon === 'fists') {
      this.combatManager.meleeAttack(
        LIFE_SIM ? this.getContractTargets() : this.getAllNPCs(),
        shooter
      );
    } else {
      this.combatManager.shoot(shooter);
    }
  }

  private handleShopBuy(type: string, id: string): string | null {
    let err: string | null = null;
    if (type === 'weapon') err = this.shopManager.buyWeapon(id);
    else if (type === 'ammo') err = this.shopManager.buyAmmo(id);
    else if (type === 'vehicle') {
      err = this.shopManager.buyVehicle(id);
      if (!err) {
        this.garageManager.refresh();
        this.setupCollisions();
      }
    } else if (type === 'heal') err = this.shopManager.heal();

    if (err) {
      getAudio(this).playSfx('alert');
      this.showMessage(err);
    } else {
      getAudio(this).playSfx('buy');
      this.showMessage('Покупка успешна');
    }
    return err;
  }

  private getInteractHint(): string {
    return hintFromCandidate(pickBest(this.collectInteractCandidates(this.player)));
  }

  private collectInteractCandidates(player: Player): InteractCandidate[] {
    const candidates: InteractCandidate[] = [];
    const pos = player.getPosition();
    const px = pos.x;
    const py = pos.y;

    if (player.inVehicle) {
      candidates.push(makeCandidate('vehicle_exit', 0, 'Выйти из машины'));
      return candidates;
    }

    const stairsZone = this.cityMap.getStairsZoneAtWorld(px, py, 1);
    if (stairsZone) {
      const stairX = stairsZone.stairs.tx * TILE_SIZE + TILE_SIZE / 2;
      const stairY = stairsZone.stairs.ty * TILE_SIZE + TILE_SIZE / 2;
      const stairDist = Phaser.Math.Distance.Between(px, py, stairX, stairY);
      if (stairDist <= 28) {
        candidates.push(
          makeCandidate(
            'stairs',
            stairDist,
            player.onRoof ? 'Спуститься по лестнице' : 'Подняться на крышу',
            { player, zone: stairsZone }
          )
        );
      }
    }

    if (player.insideEmploymentOfficeId) {
      const office = this.employmentOfficeManager.offices.find((o) => o.id === player.insideEmploymentOfficeId);
      if (office) {
        const dx = office.doorX * TILE_SIZE + TILE_SIZE / 2;
        const dy = office.doorY * TILE_SIZE + TILE_SIZE / 2;
        if (Math.hypot(px - dx, py - dy) < 28) {
          candidates.push(
            makeCandidate('employment_exit', Math.hypot(px - dx, py - dy), 'Выйти из офиса занятости', {
              office,
              player,
            })
          );
        }
        if (this.employmentOfficeManager.isNearClerk(office, px, py)) {
          const cx = office.clerkX * TILE_SIZE + TILE_SIZE / 2;
          const cy = office.clerkY * TILE_SIZE + TILE_SIZE / 2;
          candidates.push(
            makeCandidate(
              'employment_clerk',
              Math.hypot(px - cx, py - cy),
              'Вакансии — устроиться на работу',
              { office }
            )
          );
        }
      }
    } else if (player.insideShopId) {
      const shop = this.shopManager.getShopById(player.insideShopId);
      if (shop) {
        if (this.shopManager.isAtDoor(shop, px, py)) {
          const dx = shop.doorX * TILE_SIZE + TILE_SIZE / 2;
          const dy = shop.doorY * TILE_SIZE + TILE_SIZE / 2;
          candidates.push(
            makeCandidate('shop_door_exit', Phaser.Math.Distance.Between(px, py, dx, dy), 'Выйти из магазина', {
              shop,
              player,
            })
          );
        }
        if (shop.clerk) {
          const cx = shop.clerk.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = shop.clerk.y * TILE_SIZE + TILE_SIZE / 2;
          const clerkDist = Phaser.Math.Distance.Between(px, py, cx, cy);
          if (clerkDist <= 40) {
            candidates.push(
              makeCandidate(
                'shop_clerk',
                clerkDist,
                `${shop.name} — купить`,
                { shop, player }
              )
            );
          }
        }
      }
    } else if (!player.insideInteriorId && !player.insideEmploymentOfficeId) {
      const doorShop = this.shopManager.getShopAtDoor(px, py);
      if (doorShop && (!doorShop.killerOnly || this.jobManager.isViolentJobActive())) {
        const dx = doorShop.doorX * TILE_SIZE + TILE_SIZE / 2;
        const dy = doorShop.doorY * TILE_SIZE + TILE_SIZE / 2;
        candidates.push(
          makeCandidate(
            'shop_door_enter',
            Phaser.Math.Distance.Between(px, py, dx, dy),
            `Войти: ${doorShop.name}`,
            { shop: doorShop, player }
          )
        );
      }
    }

    if (!LIFE_SIM && player.insideInteriorId) {
      const giver = this.questManager.getGiver(player.insideInteriorId);
      if (giver?.interior && this.isAtInteriorDoor(giver, px, py)) {
        const dx = giver.interior.doorX * TILE_SIZE + TILE_SIZE / 2;
        const dy = giver.interior.doorY * TILE_SIZE + TILE_SIZE / 2;
        candidates.push(
          makeCandidate('interior_door_exit', Phaser.Math.Distance.Between(px, py, dx, dy), 'Выйти из офиса', {
            giver,
            player,
          })
        );
      }
      const nearGiver = this.getNearestQuestGiver(px, py, player);
      if (nearGiver) {
        const label = this.questGiverLabel(nearGiver);
        candidates.push(
          makeCandidate(
            'quest_giver',
            Phaser.Math.Distance.Between(px, py, nearGiver.sprite.x, nearGiver.sprite.y),
            label,
            { npc: nearGiver }
          )
        );
      }
    } else if (!LIFE_SIM) {
      for (const giver of this.questManager.getGiversForMap(this.state.currentMapId)) {
        if (!giver.interior) continue;
        if (!this.isAtInteriorDoor(giver, px, py)) continue;
        const dx = giver.interior.doorX * TILE_SIZE + TILE_SIZE / 2;
        const dy = giver.interior.doorY * TILE_SIZE + TILE_SIZE / 2;
        candidates.push(
          makeCandidate(
            'interior_door_enter',
            Phaser.Math.Distance.Between(px, py, dx, dy),
            `Войти: офис ${giver.name}`,
            { giver, player }
          )
        );
      }

      const nearGiver = this.getNearestQuestGiver(px, py, player);
      if (nearGiver) {
        candidates.push(
          makeCandidate(
            'quest_giver',
            Phaser.Math.Distance.Between(px, py, nearGiver.sprite.x, nearGiver.sprite.y),
            this.questGiverLabel(nearGiver),
            { npc: nearGiver }
          )
        );
      }
    }

    for (const v of this.trafficManager.getAllVehicles()) {
      if (!v.active || v.occupied) continue;
      const dist = Phaser.Math.Distance.Between(px, py, v.sprite.x, v.sprite.y);
      if (dist < 40) candidates.push(makeCandidate('traffic_vehicle', dist, 'Сесть в машину', { vehicle: v }));
    }

    const garageVehicle = this.garageManager.findNearbyVehicle(px, py);
    if (garageVehicle) {
      const dist = Phaser.Math.Distance.Between(px, py, garageVehicle.sprite.x, garageVehicle.sprite.y);
      candidates.push(makeCandidate('garage_vehicle', dist, 'Гараж — сесть в машину', { vehicle: garageVehicle }));
    }

    if (LIFE_SIM) {
      candidates.push(...this.collectLifeSimCandidates(px, py, player));
    } else {
      for (const phone of this.payphones) {
        const dist = Phaser.Math.Distance.Between(px, py, phone.x, phone.y);
        if (dist < 60) candidates.push(makeCandidate('payphone', dist, 'Таксофон — журнал квестов'));
      }
    }

    const nearTransition = this.getNearestTransition(px, py);
    if (nearTransition) {
      const tx = nearTransition.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = nearTransition.y * TILE_SIZE + TILE_SIZE / 2;
      candidates.push(
        makeCandidate(
          'transition',
          Phaser.Math.Distance.Between(px, py, tx, ty),
          nearTransition.label ?? getMapConfig(nearTransition.targetMap).name,
          { transition: nearTransition }
        )
      );
    }

    return candidates;
  }

  private executeInteract(player: Player, candidate: InteractCandidate): void {
    const kind = candidate.kind as InteractKind;
    const payload = candidate.payload as Record<string, unknown> | undefined;

    switch (kind) {
      case 'vehicle_exit':
        getAudio(this).stopEngine();
        player.exitVehicle();
        if (player.slot === 1) {
          this.setCameraFollow(player.sprite, 1);
          this.setupCollisions();
        }
        break;
      case 'stairs':
        this.handleStairsInteract((payload?.player as Player) ?? player);
        break;
      case 'shop_door_enter':
        this.enterShop(payload!.shop as ShopConfig, (payload?.player as Player) ?? player);
        break;
      case 'shop_door_exit':
        this.exitShop(payload!.shop as ShopConfig, (payload?.player as Player) ?? player);
        break;
      case 'shop_clerk': {
        const shop = payload!.shop as ShopConfig;
        if (shop.killerOnly && !this.jobManager.isViolentJobActive()) {
          this.showMessage('Оружейная только для киллеров');
          break;
        }
        if (LIFE_SIM && (shop.type === 'grocery' || shop.type === 'furniture')) {
          this.openLifeShop(shop.type as 'grocery' | 'furniture');
        } else {
          this.shopUI.show(shop);
        }
        break;
      }
      case 'task_board':
        this.lifeTaskLog.open();
        break;
      case 'employment_enter':
        this.enterEmploymentOffice(payload!.office as EmploymentOfficeConfig, (payload?.player as Player) ?? player);
        break;
      case 'employment_exit':
        this.exitEmploymentOffice(payload!.office as EmploymentOfficeConfig, (payload?.player as Player) ?? player);
        break;
      case 'employment_clerk':
        this.openJobBoard('office');
        break;
      case 'job_hr':
        this.handleJobHr(payload!.job as JobConfig, Boolean(payload?.quit));
        break;
      case 'job_shift':
        this.handleJobShift(payload!.job as JobConfig);
        break;
      case 'courier_take_order':
        this.handleCourierTakeOrder();
        break;
      case 'courier_pickup':
        this.handleCourierPickup();
        break;
      case 'courier_deliver':
        this.handleCourierDeliver(payload!.home as HomeConfig);
        break;
      case 'home_enter':
        this.enterHome(payload!.home as HomeConfig);
        break;
      case 'home_rent':
        this.rentHome(payload!.home as HomeConfig);
        break;
      case 'interior_door_enter':
        this.enterInterior(payload!.giver as QuestGiverConfig, player);
        break;
      case 'interior_door_exit':
        this.exitInterior(payload!.giver as QuestGiverConfig, player);
        break;
      case 'quest_giver':
        this.talkToQuestGiver(payload!.npc as NPC);
        break;
      case 'payphone':
        this.questLog.open();
        break;
      case 'traffic_vehicle':
      case 'garage_vehicle': {
        const vehicle = payload!.vehicle as Vehicle;
        player.enterVehicle(vehicle);
        if (player.slot === 1) {
          this.setCameraFollow(vehicle.sprite, 0.9);
          this.setupCollisions();
        }
        break;
      }
      case 'transition':
        this.performTransition(payload!.transition as MapTransitionConfig);
        break;
    }
  }

  private questGiverLabel(npc: NPC): string {
    if (!npc.questGiverId) return `Поговорить: ${npc.questGiverName ?? 'Контакт'}`;
    const hasQuest = this.questManager.getAvailableQuestsForGiver(npc.questGiverId).length > 0;
    return hasQuest
      ? `${npc.questGiverName} — задание`
      : `Поговорить: ${npc.questGiverName}`;
  }

  private isAtInteriorDoor(giver: QuestGiverConfig, px: number, py: number): boolean {
    if (!giver.interior) return false;
    const dx = giver.interior.doorX * TILE_SIZE + TILE_SIZE / 2;
    const dy = giver.interior.doorY * TILE_SIZE + TILE_SIZE / 2;
    return Phaser.Math.Distance.Between(px, py, dx, dy) < 28;
  }

  private enterInterior(giver: QuestGiverConfig, player: Player): void {
    if (!giver.interior) return;
    const wx = giver.interior.spawnX * TILE_SIZE + TILE_SIZE / 2;
    const wy = giver.interior.spawnY * TILE_SIZE + TILE_SIZE / 2;
    player.sprite.setPosition(wx, wy);
    player.insideInteriorId = giver.id;
    if (player.slot === 1) this.updateInteriorVisibility();
    if (player.slot === 1) this.showMessage(`Вошли в офис: ${giver.name}`);
  }

  private exitInterior(giver: QuestGiverConfig, player: Player): void {
    if (!giver.interior) return;
    player.sprite.setPosition(
      giver.interior.doorX * TILE_SIZE + TILE_SIZE / 2,
      (giver.interior.doorY + 1) * TILE_SIZE + TILE_SIZE / 2
    );
    player.insideInteriorId = null;
    if (player.slot === 1) this.updateInteriorVisibility();
    if (player.slot === 1) this.showMessage('Вы вышли из офиса');
  }

  private enterShop(shop: ShopConfig, player: Player = this.player): void {
    const center = this.shopManager.getInteriorCenter(shop);
    player.sprite.setPosition(center.x, center.y);
    player.insideShopId = shop.id;
    if (player.slot === 1) {
      this.updateInteriorVisibility();
      this.showMessage(`Вошли: ${shop.name}`);
    }
  }

  private exitShop(shop: ShopConfig, player: Player = this.player): void {
    const exit = this.shopManager.getExitPosition(shop);
    player.sprite.setPosition(exit.x, exit.y);
    player.insideShopId = null;
    if (player.slot === 1) {
      this.shopUI.close();
      this.updateInteriorVisibility();
      this.showMessage('Вы вышли из магазина');
    }
  }

  private handleStairsInteract(player: Player = this.player): boolean {
    const zone = this.cityMap.getStairsZoneAtWorld(player.sprite.x, player.sprite.y, 1);
    if (!zone) return false;

    const stairX = zone.stairs.tx * TILE_SIZE + TILE_SIZE / 2;
    const stairY = zone.stairs.ty * TILE_SIZE + TILE_SIZE / 2;
    if (Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, stairX, stairY) > 28) {
      return false;
    }

    if (player.onRoof) {
      if (player.roofZoneId !== zone.id) {
        this.showMessage('Спуститься можно только у этих лестниц');
        return true;
      }
      player.toggleRoof(false);
      if (player.slot === 1) {
        this.updateElevationVisuals();
        this.setupCollisions();
      }
      this.showMessage(player.slot === 2 ? 'P2 спустился' : 'Вы спустились на улицу');
      return true;
    }

    player.toggleRoof(true, zone.id);
    if (player.slot === 1) {
      this.updateElevationVisuals();
      this.setupCollisions();
    }
    this.showMessage(player.slot === 2 ? 'P2 поднялся на крышу' : 'Вы поднялись на крышу');
    return true;
  }

  private enforceRoofBounds(player: Player): void {
    if (!player.onRoof || !player.roofZoneId || player.inVehicle) return;
    if (this.cityMap.isValidRoofPosition(player.sprite.x, player.sprite.y, player.roofZoneId)) return;

    const zone = this.cityMap.getRoofZone(player.roofZoneId);
    if (!zone) return;
    const clamped = clampToZone(zone, player.sprite.x, player.sprite.y, TILE_SIZE);
    player.sprite.setPosition(clamped.x, clamped.y);
    player.sprite.setVelocity(0, 0);
  }

  private spawnShopMarkers(): void {
    for (const shop of this.shopManager.shops) {
      const ix = shop.interiorX * TILE_SIZE + (shop.interiorW * TILE_SIZE) / 2;
      const iy = shop.interiorY * TILE_SIZE + (shop.interiorH * TILE_SIZE) / 2;
      const interior = this.add
        .rectangle(ix, iy, shop.interiorW * TILE_SIZE - 4, shop.interiorH * TILE_SIZE - 4, 0xc8f542, 0.08)
        .setDepth(1);
      this.shopInteriorMarkers.push(interior);

      const door = this.add
        .rectangle(
          shop.doorX * TILE_SIZE + TILE_SIZE / 2,
          shop.doorY * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 6,
          TILE_SIZE - 6,
          0xffd600,
          0.35
        )
        .setDepth(2);
      this.shopDoorMarkers.push(door);
    }
  }

  private applyCityActivity(refreshOnly = false): void {
    if (!LIFE_SIM || this.cityMap.mapId !== 'city') return;
    const hour = this.timeManager.getClockFraction(this.state);
    this.timeOfDay.syncFromHour(hour);
    const pos = this.player.getPosition();
    if (refreshOnly) {
      this.trafficManager.refreshNearPlayer(pos.x, pos.y);
      this.pedestrianManager.refreshNearPlayer(pos.x, pos.y);
    } else {
      const trafficCount = getTrafficCountForHour(hour);
      const pedCount = getPedestrianCountForHour(hour);
      this.trafficManager.syncMovingCount(trafficCount, pos.x, pos.y);
      this.pedestrianManager.syncToTarget(pedCount, pos.x, pos.y);
    }
    this.setupCollisions();
  }

  private collectLifeSimCandidates(px: number, py: number, _player: Player): InteractCandidate[] {
    const out: InteractCandidate[] = [];

    for (const phone of this.payphones) {
      const dist = Phaser.Math.Distance.Between(px, py, phone.x, phone.y);
      if (dist < 60) out.push(makeCandidate('task_board', dist, 'Доска заданий'));
    }

    const home = this.housingManager.getHomeAtDoor(px, py, this.state.currentMapId);
    if (home) {
      const dx = home.doorX * TILE_SIZE + TILE_SIZE / 2;
      const dy = home.doorY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(px, py, dx, dy);
      if (this.courierManager.isNearDropoff(px, py, home.id)) {
        out.push(makeCandidate('courier_deliver', dist, 'Вручить посылку', { home }));
      } else if (this.state.housing.homeId === home.id) {
        out.push(makeCandidate('home_enter', dist, 'Войти домой', { home }));
      } else {
        out.push(makeCandidate('home_rent', dist, `Снять: ${home.name} ($${home.rentPerWeek}/нед)`, { home }));
      }
    }

    if (this.courierManager.isNearPickup(px, py)) {
      const d = this.courierManager.getDelivery()!;
      const wx = d.pickupX * TILE_SIZE + TILE_SIZE / 2;
      const wy = d.pickupY * TILE_SIZE + TILE_SIZE / 2;
      out.push(
        makeCandidate(
          'courier_pickup',
          Phaser.Math.Distance.Between(px, py, wx, wy),
          'Забрать посылку'
        )
      );
    }

    const job = this.jobManager.getJobNearHr(px, py, this.state.currentMapId);
    if (job && this.state.job?.id === job.id) {
      const hx = job.hrX * TILE_SIZE + TILE_SIZE / 2;
      const hy = job.hrY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(px, py, hx, hy);
      if (this.jobManager.isCourierJob()) {
        if (!this.courierManager.hasActiveDelivery()) {
          out.push(makeCandidate('courier_take_order', dist, 'Взять заказ', { job }));
        }
      } else {
        out.push(makeCandidate('job_shift', dist, 'Идти на смену', { job }));
      }
      out.push(makeCandidate('job_hr', dist + 1, 'Уволиться', { job, quit: true }));
    }

    if (!this.player.insideEmploymentOfficeId) {
      const office = this.employmentOfficeManager.getOfficeAtDoor(px, py, this.state.currentMapId);
      if (office) {
        const dx = office.doorX * TILE_SIZE + TILE_SIZE / 2;
        const dy = office.doorY * TILE_SIZE + TILE_SIZE / 2;
        out.push(
          makeCandidate(
            'employment_enter',
            Phaser.Math.Distance.Between(px, py, dx, dy),
            `Войти: ${office.name}`,
            { office }
          )
        );
      }
    }

    return out;
  }

  private handleJobHr(job: JobConfig, quit = false): void {
    if (quit && this.state.job?.id === job.id) {
      this.jobManager.quit();
      this.courierManager.clearDelivery();
      this.refreshCourierMarkers();
      this.clearContractTargets();
      this.showMessage('Вы уволились');
      return;
    }
    this.showMessage('Устройство — через телефон, ноутбук или офис занятости');
  }

  private handleCourierTakeOrder(): void {
    const err = this.courierManager.takeOrder();
    if (err) {
      this.showMessage(err);
      return;
    }
    const d = this.courierManager.getDelivery()!;
    const pay = this.courierManager.estimatePay(d.distanceTiles);
    this.showMessage(`Заказ: ${d.pickupName} → ${d.dropoffName} (~$${pay})`);
    this.refreshCourierMarkers();
    this.hudUpdate(this.getInteractHint());
  }

  private handleCourierPickup(): void {
    const pos = this.player.getPosition();
    const err = this.courierManager.pickupPackage(pos.x, pos.y);
    if (err) {
      this.showMessage(err);
      return;
    }
    const d = this.courierManager.getDelivery()!;
    this.showMessage(`Посылка забрана — везите в ${d.dropoffName}`);
    this.refreshCourierMarkers();
    this.hudUpdate(this.getInteractHint());
  }

  private handleCourierDeliver(home: HomeConfig): void {
    const pos = this.player.getPosition();
    const result = this.courierManager.deliverPackage(pos.x, pos.y, home.id);
    if (typeof result === 'string') {
      this.showMessage(result);
      return;
    }
    this.showMessage(`Доставлено! +$${result.pay}`);
    this.notifyLifeEvent('courier_delivery');
    this.lifeTaskManager.onLifeEvent('courier_delivery');
    this.refreshCourierMarkers();
    this.hudUpdate(this.getInteractHint());
  }

  private refreshCourierMarkers(): void {
    this.courierMarkerGfx?.destroy();
    for (const l of this.courierMarkerLabels) l.destroy();
    this.courierMarkerGfx = null;
    this.courierMarkerLabels = [];

    const wp = this.courierManager.getWaypoint();
    if (!wp) return;

    const colors = { warehouse: 0xffd600, pickup: 0x00b4ff, dropoff: 0xff6b35 } as const;
    const g = this.add.graphics().setDepth(6);
    const targets = [
      {
        x: wp.tileX,
        y: wp.tileY,
        label: `▲ ${wp.label}`,
        color: colors[wp.phase],
      },
    ];

    for (const t of targets) {
      const wx = t.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = t.y * TILE_SIZE + TILE_SIZE / 2;
      g.lineStyle(2, t.color, 0.9);
      g.strokeCircle(wx, wy, 20);
      g.fillStyle(t.color, 0.25);
      g.fillCircle(wx, wy, 20);
      const lbl = this.add
        .text(wx, wy - 32, t.label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#0d0d14cc',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(7);
      this.courierMarkerLabels.push(lbl);
    }
    this.courierMarkerGfx = g;
    this.tweens.add({
      targets: [g, ...this.courierMarkerLabels],
      alpha: { from: 1, to: 0.5 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private handleJobShift(job: JobConfig): void {
    const err = this.jobManager.workShift(true, this.state.hour);
    if (err) {
      this.showMessage(err);
      return;
    }
    this.showMessage(`Смена отработана +$${job.salary}`);
  }

  private rentHome(home: HomeConfig): void {
    const err = this.housingManager.rentHome(home);
    if (err) {
      this.showMessage(err);
      return;
    }
    this.notifyLifeEvent('rent_home');
    this.refreshTutorialMarkers();
    this.hudUpdate(this.getInteractHint());
  }

  private onResumeFromHome = (): void => {
    if (!LIFE_SIM) return;
    this.refreshTutorialMarkers();
    this.refreshCourierMarkers();
    this.hudUpdate(this.getInteractHint());
  };

  private notifyLifeEvent(event: string, payload?: Record<string, unknown>): void {
    const result = this.lifeSimStory.handleLifeEvent(event, payload);
    if (!result) return;
    const lines = this.lifeSimStory.buildTutorialDialogLines(result);
    this.showTutorialDialog(lines, () => {
      this.refreshTutorialMarkers();
      this.hudUpdate(this.getInteractHint());
    });
  }

  private refreshTutorialMarkers(): void {
    this.tutorialMarkerGfx?.destroy();
    this.tutorialMarkerLabel?.destroy();
    this.tutorialMarkerGfx = null;
    this.tutorialMarkerLabel = null;
    const m = this.lifeSimStory.getMarker();
    if (!m) return;
    const wx = m.x * TILE_SIZE + TILE_SIZE / 2;
    const wy = m.y * TILE_SIZE + TILE_SIZE / 2;
    const g = this.add.graphics().setDepth(6);
    g.lineStyle(2, 0xffd600, 0.9);
    g.strokeCircle(wx, wy, 22);
    g.fillStyle(0xffd600, 0.2);
    g.fillCircle(wx, wy, 22);
    this.tutorialMarkerGfx = g;
    this.tutorialMarkerLabel = this.add
      .text(wx, wy - 34, `▼ ${m.label}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffd600',
        backgroundColor: '#0d0d14cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.tweens.add({
      targets: [g, this.tutorialMarkerLabel],
      alpha: { from: 1, to: 0.45 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
  }

  private hudUpdate(interactHint: string): void {
    const pos = this.player.getPosition();
    const storyLine = this.lifeSimStory.getObjectiveText();
    this.hud.update(interactHint, this.getVehicleHpInfo(), this.timeManager, pos, '', storyLine);
  }

  private enterHome(home: HomeConfig): void {
    if (this.state.housing.homeId !== home.id) {
      this.showMessage('Это не ваше жильё');
      return;
    }
    const pos = this.player.getPosition();
    SaveManager.save(this.syncState());
    getAudio(this).stopEngine();
    this.player.stopMovement();
    this.scene.pause();
    this.scene.launch('HomeScene', {
      state: this.state,
      homeId: home.id,
      returnMapId: this.state.currentMapId,
      returnX: pos.x,
      returnY: pos.y,
    } satisfies import('./HomeScene').HomeSceneData);
  }

  private openLifeShop(type: 'grocery' | 'furniture'): void {
    this.lifeShopUI?.close();
    this.lifeShopUI = new LifeShopUI(
      this,
      this.groceryManager,
      type,
      (id) => {
        if (type === 'grocery') {
          const err = this.groceryManager.buyGrocery(id);
          if (!err) this.notifyLifeEvent('buy_food');
          return err;
        }
        const err = this.groceryManager.buyFurniture(id);
        if (!err && id === 'bed_basic') {
          this.refreshTutorialMarkers();
          const stepMsg = this.lifeSimStory.getBedPurchasedStepMessage();
          if (stepMsg) {
            this.showTutorialDialog([stepMsg], () => this.hudUpdate(this.getInteractHint()));
          }
        }
        return err;
      },
      (id) => {
        const err = this.groceryManager.eatNow(id);
        if (!err) this.notifyLifeEvent('buy_food');
        return err;
      },
      (id) => this.groceryManager.drinkNow(id),
      (msg) => this.showMessage(msg),
      () => {}
    );
    this.lifeShopUI.show();
  }

  private handleLifeTaskStart(taskId: string): boolean {
    if (this.state.activeLifeTaskId) {
      this.showMessage('Сначала завершите текущую задачу');
      return false;
    }
    const task = this.lifeTaskManager.startTask(taskId);
    if (!task) return false;
    this.showMessage(`Задача: ${task.title}`);
    return true;
  }

  private spawnHomeDoorMarkers(): void {
    for (const home of this.housingManager.getHomesForMap(this.state.currentMapId)) {
      const isYours = this.state.housing.homeId === home.id;
      const door = this.add
        .rectangle(
          home.doorX * TILE_SIZE + TILE_SIZE / 2,
          home.doorY * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 6,
          TILE_SIZE - 6,
          isYours ? 0x7ee787 : 0x00e676,
          0.4
        )
        .setDepth(2);
      this.homeDoorMarkers.push(door);
    }
  }

  private spawnQuestOfficeDoorMarkers(): void {
    for (const giver of this.questManager.getGiversForMap(this.state.currentMapId)) {
      if (!giver.interior) continue;
      const door = this.add
        .rectangle(
          giver.interior.doorX * TILE_SIZE + TILE_SIZE / 2,
          giver.interior.doorY * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 6,
          TILE_SIZE - 6,
          0xff69b4,
          0.35
        )
        .setDepth(2);
      this.questOfficeDoorMarkers.push(door);
    }
  }

  private updateElevationVisuals(): void {
    const roofLayer = this.cityMap.getRoofLayer();
    if (this.player.onRoof) {
      roofLayer.setAlpha(1);
      roofLayer.setVisible(true);
    } else {
      roofLayer.setAlpha(0.5);
      roofLayer.setVisible(true);
    }
    for (const m of this.stairMarkers) {
      m.setVisible(!this.player.onRoof);
    }
  }

  private spawnNPCs(): void {
    for (const spawn of this.cityMap.npcSpawns) {
      for (let i = 0; i < spawn.count; i++) {
        const wx = spawn.x * TILE_SIZE + TILE_SIZE / 2;
        const wy = spawn.y * TILE_SIZE + TILE_SIZE / 2;
        const x = wx + Phaser.Math.Between(-60, 60);
        const y = wy + Phaser.Math.Between(-60, 60);
        this.npcs.push(new NPC(this, x, y, spawn.gang, spawn.role ?? (spawn.gang ? 'gang' : 'civilian')));
      }
    }
  }

  private spawnQuestGivers(): void {
    for (const giver of this.questManager.getGiversForMap(this.state.currentMapId)) {
      const interior = giver.interior;
      const tx = interior ? interior.spawnX : giver.x;
      const ty = interior ? interior.spawnY : giver.y;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      const npc = new NPC(this, x, y, giver.gang, 'quest_giver');
      npc.questGiverId = giver.id;
      npc.questGiverName = giver.name;
      if (interior) npc.sprite.setVisible(false);
      this.questGivers.push(npc);

      const label = this.add
        .text(x, y - 30, `${giver.name}\n${giver.title}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffd600',
          backgroundColor: '#0d0d14cc',
          padding: { x: 4, y: 2 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setVisible(!interior);
      this.questGiverLabels.push(label);
    }
  }

  private spawnShopClerks(): void {
    for (const shop of this.shopManager.shops) {
      if (!shop.clerk) continue;
      const x = shop.clerk.x * TILE_SIZE + TILE_SIZE / 2;
      const y = shop.clerk.y * TILE_SIZE + TILE_SIZE / 2;
      const npc = new NPC(this, x, y, null, 'shop_clerk');
      npc.shopClerkId = shop.id;
      npc.shopClerkName = shop.clerk.name;
      npc.sprite.setVisible(false);
      this.shopClerks.push(npc);

      const label = this.add
        .text(x, y - 28, shop.clerk.name, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#7ee787',
          backgroundColor: '#0d0d14cc',
          padding: { x: 4, y: 2 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setVisible(false);
      this.shopClerkLabels.push(label);
    }
  }

  private updateInteriorVisibility(): void {
    for (let i = 0; i < this.shopClerks.length; i++) {
      const clerk = this.shopClerks[i];
      const visible = clerk.shopClerkId === this.player.insideShopId;
      clerk.sprite.setVisible(visible);
      this.shopClerkLabels[i]?.setVisible(visible);
    }
    for (let i = 0; i < this.questGivers.length; i++) {
      const npc = this.questGivers[i];
      if (!npc.questGiverId) continue;
      const config = this.questManager.getGiver(npc.questGiverId);
      if (!config?.interior) continue;
      const visible = this.player.insideInteriorId === config.id;
      npc.sprite.setVisible(visible);
      this.questGiverLabels[i]?.setVisible(visible);
    }
  }

  private spawnTransitionMarkers(): void {
    for (const tr of this.cityMap.transitions) {
      const x = tr.x * TILE_SIZE + TILE_SIZE / 2;
      const y = tr.y * TILE_SIZE + TILE_SIZE / 2;
      const marker = this.add.sprite(x, y, 'tile_stairs');
      marker.setTint(0x00b4ff);
      marker.setAlpha(0.85);
      marker.setDepth(2);
      marker.setScale(1.2);
      this.tweens.add({
        targets: marker,
        alpha: 0.45,
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
      this.transitionMarkers.push(marker);
    }
  }

  private checkMapTransitions(): void {
    if (this.transitionCooldown > 0 || this.isUIBlocking()) return;
    const pos = this.player.getPosition();
    for (const tr of this.cityMap.transitions) {
      const tx = tr.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = tr.y * TILE_SIZE + TILE_SIZE / 2;
      if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 30) {
        this.performTransition(tr);
        return;
      }
    }
  }

  private processDailyQuest(dt: number): void {
    if (!this.dailyQuest) return;
    this.dailyQuest.update(dt, this.state.wantedLevel);

    const killDelta = this.state.stats.kills - this.lastKills;
    for (let i = 0; i < killDelta; i++) this.dailyQuest.onKill();
    this.lastKills = this.state.stats.kills;

    const questDelta = this.state.stats.questsCompleted - this.lastQuestsCompleted;
    for (let i = 0; i < questDelta; i++) this.dailyQuest.onQuestComplete();
    this.lastQuestsCompleted = this.state.stats.questsCompleted;

    if (this.state.money > this.lastMoney) {
      this.dailyQuest.onMoneyEarned(this.state.money - this.lastMoney);
      this.lastMoney = this.state.money;
    }

    const claimMsg = this.dailyQuest.tryAutoClaim(this.state);
    if (claimMsg) {
      this.lastMoney = this.state.money;
      this.showMessage(claimMsg);
    }
  }

  private performTransition(tr: MapTransitionConfig): void {
    const target = spawnToWorld(tr.targetX, tr.targetY);
    if (tr.targetMap === 'port') this.dailyQuest?.onVisitPort();
    this.state.currentMapId = tr.targetMap;
    this.state.playerX = target.x;
    this.state.playerY = target.y;
    this.state.onRoof = false;
    SaveManager.save(this.syncState());
    this.transitionCooldown = 2;
    const label = tr.label ?? getMapConfig(tr.targetMap).name;
    this.showMessage(`Переход: ${label}`);
    this.time.delayedCall(600, () => this.scene.restart({ loadSave: true }));
  }

  private spawnWorldObjects(): void {
    for (const obj of this.cityMap.objects) {
      if (obj.type === 'payphone') {
        const p = this.add.sprite(obj.x * TILE_SIZE + 16, obj.y * TILE_SIZE + 16, 'payphone');
        p.setOrigin(0.5, 0.5);
        p.setDepth(3);
        this.payphones.push(p);
      }
      if (obj.type === 'stairs') {
        const s = this.add.sprite(obj.x * TILE_SIZE + 16, obj.y * TILE_SIZE + 16, 'tile_stairs');
        s.setOrigin(0.5, 0.5);
        s.setDepth(3);
        s.setScale(1.1);
        this.stairMarkers.push(s);
      }
      if (obj.type === 'flag' && obj.data?.gang) {
        const gang = obj.data.gang as GangId;
        const f = this.add.sprite(obj.x * TILE_SIZE + 16, obj.y * TILE_SIZE + 16, 'flag');
        f.setOrigin(0.5, 1);
        f.setDepth(2);
        f.setTint(GANG_COLORS[gang]);
        this.districtFlags.push(f);
      }
      if (obj.type === 'shop' && obj.data?.shopId) {
        const shop = (shopsData as { id: string; type: string }[]).find((s) => s.id === obj.data!.shopId);
        if (shop) {
          const key =
            shop.type === 'grocery'
              ? 'shop_grocery'
              : shop.type === 'furniture'
                ? 'shop_furniture'
                : shop.type === 'weapon'
                  ? 'shop_weapon'
                  : shop.type === 'vehicle'
                    ? 'shop_vehicle'
                    : 'shop_hospital';
          const s = this.add.sprite(obj.x * TILE_SIZE + 16, obj.y * TILE_SIZE + 16, key);
          s.setDepth(3);
          this.shopSprites.push(s);
        }
      }
      if (obj.type === 'landmark' || obj.type === 'tree') {
        const kind = String(obj.data?.kind ?? (obj.type === 'tree' ? 'tree' : 'fountain'));
        const key = `lm_${kind}`;
        if (!this.textures.exists(key)) continue;
        const lm = this.add.sprite(obj.x * TILE_SIZE + 16, obj.y * TILE_SIZE + 16, key);
        lm.setOrigin(0.5, kind === 'tree' ? 0.85 : 0.92);
        lm.setDepth(kind === 'skyline' || kind === 'crane' ? 2 : 4);
        this.landmarkSprites.push(lm);
      }
    }
  }

  private setupCollisions(): void {
    for (const c of this.colliders) c.destroy();
    this.colliders = [];

    const collisionGroup = this.cityMap.getCollisionGroup(this.player.onRoof, this.player.roofZoneId);

    this.colliders.push(this.physics.add.collider(this.player.sprite, collisionGroup));
    if (this.player2?.sprite.active) {
      const p2Group = this.cityMap.getCollisionGroup(this.player2.onRoof, this.player2.roofZoneId);
      this.colliders.push(
        this.physics.add.collider(this.player.sprite, this.player2.sprite, undefined, undefined, this)
      );
      this.colliders.push(this.physics.add.collider(this.player2.sprite, p2Group));
    }

    for (const npc of [
      ...this.npcs,
      ...this.questGivers,
      ...this.shopClerks,
      ...(this.dynamicEvents?.getEventNpcs() ?? []),
    ]) {
      if (npc.active) this.colliders.push(this.physics.add.collider(npc.sprite, collisionGroup));
    }
    for (const cop of this.policeManager.policeNPCs) {
      if (cop.active) this.colliders.push(this.physics.add.collider(cop.sprite, collisionGroup));
    }
    for (const cop of this.blockpostManager.cops) {
      if (cop.active) this.colliders.push(this.physics.add.collider(cop.sprite, collisionGroup));
    }
    for (const ped of this.pedestrianManager?.pedestrians ?? []) {
      if (ped.active) this.colliders.push(this.physics.add.collider(ped.sprite, collisionGroup));
    }
    const allVehicles = [
      ...this.trafficManager.getAllVehicles(),
      ...this.garageManager.parkedVehicles,
      ...this.policeManager.policeVehicles,
    ].filter((v) => v.active);
    for (const v of allVehicles) {
      this.colliders.push(this.physics.add.collider(v.sprite, collisionGroup));
    }
    for (let i = 0; i < allVehicles.length; i++) {
      for (let j = i + 1; j < allVehicles.length; j++) {
        this.colliders.push(
          this.physics.add.collider(allVehicles[i].sprite, allVehicles[j].sprite, undefined, undefined, this)
        );
      }
    }
    for (const ped of this.pedestrianManager?.pedestrians ?? []) {
      if (!ped.active) continue;
      this.colliders.push(this.physics.add.collider(this.player.sprite, ped.sprite, undefined, undefined, this));
      if (this.player2?.sprite.active) {
        this.colliders.push(this.physics.add.collider(this.player2.sprite, ped.sprite, undefined, undefined, this));
      }
      for (const v of allVehicles) {
        this.colliders.push(this.physics.add.collider(ped.sprite, v.sprite, undefined, undefined, this));
      }
    }
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.cityMap.worldWidth, this.cityMap.worldHeight);
    cam.roundPixels = true;
    if (this.isCoop) {
      cam.setZoom(0.95);
      this.updateCoopCamera();
    } else {
      this.setCameraFollow(this.player.sprite, 1);
    }
  }

  private setCameraFollow(target: Phaser.GameObjects.GameObject, zoom: number): void {
    const cam = this.cameras.main;
    if (this.cameraFollowTarget !== target) {
      cam.stopFollow();
      cam.startFollow(target, true, 0.045, 0.045);
      this.cameraFollowTarget = target;
    }
    if (Math.abs(cam.zoom - zoom) > 0.001) cam.setZoom(zoom);
  }

  private updateSmoothCamera(): void {
    if (this.player.inVehicle && this.player.currentVehicle) {
      this.setCameraFollow(this.player.currentVehicle.sprite, 0.9);
    } else {
      this.setCameraFollow(this.player.sprite, 1);
    }
  }

  private updateNPCs(dt: number, speedMul = 1): void {
    const pos = this.player.getPosition();
    const npcDt = dt * speedMul;
    for (const npc of this.npcs) {
      if (!npc.active) continue;
      if (npc.role === 'gang' && npc.gang) {
        const inTerritory = this.cityMap.getGangAt(npc.sprite.x, npc.sprite.y) === npc.gang;
        const hostile = this.gangManager.shouldGangAttack(npc.gang, inTerritory);
        npc.hostile = hostile;
        const dist = Phaser.Math.Distance.Between(pos.x, pos.y, npc.sprite.x, npc.sprite.y);
        if (hostile && dist < 220) {
          this.steerNPCAlongPath(npc, npcDt, pos, 110);
          npc.tryMeleeAttack({
            x: pos.x,
            y: pos.y,
            takeDamage: (n) => this.player.takeDamage(n),
            inVehicle: this.player.inVehicle,
          });
        } else {
          npc.pathFollower.clear();
          npc.update(npcDt, pos);
        }
      } else {
        npc.update(npcDt, pos);
      }
    }
    for (const npc of this.dynamicEvents.getEventNpcs()) {
      if (!npc.active) continue;
      npc.hostile = true;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, npc.sprite.x, npc.sprite.y);
      if (dist < 220) {
        this.steerNPCAlongPath(npc, npcDt, pos, 105);
      } else {
        npc.pathFollower.clear();
        npc.update(npcDt, pos);
      }
    }
    if (this.questManager.escortNPC?.active) {
      const escort = this.questManager.escortNPC;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, escort.sprite.x, escort.sprite.y);
      if (dist > 80) {
        this.steerNPCAlongPath(escort, npcDt, pos, 95);
      } else {
        escort.pathFollower.clear();
        escort.update(npcDt, pos);
      }
    }
  }

  private steerNPCAlongPath(
    npc: NPC,
    dt: number,
    targetPos: { x: number; y: number },
    speed: number
  ): void {
    steerNPCAlongPath(npc, dt, targetPos, speed, this.cityMap.navigation, (n, d, t, c) =>
      n.update(d, t, c)
    );
  }

  private getAllNPCs(): NPC[] {
    return [
      ...this.npcs,
      ...this.dynamicEvents.getEventNpcs(),
      ...this.policeManager.policeNPCs,
      ...this.blockpostManager.cops,
      ...(this.questManager.targetNPC ? [this.questManager.targetNPC] : []),
      ...(this.questManager.escortNPC ? [this.questManager.escortNPC] : []),
    ];
  }

  private toggleFullMap(): void {
    if (this.fullMap.isVisible()) {
      this.fullMap.hide();
      return;
    }
    const pos = this.player.getPosition();
    this.fullMap.show({
      playerX: pos.x,
      playerY: pos.y,
      wantedLevel: this.state.wantedLevel,
    });
  }

  private resetSceneUI(): void {
    this.dialogBox.hide();
    this.fullMap?.hide();
  }

  private resetWorldEntities(): void {
    for (const c of this.colliders) c.destroy();
    this.colliders = [];
    this.player2 = null;
    this.coopInput = null;
    this.pedestrianManager?.destroy();
    this.npcs = [];
    for (const g of this.questGivers) g.die();
    this.questGivers = [];
    for (const label of this.questGiverLabels) label.destroy();
    this.questGiverLabels = [];
    for (const c of this.shopClerks) c.die();
    this.shopClerks = [];
    for (const label of this.shopClerkLabels) label.destroy();
    this.shopClerkLabels = [];
    this.payphones = [];
    this.shopSprites = [];
    for (const m of this.shopInteriorMarkers) m.destroy();
    for (const m of this.shopDoorMarkers) m.destroy();
    for (const m of this.questOfficeDoorMarkers) m.destroy();
    for (const m of this.homeDoorMarkers) m.destroy();
    this.shopInteriorMarkers = [];
    this.shopDoorMarkers = [];
    this.questOfficeDoorMarkers = [];
    this.homeDoorMarkers = [];
    this.stairMarkers = [];
    this.districtFlags = [];
    this.landmarkSprites = [];
    this.roadLayer?.destroy();
    this.roadLayer = null;
    this.trafficLights?.destroy();
    this.trafficLights = null;
    this.laneNavigation = null;
    this.transitionMarkers = [];
    for (const rp of this.remotePlayers.values()) rp.destroy();
    this.remotePlayers.clear();
  }

  private setupOnline(): void {
    this.network = NetworkManager.getActive();
    if (!this.network?.session) return;
    this.network.onMessage(this.onNetworkMessage);
    const pos = this.player.getPosition();
    for (const p of this.network.getPlayers()) {
      if (p.id === this.network.session.playerId) continue;
      this.ensureRemotePlayer(p.id, p.name, pos.x + 32, pos.y);
    }
    this.showMessage(`Онлайн кооп · комната ${this.network.session.room}`);
  }

  private updateOnline(dt: number): void {
    if (!this.isOnline || !this.network) return;

    for (const rp of this.remotePlayers.values()) {
      rp.update(dt, this.cityMap.mapId);
    }

    this.networkSyncTimer -= dt;
    if (this.networkSyncTimer > 0) return;
    this.networkSyncTimer = 0.1;
    const pos = this.player.getPosition();
    this.network.sendState(
      pos.x,
      pos.y,
      this.player.facingAngle,
      this.player.getHealth(),
      this.cityMap.mapId
    );
  }

  private handleNetworkMessage(msg: ServerMessage): void {
    if (msg.type === 'state') {
      const info = this.network?.getPlayers().find((p) => p.id === msg.playerId);
      const rp = this.ensureRemotePlayer(
        msg.playerId,
        info?.name ?? 'Игрок',
        msg.x,
        msg.y
      );
      rp.setState(msg.x, msg.y, msg.angle, msg.health, msg.mapId);
      return;
    }
    if (msg.type === 'player_joined') {
      const pos = this.player.getPosition();
      this.ensureRemotePlayer(msg.player.id, msg.player.name, pos.x + 48, pos.y);
      this.showMessage(`${msg.player.name} вошёл в игру`);
      return;
    }
    if (msg.type === 'player_left') {
      const rp = this.remotePlayers.get(msg.playerId);
      rp?.destroy();
      this.remotePlayers.delete(msg.playerId);
    }
    if (msg.type === 'chat') {
      this.showMessage(`${msg.name}: ${msg.text}`);
    }
  }

  private ensureRemotePlayer(id: string, name: string, x: number, y: number): RemotePlayer {
    let rp = this.remotePlayers.get(id);
    if (!rp) {
      rp = new RemotePlayer(this, name, x, y);
      this.remotePlayers.set(id, rp);
    }
    return rp;
  }

  private handleShutdown = (): void => {
    getAudio(this).stopEngine();
    this.dynamicEvents?.cleanup();
    this.cityMap?.destroy();
    this.atmosphere?.destroy();
    this.tireMarks?.clear();
    this.mobileControls?.destroy();
    this.mobileControls = null;
    this.garageManager?.destroy();
    this.network?.offMessage(this.onNetworkMessage);
    this.resetSceneUI();
    this.resetWorldEntities();
  };

  private handleVehicleDestroyed = (): void => {
    this.questManager.onVehicleDestroyed();
  };

  private ensureSceneRunning(): void {
    if (this.sys.isPaused()) {
      this.sys.resume();
    }
    if (this.scene.isPaused('GameScene')) {
      this.scene.resume('GameScene');
    }
  }

  private pauseGame(): void {
    if (this.scene.isActive('PauseScene')) return;
    getAudio(this).stopEngine();
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  private gameOver(): void {
    const state = this.syncState();
    const stats = RunStats.recordRun(state, this.playTimeSeconds, false);
    const board = LeaderboardManager.addEntry(state, this.playTimeSeconds, false);
    if (this.isOnline) this.network?.disconnect();
    SaveManager.clear();
    this.scene.start('GameOverScene', {
      state,
      playTimeSeconds: this.playTimeSeconds,
      runStats: stats,
      leaderboardRank: board.rank,
      isNewBest: board.isNewBest,
    });
  }

  private victory(): void {
    const state = this.syncState();
    AchievementManager.evaluate(state, true);
    const meta = MetaProgress.onVictory();
    const stats = RunStats.recordRun(state, this.playTimeSeconds, true);
    const board = LeaderboardManager.addEntry(state, this.playTimeSeconds, true);
    this.scene.start('VictoryScene', {
      state,
      playTimeSeconds: this.playTimeSeconds,
      runStats: stats,
      meta,
      leaderboardRank: board.rank,
      isNewBest: board.isNewBest,
    });
  }

  private getNearestTransition(px: number, py: number): MapTransitionConfig | null {
    for (const tr of this.cityMap.transitions) {
      const tx = tr.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = tr.y * TILE_SIZE + TILE_SIZE / 2;
      if (Phaser.Math.Distance.Between(px, py, tx, ty) < 40) return tr;
    }
    return null;
  }

  private syncState(): GameState {
    const pos = this.player.getPosition();
    this.state.playerX = pos.x;
    this.state.playerY = pos.y;
    this.state.currentMapId = this.cityMap.mapId;
    this.state.questSnapshot = this.questManager.captureSnapshot();
    return this.state;
  }

  private showTutorialDialog(lines: string[], onDone?: () => void): void {
    const flat = lines.flatMap((line) =>
      line.split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
    );
    if (flat.length === 0) {
      onDone?.();
      return;
    }
    this.dialogBox.showSequence(
      this,
      flat.map((text) => ({ speaker: 'Обучение', text })),
      onDone
    );
  }

  private showMessage(text: string): void {
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#c8f542',
        backgroundColor: '#0d0d14',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300);
    this.time.delayedCall(1500, () => msg.destroy());
  }
}