/**
 * Adds giverId and multi-line dialogues to quests.json
 * Run: node scripts/enrich-quest-dialogues.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'src', 'data', 'quests.json');
const quests = JSON.parse(readFileSync(path, 'utf8'));

const giver = {
  broker: 'npc_broker',
  kenji: 'npc_kenji',
  jake: 'npc_jake',
  chen: 'npc_dr_chen',
};

const meta = {
  quest_delivery: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Эй, наёмник. Есть работа — и она горячая.' },
      { speaker: 'Вексель', text: 'Пакет нужно доставить в район Реднеков. Без вопросов, без вскрытия.' },
      { speaker: 'Вы', text: 'Сколько?' },
      { speaker: 'Вексель', text: 'Семьсот пятьдесят. И не опоздай.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Пакет на месте. Чистая работа.' },
      { speaker: 'Вексель', text: 'Держи плату. Следующий контракт будет посложнее.' },
    ],
  },
  quest_collect: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Помнишь тот пакет? Так вот — их разбросали по центру.' },
      { speaker: 'Вексель', text: 'Собери пять штук за две с половиной минуты.' },
      { speaker: 'Вы', text: 'Кто разбросал?' },
      { speaker: 'Вексель', text: 'Не твоё дело. Беги.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Все пакеты здесь. Отлично.' },
      { speaker: 'Вексель', text: 'Учёные будут довольны. Ну, или нет — мне всё равно.' },
    ],
  },
  quest_clean: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Нужен тихий визит. Дойди до метки в центре.' },
      { speaker: 'Вексель', text: 'Главное — копы не должны тебя знать в лицо.' },
      { speaker: 'Вы', text: 'Розыск обнулить?' },
      { speaker: 'Вексель', text: 'Именно. Иначе контракт сгорит.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Чисто, как и договаривались.' },
      { speaker: 'Вексель', text: 'Таких исполнителей я ценю.' },
    ],
  },
  quest_kill: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Один крыса мешает делам в районе Учёных.' },
      { speaker: 'Вексель', text: 'Устрани цель. Быстро и без свидетелей.' },
      { speaker: 'Вы', text: 'Имя?' },
      { speaker: 'Вексель', text: 'Увидишь на месте. Фиолетовый — не ошибёшься.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Цель ликвидирована. Город стал чище.' },
      { speaker: 'Вексель', text: 'Реднеки заплатят за это уважением. И ты тоже.' },
    ],
  },
  quest_escort: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Наш информатор раскрылся. Его надо вывести в безопасную зону.' },
      { speaker: 'Вексель', text: 'Сопроводи до центра. Если он умрёт — ты платишь.' },
      { speaker: 'Вы', text: 'Понял.' },
      { speaker: 'Вексель', text: 'Не отставай. Он паникует при выстрелах.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Он в безопасности. Хорошая работа.' },
      { speaker: 'Вексель', text: 'Учёные не забудут такой жест.' },
    ],
  },
  quest_bribe: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Коп на перекрёстке ждёт конверт.' },
      { speaker: 'Вексель', text: 'Четыреста долларов. Отнеси тихо, без разговоров.' },
      { speaker: 'Вы', text: 'А если спросит откуда?' },
      { speaker: 'Вексель', text: 'Не спросит. Он профессионал.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Дело улажено. Коп доволен, мы — тоже.' },
      { speaker: 'Вексель', text: 'Так держать город на плаву.' },
    ],
  },
  quest_steal: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Красный спорткар стоит рядом. Красивый, правда?' },
      { speaker: 'Вексель', text: 'Угони и доставь в гараж на карте. Владелец в отпуске.' },
      { speaker: 'Вы', text: 'Надеюсь.' },
      { speaker: 'Вексель', text: 'Якудза хочет эту машину. Не подведи.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Машина на месте. Якудза оценит.' },
      { speaker: 'Вексель', text: 'Ты умеешь водить. Это редкость.' },
    ],
  },
  quest_race: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Гонка на время. Финиш на юго-востоке.' },
      { speaker: 'Вексель', text: 'Пятьдесят секунд. Не больше.' },
      { speaker: 'Вы', text: 'Пешком?' },
      { speaker: 'Вексель', text: 'Бери что угодно. Главное — успеть.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Ты быстрый. Вот приз.' },
      { speaker: 'Вексель', text: 'Учёные следят за такими гонщиками.' },
    ],
  },
  quest_survive: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Зайди в район Якудзы и продержись двадцать секунд.' },
      { speaker: 'Вексель', text: 'Покажи характер. Реднеки любят храбрых дураков.' },
      { speaker: 'Вы', text: 'Это самоубийство.' },
      { speaker: 'Вексель', text: 'Именно поэтому хорошо платят.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Ты вышел живым. Респект.' },
      { speaker: 'Вексель', text: 'Реднеки уже шепчут твоё имя.' },
    ],
  },
  quest_territory: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Три точки Учёных нужно захватить.' },
      { speaker: 'Вексель', text: 'Подойди к каждой метке и закрепи контроль.' },
      { speaker: 'Вы', text: 'Это война.' },
      { speaker: 'Вексель', text: 'Это бизнес. Покажи, кто тут главный.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Территория наша!' },
      { speaker: 'Вексель', text: 'Реднеки получили то, что хотели.' },
    ],
  },
  quest_rampage: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Четверо Реднеков на улице. Слишком много шума.' },
      { speaker: 'Вексель', text: 'Разберись. Якудза заплатит.' },
      { speaker: 'Вы', text: 'Все четверо?' },
      { speaker: 'Вексель', text: 'Все четверо. Без свидетелей.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Реднеки услышали. Хорошая работа.' },
      { speaker: 'Вексель', text: 'Якудза ценит такую прямоту.' },
    ],
  },
  quest_wreck: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Взорви пару тачек. Пусть город дрожит.' },
      { speaker: 'Вексель', text: 'Два автомобиля. Любых. Громко.' },
      { speaker: 'Вы', text: 'Зачем?' },
      { speaker: 'Вексель', text: 'Отвлечение. Не задавай лишних вопросов.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Красивая работа. Салют был виден из порта.' },
      { speaker: 'Вексель', text: 'Реднеки смеются. Это хороший знак.' },
    ],
  },
  quest_escape: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Привлеки внимание копов. Розыск второй уровень.' },
      { speaker: 'Вексель', text: 'Держи его двадцать пять секунд. Потом исчезни.' },
      { speaker: 'Вы', text: 'Погоня?' },
      { speaker: 'Вексель', text: 'Настоящий беглец не спрашивает. Бежит.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Ты настоящий беглец!' },
      { speaker: 'Вексель', text: 'Копы будут помнить этот день.' },
    ],
  },
  quest_purge: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Учёные слишком шумят. Убери троих.' },
      { speaker: 'Вексель', text: 'Их белые халаты — отличная мишень.' },
      { speaker: 'Вы', text: 'Реднеки снова?' },
      { speaker: 'Вексель', text: 'Они платят. Ты стреляешь. Всё просто.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Лаборатория в панике.' },
      { speaker: 'Вексель', text: 'Три тела — хорошая статистика.' },
    ],
  },
  quest_blockpost: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Два блокпоста на перекрёстках. Проскочи с розыском.' },
      { speaker: 'Вексель', text: 'Копы должны тебя видеть. Потом — проехать мимо.' },
      { speaker: 'Вы', text: 'На машине?' },
      { speaker: 'Вексель', text: 'Как хочешь. Главное — два поста.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Копы в ярости. Отлично.' },
      { speaker: 'Вексель', text: 'Ты прошёл основную цепочку. Дальше — выбор банды.' },
    ],
  },
  branch_yakuza_1: {
    giverId: giver.kenji,
    dialogStart: [
      { speaker: 'Кэндзи', text: 'Ты доказал, что умеешь работать. Якудза предлагает путь силы.' },
      { speaker: 'Кэндзи', text: 'Доставь свиток в наш район. Это клятва.' },
      { speaker: 'Вы', text: 'А другие банды?' },
      { speaker: 'Кэндзи', text: 'Выбрав нас, ты закрываешь им двери. Честь превыше сомнений.' },
    ],
    dialogEnd: [
      { speaker: 'Кэндзи', text: 'Честь превыше всего. Добро пожаловать в семью.' },
      { speaker: 'Кэндзи', text: 'Клан примет тебя официально после следующих дел.' },
    ],
  },
  branch_yakuza_2: {
    giverId: giver.kenji,
    dialogStart: [
      { speaker: 'Кэндзи', text: 'Реднеки оскорбили клан. Это кровная обида.' },
      { speaker: 'Кэндзи', text: 'Трое из них должны исчезнуть до заката.' },
      { speaker: 'Вы', text: 'Вендетта?' },
      { speaker: 'Кэндзи', text: 'Вендетта. Без пощады.' },
    ],
    dialogEnd: [
      { speaker: 'Кэндзи', text: 'Кровь смыта. Клан доволен.' },
      { speaker: 'Кэндзи', text: 'Реднеки запомнят этот урок.' },
    ],
  },
  branch_yakuza_3: {
    giverId: giver.kenji,
    dialogStart: [
      { speaker: 'Кэндзи', text: 'Сбор в северном квартале. Шестьсот долларов.' },
      { speaker: 'Кэндзи', text: 'Без лишних глаз. Дань городу.' },
      { speaker: 'Вы', text: 'Кому?' },
      { speaker: 'Кэндзи', text: 'Тем, кто держит улицы в порядке. Нам.' },
    ],
    dialogEnd: [
      { speaker: 'Кэндзи', text: 'Дань принята. Территория расширяется.' },
      { speaker: 'Кэндзи', text: 'Остался финальный удар.' },
    ],
  },
  branch_yakuza_finale: {
    giverId: giver.kenji,
    dialogStart: [
      { speaker: 'Кэндзи', text: 'Финальный удар по Учёным. Три точки — три гвоздя в их гроб.' },
      { speaker: 'Кэндзи', text: 'Захвати их территорию. Город будет наш.' },
      { speaker: 'Вы', text: 'Империя?' },
      { speaker: 'Кэндзи', text: 'Империя. Ты станешь легендой улиц.' },
    ],
    dialogEnd: [
      { speaker: 'Кэндзи', text: 'Империя восстановлена.' },
      { speaker: 'Кэндзи', text: 'Твоё имя будут произносить шёпотом. Навсегда.' },
    ],
  },
  branch_rednecks_1: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Реднеки зовут на гонку. Сорок пять секунд до финиша.' },
      { speaker: 'Джейк', text: 'Покажи, что ты свой. Быстрый и дерзкий.' },
      { speaker: 'Вы', text: 'Приз?' },
      { speaker: 'Джейк', text: 'Уважение. А потом — настоящая работа.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Быстрый и дерзкий — наш человек.' },
      { speaker: 'Джейк', text: 'Добро пожаловать в семью, гонщик.' },
    ],
  },
  branch_rednecks_2: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Взорви три тачки. Пусть город дрожит!' },
      { speaker: 'Джейк', text: 'Нам нужен салют, который услышат на доках.' },
      { speaker: 'Вы', text: 'Три?' },
      { speaker: 'Джейк', text: 'Три. Считай вслух, если помогает.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Красивый салют. Реднеки смеются.' },
      { speaker: 'Джейк', text: 'Так и должно быть в диком западе.' },
    ],
  },
  branch_rednecks_3: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Зайди в логово Якудзы. Двадцать пять секунд — и выйди живым.' },
      { speaker: 'Джейк', text: 'Если умрёшь — мы посмеёмся. Если выживешь — уважение.' },
      { speaker: 'Вы', text: 'Справедливо.' },
      { speaker: 'Джейк', text: 'Дикий запад не для слабаков.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Ты прошёл через ад. Респект.' },
      { speaker: 'Джейк', text: 'Остался последний шаг.' },
    ],
  },
  branch_rednecks_finale: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Учёные мешают бизнесу. Пятеро — и город наш.' },
      { speaker: 'Джейк', text: 'Никакой пощады. Это финал.' },
      { speaker: 'Вы', text: 'Пять тел?' },
      { speaker: 'Джейк', text: 'Пять. Дикий запад победил науку.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Дикий запад победил. Город твой.' },
      { speaker: 'Джейк', text: 'Поднимем тост на доках. Ты герой.' },
    ],
  },
  branch_scientists_1: {
    giverId: giver.chen,
    dialogStart: [
      { speaker: 'Доктор Чен', text: 'Учёные ищут образцы. Четыре пакета за две минуты.' },
      { speaker: 'Доктор Чен', text: 'Собери — и мы поговорим о будущем.' },
      { speaker: 'Вы', text: 'Что внутри?' },
      { speaker: 'Доктор Чен', text: 'Знания. Опасные и дорогие.' },
    ],
    dialogEnd: [
      { speaker: 'Доктор Чен', text: 'Образцы целы. Наука благодарна.' },
      { speaker: 'Доктор Чен', text: 'Ты понимаешь ценность данных. Редкое качество.' },
    ],
  },
  branch_scientists_2: {
    giverId: giver.chen,
    dialogStart: [
      { speaker: 'Доктор Чен', text: 'Лаборатория на юге. Доберись без розыска.' },
      { speaker: 'Доктор Чен', text: 'Копы не должны знать о нашем эксперименте.' },
      { speaker: 'Вы', text: 'Тихо?' },
      { speaker: 'Доктор Чен', text: 'Тихо. Как хирургический разрез.' },
    ],
    dialogEnd: [
      { speaker: 'Доктор Чен', text: 'Чистый вход. Эксперимент продолжается.' },
      { speaker: 'Доктор Чен', text: 'Ещё один шаг — и данные в безопасности.' },
    ],
  },
  branch_scientists_3: {
    giverId: giver.chen,
    dialogStart: [
      { speaker: 'Доктор Чен', text: 'Проводи нашего учёного до убежища.' },
      { speaker: 'Доктор Чен', text: 'Данные на нём бесценны. Не дай ему погибнуть.' },
      { speaker: 'Вы', text: 'Он вооружён?' },
      { speaker: 'Доктор Чен', text: 'Он вооружён знаниями. Этого достаточно.' },
    ],
    dialogEnd: [
      { speaker: 'Доктор Чен', text: 'Данные в безопасности.' },
      { speaker: 'Доктор Чен', text: 'Новый мир ближе, чем кажется.' },
    ],
  },
  quest_race_circuit: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Думаешь, умеешь водить? Кольцо вокруг центра — шестьдесят пять секунд.' },
      { speaker: 'Джейк', text: 'Четыре чекпоинта по часовой. Пропустишь один — всё зря.' },
      { speaker: 'Вы', text: 'Машина?' },
      { speaker: 'Джейк', text: 'Бросаю рядом. Не подведи.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Чистое кольцо! Реднеки одобряют.' },
      { speaker: 'Джейк', text: 'Есть ещё трассы — если не сдуешься.' },
    ],
  },
  quest_race_port_sprint: {
    giverId: 'npc_docks',
    dialogStart: [
      { speaker: 'Старый Моряк', text: 'На доках скучно. Устроим спринт — три буя по пирсу.' },
      { speaker: 'Старый Моряк', text: 'Тридцать пять секунд. Только на колёсах.' },
      { speaker: 'Вы', text: 'Приз стоит поездки в порт?' },
      { speaker: 'Старый Моряк', text: 'Девятьсот и уважение докеров. Гони.' },
    ],
    dialogEnd: [
      { speaker: 'Старый Моряк', text: 'Быстрый катер на колёсах!' },
      { speaker: 'Старый Моряк', text: 'Порт запомнит твоё имя.' },
    ],
  },
  quest_race_highway: {
    giverId: giver.broker,
    dialogStart: [
      { speaker: 'Вексель', text: 'Трасса через весь город. Запад — восток, четыре отсечки.' },
      { speaker: 'Вексель', text: 'Пятьдесят пять секунд. Якудза следит за результатом.' },
      { speaker: 'Вы', text: 'Копы?' },
      { speaker: 'Вексель', text: 'Если нагонят — это твои проблемы. Гони.' },
    ],
    dialogEnd: [
      { speaker: 'Вексель', text: 'Трасса пройдена. Чистый заезд.' },
      { speaker: 'Вексель', text: 'Якудза любит быстрых курьеров.' },
    ],
  },
  quest_race_nitro: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Финальный тест. Спорткар, сорок секунд, юго-восток.' },
      { speaker: 'Джейк', text: 'Полный газ. Без тормозов на поворотах.' },
      { speaker: 'Вы', text: 'А если разобью?' },
      { speaker: 'Джейк', text: 'Тогда пешком домой. Стартуй.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Вот это скорость! Настоящий гонщик.' },
      { speaker: 'Джейк', text: 'Реднеки ставят на тебя в следующих делах.' },
    ],
  },
  branch_rednecks_race2: {
    giverId: giver.jake,
    dialogStart: [
      { speaker: 'Джейк', text: 'Первый заезд — разминка. Теперь окраина — три чекпоинта.' },
      { speaker: 'Джейк', text: 'Пятьдесят секунд. Покажи, что семья не ошиблась.' },
      { speaker: 'Вы', text: 'Дальше что?' },
      { speaker: 'Джейк', text: 'Выживешь — поговорим о настоящей работе.' },
    ],
    dialogEnd: [
      { speaker: 'Джейк', text: 'Окраина твоя. Отличный заезд.' },
      { speaker: 'Джейк', text: 'Теперь займёмся делом посерьёзнее.' },
    ],
  },
  branch_scientists_finale: {
    giverId: giver.chen,
    dialogStart: [
      { speaker: 'Доктор Чен', text: 'Отвлеки копов. Третий уровень розыска — тридцать секунд.' },
      { speaker: 'Доктор Чен', text: 'Нам нужен хаос. Ты — катализатор.' },
      { speaker: 'Вы', text: 'Риск?' },
      { speaker: 'Доктор Чен', text: 'Прогресс всегда рискует. Ты — его архитектор.' },
    ],
    dialogEnd: [
      { speaker: 'Доктор Чен', text: 'Новый мир начинается.' },
      { speaker: 'Доктор Чен', text: 'Ты изменил город. Наука не забудет.' },
    ],
  },
};

for (const q of quests) {
  const m = meta[q.id];
  if (!m) throw new Error(`Missing dialogue meta for ${q.id}`);
  q.giverId = m.giverId;
  q.dialogStart = m.dialogStart;
  q.dialogEnd = m.dialogEnd;
}

writeFileSync(path, JSON.stringify(quests, null, 2) + '\n', 'utf8');
console.log(`Enriched ${quests.length} quests with giverId and dialogues`);