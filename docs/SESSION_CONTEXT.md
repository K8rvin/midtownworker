# Контекст проекта для новых сессий

Документ для быстрого входа в проект без чтения всей истории чата.  
Обновляйте при крупных изменениях архитектуры или геймплея.

---

## Что это

**«Работяга из мидтауна»** — браузерный life-sim на Phaser 3 + TypeScript.  
Игрок живёт в городе: снимает жильё, покупает еду и мебель, устраивается на работу, выполняет сюжетные задачи.

- **Репозиторий:** https://github.com/K8rvin/midtownworker  
- **Онлайн (GitHub Pages):** https://k8rvin.github.io/midtownworker/  
- **Локальный путь:** `C:\Projects\Grok_test\gta2-game`  
- **Карта:** 200×200 тайлов, `TILE_SIZE = 32`

---

## Режим игры

В `src/config.ts`:

```ts
export const LIFE_SIM = true;
```

При `LIFE_SIM = true`:
- Нет боёв, банд, полиции, квестов GTA-режима
- Главное меню: Новая игра / Продолжить / Настройки
- Крыши и лестницы **отключены** (механика боевого режима)
- Освещение и плотность трафика/пешеходов привязаны к **игровым часам**
- Старт новой игры: `LifeSimStart.ts` — день 1, **9:00**, $85, голод/сон занижены

При `LIFE_SIM = false` — полный GTA2-режим (квесты, оружие, крыши, полиция).

---

## Стек и команды

| Команда | Назначение |
|---------|------------|
| `npm install` | Зависимости |
| `npm run dev` | Dev-сервер http://localhost:5173 |
| `npm run build` | `tsc` + Vite (перед сборкой генерирует карту) |
| `npm run test:unit` | Набор node-тестов в `tests/` |
| `npm test` | UI + audio + unit |

**Зависимости:** Phaser 3.80, Vite 5, TypeScript 5.  
**Карта:** `scripts/generate-tiled-map.mjs` → `public/maps/city.tmj`, `port.tmj`

---

## Структура кода

```
src/
  config.ts              # LIFE_SIM, GameState, константы
  main.ts                # Phaser game bootstrap
  scenes/
    MainMenuScene.ts     # Меню, настройки (MenuTheme — прокрутка)
    PreloadScene.ts
    GameScene.ts         # Основной геймплей (~2600 строк)
    HomeScene.ts         # Интерьер дома, мебель, сон
    SettingsScene.ts
  systems/               # Менеджеры логики
  entities/              # Player, Vehicle, Pedestrian, NPC
  world/                 # CityMap, карта, навигация, полосы
  ui/                    # HUD, диалоги, магазины, миникарта
  data/                  # JSON-конфиги (магазины, работы, квесты)
  graphics/              # Спрайты, атмосфера
tests/                   # Фазовые unit-тесты (phase15-life-sim.test.mjs и др.)
docs/
  ROADMAP.md             # План развития
  SESSION_CONTEXT.md     # Этот файл
```

### Ключевые системы (life-sim)

| Система | Файл | Роль |
|---------|------|------|
| Время | `TimeManager.ts` | Часы/дни, ~7.5 с реального времени = 1 игровой час |
| Свет и трафик | `TimeOfDayManager.ts` | Фаза дня, `getTrafficCountForHour`, `getPedestrianCountForHour` |
| Нужды | `NeedsManager.ts` | Голод, сон, алкоголь; голод блокирует спринт |
| Жильё | `HousingManager.ts` | Аренда, мебель |
| Магазины | `ShopManager.ts`, `GroceryManager.ts`, `LifeShopUI.ts` | Вход/покупки |
| Работа | `JobManager.ts`, `CourierManager.ts` | Одна работа; курьер — доставки |
| Сюжет | `LifeSimStoryManager.ts`, `life-sim-story.json` | Обучение, маркеры |
| Сохранения | `SaveManager.ts` | localStorage |
| Взаимодействие | `InteractResolver.ts` | Приоритеты [E]: лестницы > клерк > дверь… |
| Трафик | `TrafficManager.ts`, `LaneNavigation.ts` | Машины по полосам, без коллизий трафик↔трафик |
| Пешеходы | `PedestrianManager.ts` | Спавн рядом с игроком по времени суток |

---

## Сюжет обучения (порядок)

1. Снять квартиру (залог $115)  
2. Купить кровать ($120) в мебельном → поставить дома → поспать  
3. Купить еду в супермаркете  
4. Устроиться на работу (телефон / ноутбук / офис занятости)

Обучение: `showTutorialDialog` + `DialogBox` (не toast).  
Маркер кровати переключается: мебельный → дверь дома (`getBedSleepStep`).

---

## Важные координаты (city map)

### Супермаркет «Уголок» (`shops.json` → `grocery_1`)

| Параметр | Значение |
|----------|----------|
| Дверь | **106, 109** |
| Интерьер | 105–107 × 107–108 (3×2 внутри здания) |
| Кассир | 106, 107 |
| Проход к двери | тайл 106,108 (коридор) |

Работа «Продавец» (`jobs.json` → `cashier`) использует **ту же дверь** 106, 109.

### Другие точки

- **Мебельный «Дом»:** дверь 118, 119; интерьер 117–119 × 117–118  
- **Офис занятости:** дверь 95, 111  
- **Склад курьера:** дверь 132, 72  
- **Старт новой игры:** тайл ~80, 82  

### Магазины — как устроены

- Здание 3×3: `placeShopBuildings` — `bx = doorX-1`, `by = doorY-2`
- `applyBuildingInteriors` вырезает интерьер + дверь + **коридор** от зала до двери
- `CityMap.shopPassableTiles` — проходимые тайлы (без коллизии стен)
- Вход: `ShopManager.isNearShopDoor` — соседний тайл к двери или дистанция < 52px
- Внутри: `GameScene.enforceShopInteriorBounds` — нельзя выйти сквозь стены, только через дверь
- `enterShop` / `exitShop` в `GameScene.ts`

---

## Городская активность (трафик / NPC)

`GameScene.applyCityActivity()`:
- При смене часа и каждые ~40 с (refresh) подтягивает машин/пешеходов **рядом с игроком**
- Плотность зависит от часа (`TimeOfDayManager.ts`)

Плотность (примерно):
- Ночь: 4 машины, 12 пешеходов  
- Утро/вечер пик: 16–18 машин, 44–48 пешеходов  
- День: 12 машин, 36 пешеходов  

Машины трафика **не сталкиваются друг с другом** (иначе пробки). Едут по `LaneNavigation`.

---

## Данные (JSON)

| Файл | Содержимое |
|------|------------|
| `shops.json` | Магазины (grocery, furniture, weapon) |
| `jobs.json` | Работы (courier, developer, cashier, waiter, killer) |
| `homes.json` | Квартиры для аренды |
| `groceries.json` | Еда и алкоголь |
| `life-sim-story.json` | Главы сюжета |
| `employment-office.json` | Офис занятости |
| `city-layout.json` | Дороги, районы, пешеходы |
| `courier-pickups.json` | Точки забора посылок |

---

## Навигация курьера

- `CourierManager.getWaypoint()` — куда вести стрелку  
- `WaypointArrow.ts` — стрелка на экране  
- Маркеры на карте и миникарте  
- HUD: текст «следуйте за стрелкой» (без координат)

---

## UI / UX заметки

- Камера: `setCameraFollow` с lerp **0.045** (плавное следование)
- Меню: компактная карточка; настройки с прокруткой (`MenuTheme.createMenuScrollArea`)
- Эффекты нужд: `NeedsEffectsOverlay` — сонливость, алкоголь
- Штраф $50 за обморок **убран**
- Диалоги: `DialogBox.ts`

---

## Тестирование

- Unit-тесты не требуют браузера — `npm run test:unit`
- Life-sim: `tests/phase15-life-sim.test.mjs`
- Магазины/крыши: `tests/roof-shop.test.mjs`
- Browser-тесты: Playwright (`npm run test:browser`)

После изменений в `shops.json`, `MapDataGenerator.ts` — нужен `npm run build` (регенерация `city.tmj`).

---

## Недавние коммиты (март–июль 2026)

```
9bbe7ef Магазины: дверь по тайлам, коридор, стены; крыши off в life-sim
f14994f Трафик по полосам, пешеходы ходят
d6ae353 Освещение и трафик по игровому времени
ff133b4 Вход в супермаркет: радиус двери, координаты кассира
cb19d65 Обучение: диалог + динамический маркер кровати
43d88be Плавная камера, квест кровати, эффекты нужд, алкоголь
```

---

## Частые проблемы и где искать

| Симптом | Вероятная причина | Где смотреть |
|---------|-------------------|--------------|
| Дверь магазина не открывается | Неверный layout / радиус / приоритет interact | `ShopManager.ts`, `shops.json`, `collectInteractCandidates` |
| Выход сквозь стены магазина | Интерьер вне здания или нет clamp | `enforceShopInteriorBounds`, `interiorY` в `shops.json` |
| Пустые улицы | Мало спавна / уехали далеко | `applyCityActivity`, `TrafficManager` |
| Слишком темно | Час + AtmosphereOverlay | `TimeOfDayManager`, `AtmosphereOverlay`, `state.hour` |
| Машины стоят | Коллизии трафик↔трафик | `GameScene.setupCollisions` — должно быть `isTraffic && b.isTraffic` skip |
| Крыши мешают | В life-sim должны быть скрыты | `updateElevationVisuals`, `LIFE_SIM` |

---

## Git

- Ветка: `main`  
- Push в `main` → автодеплой на GitHub Pages  
- Коммиты и push делать из `gta2-game/`

---

## Язык и аудитория

- Интерфейс и тексты — **русский**
- Пользователь (Андрей) общается по-русски
- Агент должен **сам запускать** команды и вносить правки, не только советовать