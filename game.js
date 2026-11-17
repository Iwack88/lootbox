const $ = id => document.getElementById(id);
const ATTRS = {
  hp:    { name: 'Leben',    icon: '❤️' },
  melee: { name: 'Nahkampf', icon: '⚔️' },
  magic: { name: 'Magie',    icon: '🔮' },
  armor: { name: 'Rüstung',  icon: '🛡️' },
};

// Alle Items belegen einen Slot; stärkere Varianten kosten mehr Gold.
const ITEM_RARITIES = {
  common: { label: 'Gewöhnlich' },
  rare: { label: 'Selten' },
  epic: { label: 'Episch' },
  legendary: { label: 'Legendär' },
};
const ITEMS = [
  { id: 'pot1',   name: 'Kleiner Heiltrank', icon: '🧪', stats: { hp: 10 },    rarity: 'common', cost: 5, level: 1 },
  { id: 'pot2',   name: 'Heiltrank',         icon: '🧪', stats: { hp: 25 },    rarity: 'common', cost: 18, level: 2 },
  { id: 'pot3',   name: 'Großer Heiltrank',  icon: '🍶', stats: { hp: 50 },    rarity: 'common', cost: 45, level: 4 },
  { id: 'dag',    name: 'Kurzschwert',       icon: '🗡️', stats: { melee: 8 },  rarity: 'common', cost: 6, level: 1 },
  { id: 'sword',  name: 'Schwert',           icon: '⚔️', stats: { melee: 15 }, rarity: 'common', cost: 20, level: 2 },
  { id: 'shield', name: 'Holzschild',        icon: '🛡️', stats: { armor: 10 }, rarity: 'common', cost: 8, level: 1 },
  { id: 'plate',  name: 'Plattenrüstung',    icon: '🥋', stats: { armor: 30 }, rarity: 'common', cost: 40, level: 4 },
  { id: 'wand',   name: 'Zauberstab',        icon: '🪄', stats: { magic: 15 }, rarity: 'common', cost: 10, level: 1 },
  { id: 'righteousShield', name: 'Schild der Rechtschaffenheit', icon: '🔰', stats: { armor: 20, magic: 10 }, rarity: 'rare', cost: 38, level: 3 },
  { id: 'runeblade', name: 'Runenklinge', icon: '🗡️', stats: { melee: 12, magic: 10 }, rarity: 'rare', cost: 34, level: 3 },
  { id: 'guardianAmulet', name: 'Amulett des Wächters', icon: '📿', stats: { hp: 20, armor: 10 }, rarity: 'rare', cost: 30, level: 4 },
  { id: 'lifebloomStaff', name: 'Stab der Lebensblüte', icon: '🌿', stats: { magic: 20, hp: 15 }, rarity: 'rare', cost: 40, level: 5 },
  { id: 'bandage', name: 'Verband', icon: '🩹', stats: { hp: 6 }, rarity: 'common', cost: 2, level: 1 },
  { id: 'ironSword', name: 'Eisenschwert', icon: '⚔️', stats: { melee: 10 }, rarity: 'common', cost: 9, level: 2 },
  { id: 'buckler', name: 'Faustschild', icon: '🛡️', stats: { armor: 4 }, rarity: 'common', cost: 2, level: 2 },
  { id: 'leatherCap', name: 'Lederkappe', icon: '🪖', stats: { armor: 3 }, rarity: 'common', cost: 1, level: 1 },
  { id: 'sparkStone', name: 'Funkenstein', icon: '💎', stats: { magic: 7 }, rarity: 'common', cost: 3, level: 1 },
  { id: 'battleAxe', name: 'Streitaxt', icon: '🪓', stats: { melee: 18 }, rarity: 'common', cost: 24, level: 3 },
  { id: 'steelShield', name: 'Stahlschild', icon: '🛡️', stats: { armor: 14 }, rarity: 'common', cost: 14, level: 3 },
  { id: 'restorationDraught', name: 'Regenerationstrank', icon: '⚗️', stats: { hp: 37 }, rarity: 'common', cost: 29, level: 3 },
  { id: 'runeFocus', name: 'Runenfokus', icon: '🔮', stats: { magic: 27 }, rarity: 'common', cost: 25, level: 4 },
  { id: 'emberCharm', name: 'Glutamulett', icon: '🔥', stats: { magic: 11, armor: 5 }, rarity: 'rare', cost: 22, level: 4 },
  { id: 'warhammer', name: 'Kriegshammer', icon: '🔨', stats: { melee: 32 }, rarity: 'common', cost: 42, level: 5 },
  { id: 'vampiricDagger', name: 'Vampirdolch', icon: '🗡️', stats: { melee: 9, hp: 7 }, rarity: 'rare', cost: 19, level: 5 },
];

function statsText(stats) {
  return Object.entries(stats).map(([attr, value]) =>
    `${ATTRS[attr].icon} ${ATTRS[attr].name}: ${value > 0 ? '+' : ''}${value}`
  ).join(' · ');
}

function itemNameHtml(item) {
  return `<span class="item-name item-rarity-${item.rarity}">${item.name}</span>`;
}

function itemDetailsHtml(item) {
  return `<span class="item-rarity">${ITEM_RARITIES[item.rarity].label}</span> · ${statsText(item.stats)} · 1 Slot`;
}

const BOXES = [
  { id: 'small',  name: 'Kleine Kiste',   icon: '📦', slots: 3, level: 1, modifiers: {} },
  { id: 'medium', name: 'Mittlere Kiste', icon: '🧰', slots: 5, level: 3, modifiers: {} },
  { id: 'magic',  name: 'Magie-Kiste',    icon: '🔮', slots: 3, level: 4, modifiers: { magic: 5, melee: -10 } },
];

const NEED_WEIGHT = { 3: 3, 2: 2, 1: 1 };
const PRIO_LABEL = { 3: 'sehr wichtig', 2: 'wichtig', 1: 'gering' };

const NAMES = ['Willi', 'Luna', 'Finn', 'Gero', 'Ida', 'Morwen', 'Brom', 'Selma', 'Thok', 'Pip', 'Konrad', 'Jax', 'Mara', 'Olaf', 'Elda', 'Rurik', 'Nia', 'Tarn', 'Hilde', 'Kael'];

const CLASSES = [
  { cls: 'Krieger',       icon: '🪓',   needs: [ { attr: 'hp', prio: 3, target: 50 }, { attr: 'melee', prio: 2, target: 20 }, { attr: 'armor', prio: 3, target: 20 } ] },
  { cls: 'Magier',        icon: '🧙',   needs: [ { attr: 'magic', prio: 3, target: 30 }, { attr: 'hp', prio: 2, target: 25 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Schurke',       icon: '🥷',   needs: [ { attr: 'melee', prio: 3, target: 28 }, { attr: 'hp', prio: 2, target: 20 } ] },
  { cls: 'Paladin',       icon: '🛡️',   needs: [ { attr: 'armor', prio: 3, target: 40 }, { attr: 'hp', prio: 3, target: 35 }, { attr: 'melee', prio: 1, target: 10 } ] },
  { cls: 'Bogenschütze',  icon: '🏹',   needs: [ { attr: 'melee', prio: 3, target: 24 }, { attr: 'armor', prio: 2, target: 14 }, { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Hexer',         icon: '🧛',   needs: [ { attr: 'magic', prio: 3, target: 45 }, { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Zwerg',         icon: '⛏️',   needs: [ { attr: 'armor', prio: 3, target: 30 }, { attr: 'melee', prio: 2, target: 20 } ] },
  { cls: 'Heiler',        icon: '🌿',   needs: [ { attr: 'hp', prio: 3, target: 60 }, { attr: 'magic', prio: 2, target: 15 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Barbar',        icon: '💪',   needs: [ { attr: 'melee', prio: 3, target: 40 }, { attr: 'hp', prio: 2, target: 35 } ] },
  { cls: 'Novize',        icon: '📚',   needs: [ { attr: 'magic', prio: 2, target: 15 }, { attr: 'hp', prio: 2, target: 10 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Ritter',        icon: '🐴',   needs: [ { attr: 'armor', prio: 3, target: 30 }, { attr: 'melee', prio: 3, target: 20 }, { attr: 'hp', prio: 2, target: 25 } ] },
  { cls: 'Gaukler',       icon: '🎭',   needs: [ { attr: 'hp', prio: 2, target: 20 }, { attr: 'magic', prio: 1, target: 15 } ] },
];

const WANNABE_CLASSES = [
  { cls: 'Lehrling',       icon: '🧑‍🎓', needs: [ { attr: 'magic', prio: 2, target: 15 } ] },
  { cls: 'Page',           icon: '🛡️',   needs: [ { attr: 'hp', prio: 1, target: 10 }, { attr: 'armor', prio: 2, target: 10 } ] },
  { cls: 'Laufbursche',    icon: '🏃',   needs: [ { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Kräutersammler', icon: '🌿',   needs: [ { attr: 'hp', prio: 2, target: 15 }, { attr: 'magic', prio: 1, target: 10 } ] },
  { cls: 'Glücksritter',   icon: '🍀',   needs: [ { attr: 'melee', prio: 2, target: 15 }, { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Reisender',      icon: '🎒',   needs: [ { attr: 'armor', prio: 1, target: 10 } ] },
];

const HERO_CLASSES = [
  { cls: 'Drachenjäger', icon: '🐉', needs: [ { attr: 'melee', prio: 3, target: 45 }, { attr: 'hp', prio: 3, target: 50 }, { attr: 'armor', prio: 2, target: 30 } ] },
  { cls: 'Erzmagier',    icon: '🔮', needs: [ { attr: 'magic', prio: 3, target: 60 }, { attr: 'hp', prio: 2, target: 40 }, { attr: 'armor', prio: 1, target: 20 } ] },
  { cls: 'Champion',     icon: '🏆', needs: [ { attr: 'melee', prio: 3, target: 40 }, { attr: 'armor', prio: 3, target: 35 }, { attr: 'hp', prio: 2, target: 40 } ] },
  { cls: 'Phönixritter', icon: '🔥', needs: [ { attr: 'hp', prio: 3, target: 50 }, { attr: 'magic', prio: 3, target: 35 }, { attr: 'armor', prio: 2, target: 30 } ] },
];

const DEMIGOD_CLASSES = [
  { cls: 'Sturmherr',       icon: '🌩️', needs: [ { attr: 'magic', prio: 3, target: 100 }, { attr: 'armor', prio: 3, target: 70 }, { attr: 'hp', prio: 3, target: 80 } ] },
  { cls: 'Weltenwächterin', icon: '🌌', needs: [ { attr: 'hp', prio: 3, target: 110 }, { attr: 'melee', prio: 3, target: 75 }, { attr: 'armor', prio: 3, target: 80 } ] },
  { cls: 'Sonnengott',      icon: '☀️', needs: [ { attr: 'magic', prio: 3, target: 120 }, { attr: 'hp', prio: 3, target: 90 }, { attr: 'melee', prio: 2, target: 60 } ] },
];

// Belohnungsfaktor je Seltenheit.
const RARITY = {
  common: { label: 'Gewöhnlich', mult: 1 },
  rare:   { label: 'Selten',     mult: 2 },
  epic:   { label: 'Episch',     mult: 4 },
};
const CUSTOMER_PLACES = [
  { level: 1, count: 4 },
  { level: 3, count: 5 },
  { level: 6, count: 6 },
];
const SPAWN_INTERVAL = 30 * 60;
const MERCHANT_INTERVAL = 5;
// Händler vorerst aus dem Spielablauf genommen; Code für eine spätere Rückkehr erhalten.
const MERCHANT_ENABLED = false;
const RESTOCK_COST = 20;
const RESTOCK_SIZE = 3;
const RESTOCK_IDS = ['pot1', 'dag', 'shield', 'wand'];
const SHOP_BASE_IDS = ['bandage', 'dag', 'leatherCap', 'sparkStone'];
const SHOP_SLOT_INTERVAL = 5;
const shopPrice = item => Math.ceil(item.cost * 1.25);
const ORDER_DURATION = 30 * 60 * 1000;
const ORDER_SLOTS = [{ level: 1, count: 2 }, { level: 5, count: 3 }, { level: 10, count: 4 }];
const ORDER_QUANTITIES = [{ level: 1, count: 5 }, { level: 7, count: 10 }];
const ORDER_CATALOG = [
  ...SHOP_BASE_IDS.map(item => ({ item, level: 1 })),
  { item: 'pot1', level: 4 }, { item: 'shield', level: 5 }, { item: 'wand', level: 6 },
  { item: 'ironSword', level: 8 }, { item: 'steelShield', level: 10 },
];
const MATERIALS = {
  wood: { name: 'Holz', icon: '🪵' },
  iron: { name: 'Eisen', icon: '⛓️' },
  cloth: { name: 'Stoff', icon: '🧵' },
};
const WORKSHOP_LEVEL = 3;
const WORKSHOP_SLOTS = [{ level: 3, count: 1 }, { level: 6, count: 2 }, { level: 10, count: 3 }];
const RECIPES = [
  { item: 'bandage', level: 3, materials: { cloth: 2 }, minutes: 15 },
  { item: 'buckler', level: 3, materials: { wood: 2, iron: 1 }, minutes: 20 },
  { item: 'ironSword', level: 4, materials: { wood: 1, iron: 2 }, minutes: 25 },
  { item: 'sparkStone', level: 5, materials: { wood: 1, cloth: 2 }, minutes: 30 },
];
const CUSTOMER_TIERS = [
  { id: 'wannabe', label: 'Wannabe', level: 1, points: 1, weight: 50, scale: 0.6, rarity: 'common',
    reward: { quality: 0.5, ids: ['pot1', 'dag', 'shield', 'wand', 'bandage', 'ironSword', 'buckler', 'leatherCap', 'sparkStone'] } },
  { id: 'adventurer', label: 'Abenteurer', level: 2, points: 2, weight: 32, scale: 1, rarity: 'common',
    reward: { quality: 0.7, ids: ['pot2', 'sword', 'battleAxe', 'steelShield', 'restorationDraught', 'runeFocus', 'emberCharm', 'vampiricDagger'] } },
  { id: 'hero', label: 'Held', level: 5, points: 3, weight: 15, scale: 1.2, rarity: 'rare',
    reward: { quality: 0.85, ids: ['plate', 'righteousShield', 'runeblade', 'lifebloomStaff', 'warhammer'] } },
  { id: 'demigod', label: 'Demi-Gott', level: 7, points: 4, weight: 3, scale: 1.5, rarity: 'epic',
    reward: { quality: 1, ids: ['pot3'] } },
];
const CUSTOMER_CLASSES = { wannabe: WANNABE_CLASSES, adventurer: CLASSES, hero: HERO_CLASSES, demigod: DEMIGOD_CLASSES };
const CHECKPOINTS = [
  { points: 10, icon: '🎁', title: '3 Basisitems', description: 'Drei zufällige Basisitems kommen sofort in dein Inventar.', package: 'basic' },
  { points: 15, icon: '🏷️', title: '10 % Rabatt', description: MERCHANT_ENABLED ? '10 % Rabatt während des gesamten nächsten Händlerbesuchs.' : '10 % Rabatt auf eine Bestellung, auch auf mehrere Stück desselben Items.', discount: 10 },
  { points: 20, icon: '🎁', title: '3 bessere Items', description: 'Drei zufällige Items der höchsten bereits freigeschalteten Item-Stufe kommen sofort in dein Inventar.', package: 'best' },
  { points: 25, icon: '🏷️', title: '15 % Rabatt', description: MERCHANT_ENABLED ? '15 % Rabatt während eines weiteren Händlerbesuchs. Vorgemerkte Rabatte werden nacheinander genutzt, nicht addiert.' : '15 % Rabatt auf eine weitere Bestellung. Rabatte werden nacheinander genutzt, nicht addiert.', discount: 15 },
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const expForLevel = level => 50 * level * (level - 1);

function progression(totalExp = state.exp) {
  let level = 1;
  while (totalExp >= expForLevel(level + 1)) level++;
  return { level, current: totalExp - expForLevel(level), required: level * 100 };
}

const isUnlocked = entry => progression().level >= entry.level;

const queueCapacity = () => CUSTOMER_PLACES.filter(isUnlocked).at(-1).count;
const workshopCapacity = (level = progression().level) => WORKSHOP_SLOTS.filter(entry => entry.level <= level).at(-1)?.count || 0;
const craftDuration = (recipe, level = progression().level) => recipe.minutes * 60 * 1000 * (level >= 7 ? 0.8 : 1);
const orderCapacity = (level = progression().level) => ORDER_SLOTS.filter(entry => entry.level <= level).at(-1).count;
const orderQuantityLimit = (level = progression().level) => ORDER_QUANTITIES.filter(entry => entry.level <= level).at(-1).count;
const canOrder = (item, level = progression().level) => item.level <= level && ORDER_CATALOG.some(entry => entry.item === item.id && entry.level <= level);
const orderDiscount = () => CHECKPOINTS.find(entry => entry.points === state.pendingDiscounts[0])?.discount || 0;
const orderPrice = (item, quantity) => Math.ceil(shopPrice(item) * quantity * (100 - orderDiscount()) / 100);

const shopCapacity = (level = progression().level) => SHOP_BASE_IDS.length + Math.floor(level / SHOP_SLOT_INTERVAL);

function rollShopOffers() {
  const pool = ITEMS.filter(item => isUnlocked(item) && !SHOP_BASE_IDS.includes(item.id));
  const offers = [...SHOP_BASE_IDS];
  // Auch bei sehr vielen Plätzen bleibt mindestens ein wechselndes Item außerhalb des Shops.
  const limit = Math.min(shopCapacity(), offers.length + Math.max(0, pool.length - 1));
  while (offers.length < limit) {
    const index = Math.floor(Math.random() * pool.length);
    offers.push(pool.splice(index, 1)[0].id);
  }
  return offers;
}

const shopItems = () => ITEMS.filter(item => state.shopOffers.includes(item.id) && isUnlocked(item));

function unlocksAtLevel(level) {
  return [
    ...ITEMS.filter(item => item.level === level).map(item => `Item: ${item.icon} ${itemNameHtml(item)} (${ITEM_RARITIES[item.rarity].label} · ${statsText(item.stats)})`),
    ...BOXES.filter(box => box.level === level).map(box => `Kiste: ${box.icon} ${box.name} (${box.slots} Items · ${boxEffectsText(box)})`),
    ...CUSTOMER_TIERS.filter(tier => tier.level === level).map(tier => `Kunden: ${tier.label}`),
    ...CUSTOMER_PLACES.filter(places => places.level === level).map(places => `${places.count} Kundenplätze`),
    ...WORKSHOP_SLOTS.filter(entry => entry.level === level).map(entry => `Werkstatt: ${entry.count} Herstellungs${entry.count === 1 ? 'platz' : 'plätze'}`),
    ...RECIPES.filter(recipe => recipe.level === level).map(recipe => {
      const item = ITEMS.find(entry => entry.id === recipe.item);
      return `Rezept: ${item.icon} ${item.name}`;
    }),
    ...(level === 7 ? ['Werkstatt: 20 % schnellere neue Herstellungsaufträge'] : []),
    ...(MERCHANT_ENABLED && level === 1 ? ['Shop: 4 feste Basis-Angebote – Verband, Kurzschwert, Lederkappe und Funkenstein'] : []),
    ...(MERCHANT_ENABLED && level % SHOP_SLOT_INTERVAL === 0 ? [`Shop: +1 zufälliger Angebotsplatz (${shopCapacity(level)} Plätze insgesamt) ab dem nächsten Händlerbesuch`] : []),
    ...(!MERCHANT_ENABLED ? ORDER_SLOTS.filter(entry => entry.level === level).map(entry => `Bestellungen: ${entry.count} parallele Plätze`) : []),
    ...(!MERCHANT_ENABLED ? ORDER_QUANTITIES.filter(entry => entry.level === level).map(entry => `Bestellmenge: bis zu ${entry.count} Stück pro Bestellung`) : []),
    ...(!MERCHANT_ENABLED ? ORDER_CATALOG.filter(entry => entry.level === level).map(entry => `Bestellbar: ${ITEMS.find(item => item.id === entry.item).name}`) : []),
  ];
}

function renderRoadmap() {
  const { level } = progression();
  const lastMilestone = Math.max(10, (Math.floor(level / SHOP_SLOT_INTERVAL) + 1) * SHOP_SLOT_INTERVAL,
    ...[...ITEMS, ...BOXES, ...CUSTOMER_TIERS, ...CUSTOMER_PLACES].map(entry => entry.level));
  $('roadmap').innerHTML = Array.from({ length: lastMilestone }, (_, i) => {
    const milestone = i + 1;
    return `<section class="milestone ${milestone <= level ? 'unlocked' : 'locked'}">
      <h3>Level ${milestone} · ${milestone <= level ? 'Freigeschaltet' : 'Gesperrt'}${milestone === level ? ' · Aktuell' : ''}</h3>
      <small>${expForLevel(milestone)} Gesamt-EXP${milestone > 1 ? ` · ${100 * (milestone - 1)} EXP ab Level ${milestone - 1}` : ''}</small>
      <ul>${unlocksAtLevel(milestone).map(unlock => `<li>${unlock}</li>`).join('')}</ul>
    </section>`;
  }).join('') + (MERCHANT_ENABLED
    ? '<p class="hint">Item-Freischaltungen erweitern den möglichen Angebots- und Belohnungspool, nicht automatisch dein Inventar oder das Shop-Sortiment. Vier schwächste Basis-Items sind immer im Shop. Alle fünf Level kommt ein zufälliger Angebotsplatz dazu. Die Auswahl wird pro Händlerbesuch neu gezogen und bleibt während des Besuchs gleich. Auch nach Level 10 gibt es alle fünf Level einen weiteren Platz. Wenn der Itempool zu klein ist, bleiben Plätze leer: Mindestens ein wechselndes Item bleibt immer außerhalb des Sortiments.</p>'
    : '<p class="hint">Item-Freischaltungen und bestellbare Itemtypen sind getrennt. Nicht jedes Item kann bestellt werden; Belohnungen und Werkstatt bleiben wichtig. Eine Bestellung belegt einen Platz für einen Itemtyp, unabhängig von der Menge. Jede Lieferung dauert 30 Minuten und landet automatisch im Inventar, auch offline. Der Händler ist vorerst deaktiviert.</p>');
}

let nextId = 1;
function rollCustomerTier() {
  const available = CUSTOMER_TIERS.filter(isUnlocked);
  let value = Math.random() * available.reduce((sum, tier) => sum + tier.weight, 0);
  for (const tier of available) {
    value -= tier.weight;
    if (value < 0) return tier;
  }
  return CUSTOMER_TIERS[0];
}
function rollMaterialReward() { return Math.random() < 0.35; }

// Ganzzahlige Zielwerte schwanken um ±20%, damit gleiche Klassen nicht identisch sind.
function generateCustomer() {
  const tier = rollCustomerTier();
  const rarity = tier.rarity;
  const base = pick(CUSTOMER_CLASSES[tier.id]);
  const needs = base.needs.map(n => ({ ...n, target: Math.max(5, Math.round(n.target * tier.scale * (0.8 + Math.random() * 0.4))) }));
  const item = pick(ITEMS.filter(item => tier.reward.ids.includes(item.id) && isUnlocked(item)));
  const itemReward = rollMaterialReward()
    ? { quality: tier.reward.quality, material: { id: pick(Object.keys(MATERIALS)), amount: CUSTOMER_TIERS.indexOf(tier) + 2 } }
    : { quality: tier.reward.quality, item };
  return { id: nextId++, name: pick(NAMES), cls: base.cls, icon: base.icon, needs, rarity, tier: tier.id, tierLabel: tier.label, itemReward };
}

const state = {
  gold: 500, exp: 0, inventory: Object.fromEntries(RESTOCK_IDS.map(id => [id, 5])), cart: {}, boxType: null, box: [], active: null, queue: [], spawnT: SPAWN_INTERVAL,
  shopping: false, shopOffers: [], completed: 0, debt: 0, showingResult: false,
  streak: 0, claimedCheckpoints: [], pendingDiscounts: [], activeDiscount: null,
  materials: { wood: 0, iron: 0, cloth: 0 }, crafts: [],
  orders: [],
};

const SAVE_KEY = 'lootboxPacker.save';
const SAVE_VERSION = 3;
let lastUpdatedAt = Date.now();
let savingBlocked = false;
let storageError = '';

function showSaveStatus(message, error = false) {
  for (const id of ['saveStatus', 'orderSaveStatus', 'shopSaveStatus', 'workshopSaveStatus', 'supplySaveStatus']) {
    if ($(id).textContent !== message) $(id).textContent = message;
    $(id).classList.toggle('error', error);
  }
}

function storageFailure(message, error) {
  if (storageError !== message) console.error(message, error);
  storageError = message;
  showSaveStatus(message, true);
}

function savedCustomer(customer) {
  if (!customer) return null;
  return { id: customer.id, name: customer.name, cls: customer.cls, tier: customer.tier,
    needs: customer.needs, ...(customer.itemReward.item
      ? { rewardItem: customer.itemReward.item.id }
      : { rewardMaterial: customer.itemReward.material }) };
}

function saveGame() {
  if (savingBlocked) return;
  try {
    // Auszahlungen bleiben gespeichert; die kurzlebige Ergebnisanzeige wird beim Laden übersprungen.
    const savedState = { ...state, boxType: state.boxType?.id || null, box: state.box.map(item => item.id),
      active: savedCustomer(state.active), queue: state.queue.map(savedCustomer), showingResult: false };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: lastUpdatedAt, state: savedState }));
    storageError = '';
    showSaveStatus('Automatisch lokal gespeichert · nur in diesem Browser.');
  } catch (error) {
    storageFailure('Speichern fehlgeschlagen. Lass diese Sitzung offen und erlaube lokalen Browser-Speicher.', error);
  }
}

function decodeSave(data) {
  const require = condition => { if (!condition) throw new Error('Ungültiger oder inkompatibler Spielstand.'); };
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const count = value => Number.isSafeInteger(value) && value >= 0;
  require(record(data) && [1, 2, SAVE_VERSION].includes(data.version) && count(data.savedAt) && record(data.state));
  const saved = data.state;
  for (const key of ['gold', 'exp', 'debt', 'streak', 'completed']) require(count(saved[key]));
  require(saved.completed < MERCHANT_INTERVAL && typeof saved.shopping === 'boolean');
  require(Number.isFinite(saved.spawnT) && saved.spawnT >= 0 && saved.spawnT <= SPAWN_INTERVAL);
  const level = progression(saved.exp).level;
  const itemFor = id => {
    const item = ITEMS.find(item => item.id === id && item.level <= level);
    require(!!item);
    return item;
  };
  const itemCounts = value => {
    require(record(value));
    return Object.fromEntries(Object.entries(value).map(([id, quantity]) => {
      itemFor(id);
      require(count(quantity));
      return [id, quantity];
    }));
  };
  const customerFor = value => {
    require(record(value) && Number.isSafeInteger(value.id) && value.id > 0 && NAMES.includes(value.name));
    const tier = CUSTOMER_TIERS.find(tier => tier.id === value.tier && tier.level <= level);
    require(!!tier);
    const base = CUSTOMER_CLASSES[tier.id].find(base => base.cls === value.cls);
    require(!!base && Array.isArray(value.needs) && value.needs.length > 0 && value.needs.length <= 3);
    const needs = value.needs.map(need => {
      require(record(need) && Object.hasOwn(ATTRS, need.attr) && [1, 2, 3].includes(need.prio) && count(need.target) && need.target > 0);
      return { attr: need.attr, prio: need.prio, target: need.target };
    });
    require(new Set(needs.map(need => need.attr)).size === needs.length);
    let itemReward;
    if (value.rewardItem !== undefined) {
      require(value.rewardMaterial === undefined && tier.reward.ids.includes(value.rewardItem));
      itemReward = { quality: tier.reward.quality, item: itemFor(value.rewardItem) };
    } else {
      require(record(value.rewardMaterial) && Object.hasOwn(MATERIALS, value.rewardMaterial.id)
        && value.rewardMaterial.amount === CUSTOMER_TIERS.indexOf(tier) + 2);
      itemReward = { quality: tier.reward.quality, material: { id: value.rewardMaterial.id, amount: value.rewardMaterial.amount } };
    }
    return { id: value.id, name: value.name, cls: base.cls, icon: base.icon, tier: tier.id, tierLabel: tier.label,
      rarity: tier.rarity, needs, itemReward };
  };
  require(Array.isArray(saved.queue) && Array.isArray(saved.box) && Array.isArray(saved.shopOffers));
  const queue = saved.queue.map(customerFor);
  const active = saved.active === null ? null : customerFor(saved.active);
  const customers = [...queue, ...(active ? [active] : [])];
  require(customers.length <= CUSTOMER_PLACES.filter(entry => entry.level <= level).at(-1).count);
  require(new Set(customers.map(customer => customer.id)).size === customers.length);
  const boxType = saved.boxType === null ? null : BOXES.find(box => box.id === saved.boxType && box.level <= level);
  require(boxType !== undefined && (!boxType || active));
  const box = saved.box.map(itemFor);
  require(box.length <= (boxType?.slots || 0));
  const inventory = itemCounts(saved.inventory);
  const cart = itemCounts(saved.cart);
  const shopOffers = saved.shopOffers.map(id => itemFor(id).id);
  require(new Set(shopOffers).size === shopOffers.length && shopOffers.length <= shopCapacity(level));
  require(Object.keys(cart).every(id => shopOffers.includes(id)));
  if (saved.shopping) require(!active && SHOP_BASE_IDS.every(id => shopOffers.includes(id)));
  else require(shopOffers.length === 0 && Object.keys(cart).length === 0 && saved.activeDiscount === null);
  const checkpointList = (value, discountsOnly = false) => {
    require(Array.isArray(value) && new Set(value).size === value.length);
    require(value.every(points => CHECKPOINTS.some(entry => entry.points === points && (!discountsOnly || entry.discount))));
    return [...value];
  };
  const claimedCheckpoints = checkpointList(saved.claimedCheckpoints);
  const pendingDiscounts = checkpointList(saved.pendingDiscounts, true);
  require(pendingDiscounts.every(points => claimedCheckpoints.includes(points)));
  const activeDiscount = saved.activeDiscount;
  require(activeDiscount === null || (saved.shopping && claimedCheckpoints.includes(activeDiscount) &&
    CHECKPOINTS.some(entry => entry.points === activeDiscount && entry.discount) && !pendingDiscounts.includes(activeDiscount)));
  const materials = data.version === 1 ? { wood: 0, iron: 0, cloth: 0 } : saved.materials;
  require(record(materials) && Object.keys(materials).length === Object.keys(MATERIALS).length
    && Object.keys(MATERIALS).every(id => Object.hasOwn(materials, id) && count(materials[id])));
  const crafts = data.version === 1 ? [] : saved.crafts;
  require(Array.isArray(crafts) && crafts.length <= workshopCapacity(level));
  require(crafts.every(craft => record(craft) && RECIPES.some(recipe => recipe.item === craft.item && recipe.level <= level)
    && count(craft.finishAt)));
  const orders = data.version < 3 ? [] : saved.orders;
  require(Array.isArray(orders) && orders.length <= orderCapacity(level));
  require(orders.every(order => record(order) && canOrder(itemFor(order.item), level)
    && count(order.quantity) && order.quantity > 0 && order.quantity <= orderQuantityLimit(level) && count(order.finishAt)));
  return { gold: saved.gold, exp: saved.exp, debt: saved.debt, streak: saved.streak, completed: saved.completed,
    spawnT: saved.spawnT, shopping: saved.shopping, showingResult: false, inventory, cart, boxType, box, active, queue,
    shopOffers, claimedCheckpoints, pendingDiscounts, activeDiscount, materials: { ...materials }, crafts: crafts.map(craft => ({ ...craft })),
    orders: orders.map(order => ({ item: order.item, quantity: order.quantity, finishAt: order.finishAt })) };
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return false;
    const data = JSON.parse(raw);
    const restored = decodeSave(data);
    if (!MERCHANT_ENABLED) {
      if (restored.activeDiscount !== null) restored.pendingDiscounts.unshift(restored.activeDiscount);
      restored.activeDiscount = null;
      restored.shopping = false;
      restored.shopOffers = [];
      restored.cart = {};
      restored.completed = 0;
    }
    Object.assign(state, restored);
    nextId = Math.max(0, ...state.queue.map(customer => customer.id), state.active?.id || 0) + 1;
    lastUpdatedAt = data.savedAt;
    syncTime();
    return true;
  } catch (error) {
    savingBlocked = true;
    storageFailure('Spielstand nicht geladen. Vorhandene Daten bleiben unverändert; diese Sitzung wird nicht gespeichert.', error);
    return false;
  }
}

function syncTime(now = Date.now()) {
  const elapsed = Math.max(0, now - lastUpdatedAt) / 1000;
  lastUpdatedAt = Math.max(now, lastUpdatedAt);
  const delivered = state.orders.filter(order => order.finishAt <= lastUpdatedAt);
  for (const order of delivered) state.inventory[order.item] = (state.inventory[order.item] || 0) + order.quantity;
  state.orders = state.orders.filter(order => order.finishAt > lastUpdatedAt);
  if (delivered.length) {
    $('supplyMessage').classList.remove('error');
    $('supplyMessage').textContent = `Angekommen: ${delivered.map(order => `${order.quantity}× ${ITEMS.find(item => item.id === order.item).name}`).join(', ')}.`;
    renderInventory();
  }
  tick(elapsed);
}

function changeStreak(points) {
  state.streak = Math.max(0, state.streak + points);
  const bonuses = [];
  if (points <= 0) return bonuses;
  for (const checkpoint of CHECKPOINTS) {
    if (state.streak < checkpoint.points || state.claimedCheckpoints.includes(checkpoint.points)) continue;
    state.claimedCheckpoints.push(checkpoint.points);
    if (checkpoint.discount) {
      state.pendingDiscounts.push(checkpoint.points);
      bonuses.push(`Checkpunkt ${checkpoint.points}: ${checkpoint.title} vorgemerkt.`);
    } else {
      const itemLevel = checkpoint.package === 'basic' ? 1 : Math.max(...ITEMS.filter(isUnlocked).map(item => item.level));
      const pool = ITEMS.filter(item => item.level === itemLevel);
      const items = Array.from({ length: 3 }, () => pick(pool));
      for (const item of items) state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
      bonuses.push(`Checkpunkt ${checkpoint.points}: ${items.map(item => `${item.icon} ${itemNameHtml(item)}`).join(', ')} erhalten.`);
    }
  }
  return bonuses;
}

function checkpointStatus(checkpoint) {
  if (!MERCHANT_ENABLED) {
    if (state.pendingDiscounts.includes(checkpoint.points)) return 'Für eine kommende Bestellung vorgemerkt';
    if (state.claimedCheckpoints.includes(checkpoint.points)) return checkpoint.discount ? 'Für eine Bestellung verwendet' : 'Erhalten';
    return 'Noch nicht erreicht';
  }
  if (state.activeDiscount === checkpoint.points) return 'Für diesen Händlerbesuch aktiv';
  if (state.pendingDiscounts.includes(checkpoint.points)) return 'Für kommenden Händlerbesuch vorgemerkt';
  if (state.claimedCheckpoints.includes(checkpoint.points)) return checkpoint.discount ? 'Händlerbesuch beendet' : 'Erhalten';
  return 'Noch nicht erreicht';
}

function renderStreak() {
  $('streakPoints').textContent = state.streak;
  $('streakProgress').max = CHECKPOINTS.at(-1).points;
  $('streakProgress').value = Math.min(state.streak, CHECKPOINTS.at(-1).points);
  const next = CHECKPOINTS.find(checkpoint => !state.claimedCheckpoints.includes(checkpoint.points));
  $('streakNext').textContent = next ? `Nächster Bonus bei ${next.points}: ${next.title}` : 'Alle Checkpunkte erhalten – sammle weiter Punkte!';
  $('streakCheckpoints').innerHTML = CHECKPOINTS.map(checkpoint => {
    const claimed = state.claimedCheckpoints.includes(checkpoint.points);
    return `<button class="checkpoint${claimed ? ' claimed' : ''}" style="left:${checkpoint.points / CHECKPOINTS.at(-1).points * 100}%" data-checkpoint="${checkpoint.points}" aria-haspopup="dialog" aria-controls="streakDialog" aria-label="Checkpunkt ${checkpoint.points} Punkte: ${checkpoint.title}. ${checkpointStatus(checkpoint)}">
      <span>${claimed ? '✓' : checkpoint.icon}</span><b>${checkpoint.points}</b>
    </button>`;
  }).join('');
  $('streakCheckpoints').querySelectorAll('[data-checkpoint]').forEach(button => {
    button.onclick = () => openStreak(+button.dataset.checkpoint);
  });
  const active = discountPercent();
  $('streakDiscounts').textContent = [
    active ? `${active} % Rabatt beim aktuellen Händler` : '',
    ...state.pendingDiscounts.map(points => `${CHECKPOINTS.find(checkpoint => checkpoint.points === points).discount} % Rabatt vorgemerkt`),
  ].filter(Boolean).join(' · ');
}

function openStreak(selected = null) {
  $('streakRules').textContent = `Punkte bei erreichter Reward-Schwelle: ${CUSTOMER_TIERS.map(tier => `${tier.label} +${tier.points} (ab ${Math.round(tier.reward.quality * 100)} %)`).join(' · ')}. Schwächere Boxen geben 0 Punkte. Kunden warten unbegrenzt; Abwesenheit kostet keine Serienpunkte.`;
  $('streakRewards').innerHTML = CHECKPOINTS.map(checkpoint => `<section id="checkpoint-${checkpoint.points}" tabindex="-1" class="milestone${state.claimedCheckpoints.includes(checkpoint.points) ? ' unlocked' : ''}${checkpoint.points === selected ? ' selected-checkpoint' : ''}">
    <h3>${checkpoint.icon} ${checkpoint.points} Punkte · ${checkpoint.title}</h3>
    <p>${checkpoint.description}</p><small>${checkpointStatus(checkpoint)}</small>
  </section>`).join('');
  $('streakDialog').showModal();
  if (selected !== null) $(`checkpoint-${selected}`).focus();
}

const capacity = () => state.boxType ? state.boxType.slots : 0;

const usedSlots = () => state.box.length;

function totals() {
  const t = {};
  if (state.boxType) {
    for (const [attr, value] of Object.entries(state.boxType.modifiers)) t[attr] = value;
  }
  for (const it of state.box) {
    for (const [attr, value] of Object.entries(it.stats)) t[attr] = (t[attr] || 0) + value;
  }
  return t;
}

// Erfüllung je Need auf 100% gedeckelt; Gesamtqualität nach Wichtigkeit gewichtet.
function quality() {
  const t = totals();
  let sum = 0, wsum = 0;
  for (const n of state.active.needs) {
    const w = NEED_WEIGHT[n.prio];
    sum += w * Math.min(1, Math.max(0, t[n.attr] || 0) / n.target);
    wsum += w;
  }
  // Rundungsrauschen darf exakt erreichte Reward-Schwellen nicht unterschreiten.
  return Number((sum / wsum).toFixed(12));
}

const qualityPercent = q => Math.floor(Number((q * 100).toFixed(10)));

const rewardFor = (q, c, hasPackedItems = state.box.length > 0) => {
  const m = RARITY[c.rarity].mult;
  const earned = hasPackedItems && q >= c.itemReward.quality;
  const item = earned ? c.itemReward.item || null : null;
  const material = earned ? c.itemReward.material || null : null;
  const points = earned ? CUSTOMER_TIERS.find(tier => tier.id === c.tier).points : 0;
  return { gold: Math.round((10 + q * 30) * m), exp: Math.round((5 + q * 15) * m), item, material, earned, points };
};

function boxEffectsText(box) {
  return statsText(box.modifiers) || 'Neutral';
}

function returnBoxToInventory() {
  for (const it of state.box) {
    state.inventory[it.id] = (state.inventory[it.id] || 0) + 1;
  }
  state.box = [];
}

const cartQuantity = () => Object.values(state.cart).reduce((sum, quantity) => sum + quantity, 0);

const discountPercent = () => CHECKPOINTS.find(checkpoint => checkpoint.points === state.activeDiscount)?.discount || 0;

const cartSubtotal = () => ITEMS.reduce((sum, item) => sum + shopPrice(item) * (state.cart[item.id] || 0), 0);

const cartTotal = () => Math.ceil(cartSubtotal() * (100 - discountPercent()) / 100);

function addToCart(id) {
  if (!MERCHANT_ENABLED) return;
  const it = ITEMS.find(i => i.id === id);
  if (!state.shopping || !it || !shopItems().includes(it)) return;
  const restoreFocus = document.activeElement?.closest('#shop .shop-row')?.querySelector('.add-item')?.dataset.id === id;
  $('checkoutMessage').textContent = '';
  state.cart[id] = (state.cart[id] || 0) + 1;
  sfx.play('cart');
  render();
  if (restoreFocus) {
    const button = $('shop').querySelector(`[data-id="${id}"]`);
    button?.focus();
  }
}

function removeFromCart(id) {
  if (!state.shopping || !state.cart[id]) return;
  $('checkoutMessage').textContent = '';
  state.cart[id]--;
  if (state.cart[id] === 0) delete state.cart[id];
  sfx.play('remove');
  render();
}

function checkout() {
  if (!MERCHANT_ENABLED) return;
  if (!state.shopping || cartQuantity() === 0 || cartTotal() > state.gold) return;
  if (Object.keys(state.cart).some(id => !shopItems().some(item => item.id === id))) {
    $('checkoutMessage').textContent = 'Der Warenkorb enthält gesperrte oder bei diesem Besuch nicht angebotene Items.';
    return;
  }
  const total = cartTotal();
  const purchases = Object.entries(state.cart);
  state.gold -= total;
  for (const [id, quantity] of purchases) {
    state.inventory[id] = (state.inventory[id] || 0) + quantity;
  }
  state.cart = {};
  $('checkoutMessage').textContent = `Einkauf abgeschlossen: ${total} Gold bezahlt.`;
  sfx.play('checkout');
  render();
}

function finishShopping() {
  if (!state.shopping) return;
  if (cartQuantity() > 0 && !confirm('Warenkorb verwerfen und Einkauf beenden?')) return;
  state.cart = {};
  state.shopping = false;
  state.shopOffers = [];
  state.activeDiscount = null;
  $('checkoutMessage').textContent = '';
  sfx.play('select');
  render();
}

function emergencyRestock() {
  if (state.shopping || state.showingResult || (state.debt > 0 && state.gold < RESTOCK_COST)) return;
  const first = pick(RESTOCK_IDS);
  const second = pick(RESTOCK_IDS.filter(id => id !== first));
  const ids = [first, second];
  while (ids.length < RESTOCK_SIZE) ids.push(pick(RESTOCK_IDS));
  const paid = Math.min(state.gold, RESTOCK_COST);
  state.gold -= paid;
  state.debt += RESTOCK_COST - paid;
  for (const id of ids) state.inventory[id] = (state.inventory[id] || 0) + 1;
  $('restockResult').textContent = 'Erhalten: ' + ids.map(id => ITEMS.find(it => it.id === id).name).join(', ');
  $('inventoryCard').open = true;
  sfx.play('checkout');
  render();
}

function packItem(id) {
  const it = ITEMS.find(i => i.id === id);
  if (!it || !isUnlocked(it) || !state.active || !state.boxType || !state.inventory[id] || usedSlots() >= capacity()) return;
  state.inventory[id]--;
  state.box.push(it);
  sfx.play('pack');
  render();
}

function removeFromBox(index) {
  const [it] = state.box.splice(index, 1);
  state.inventory[it.id] = (state.inventory[it.id] || 0) + 1;
  sfx.play('remove');
  render();
}

function selectCustomer(id) {
  if (state.shopping || state.showingResult) return;
  const i = state.queue.findIndex(c => c.id === id);
  if (i < 0) return;
  const chosen = state.queue[i];
  returnBoxToInventory();
  if (state.active) state.queue[i] = state.active;
  else state.queue.splice(i, 1);
  state.active = chosen;
  state.boxType = null;
  sfx.play('select');
  render();
  $('orderTitle').focus();
}

function chooseBox(id) {
  const type = BOXES.find(b => b.id === id);
  if (state.shopping || state.showingResult || !state.active || !type || !isUnlocked(type)) return;
  if (state.boxType === type) return;
  returnBoxToInventory();
  state.boxType = type;
  $('inventoryCard').open = true;
  sfx.play('box');
  render();
  $('orderDialog').scrollTop = 0;
  $('packingTitle').focus();
}

function backToBoxes() {
  if (state.shopping || state.showingResult || !state.active || !state.boxType) return;
  returnBoxToInventory();
  state.boxType = null;
  sfx.play('select');
  render();
  $('orderDialog').scrollTop = 0;
  $('orderTitle').focus();
}

function backToCustomers() {
  if (state.shopping || state.showingResult || !state.active || state.boxType) return;
  state.queue.unshift(state.active);
  state.active = null;
  sfx.play('select');
  render();
  $('queueTitle').focus();
}

function send() {
  if (state.shopping || state.showingResult || !state.active || !state.boxType) return;
  syncTime();
  const q = quality();
  const r = rewardFor(q, state.active);
  const itemRewardResult = r.earned ? itemRewardHtml(state.active, true)
    : `<div>Keine ${state.active.itemReward.item ? 'Item' : 'Rohstoff'}belohnung – benötigt: ${Math.round(state.active.itemReward.quality * 100)} % Erfüllung und mindestens ein eingepacktes Item.</div>`;
  const previousLevel = progression().level;
  const repayment = Math.min(state.debt, r.gold);
  state.debt -= repayment;
  state.gold += r.gold - repayment;
  state.exp += r.exp;
  const newLevel = progression().level;
  const levelUp = newLevel > previousLevel
    ? `<div class="level-up">Levelaufstieg: ${previousLevel} → ${newLevel}!</div>
       <ul class="new-unlocks">${Array.from({ length: newLevel - previousLevel }, (_, i) =>
        unlocksAtLevel(previousLevel + i + 1).map(unlock => `<li>${unlock}</li>`).join('')
       ).join('')}</ul>`
    : '';
  if (r.item) state.inventory[r.item.id] = (state.inventory[r.item.id] || 0) + 1;
  if (r.material) state.materials[r.material.id] += r.material.amount;
  const bonuses = changeStreak(r.points);
  sfx.play(bonuses.length ? 'checkpoint' : newLevel > previousLevel ? 'level' : 'send');
  state.box = [];
  state.boxType = null;
  state.active = null;
  if (MERCHANT_ENABLED) state.completed++;
  state.showingResult = true;
  // Alter Händlerzyklus bleibt für später erhalten.
  if (MERCHANT_ENABLED && state.completed === MERCHANT_INTERVAL) {
    state.completed = 0;
    state.shopping = true;
    state.shopOffers = rollShopOffers();
    state.activeDiscount = state.pendingDiscounts.shift() || null;
  }
  const label = q >= 0.9 ? 'Perfekt!' : q >= 0.6 ? 'Gut' : q >= 0.3 ? 'Geht so' : 'Schlecht';
  $('result').innerHTML = `
    <h1>${label}</h1>
    <div>Erfüllung: ${qualityPercent(q)}%</div>
    <div>💰 +${r.gold} &nbsp; ⭐ +${r.exp}</div>
    <div>Serie: +${r.points} Punkte · Gesamt: ${state.streak}</div>
    ${levelUp}
    ${bonuses.length ? `<ul class="new-unlocks">${bonuses.map(bonus => `<li>${bonus}</li>`).join('')}</ul>` : ''}
    ${repayment ? `<div>Vorschuss-Rückzahlung: −${repayment} Gold · Ausgezahlt: ${r.gold - repayment} Gold</div>` : ''}
    ${itemRewardResult}
    <button class="primary" id="next">${state.shopping ? 'Zum Händler' : 'Weiter'}</button>`;
  render();
  $('result').classList.remove('hidden');
  $('result').scrollTop = 0;
  $('next').focus();
  $('next').onclick = () => {
    state.showingResult = false;
    $('result').classList.add('hidden');
    render();
    if (!state.shopping) $('queueTitle').focus();
    if (state.shopping) sfx.play('merchant');
  };
}

function tick(dt) {
  if (!Number.isFinite(dt) || dt < 0) return;
  let arrived = false;
  state.spawnT -= dt;
  while (state.spawnT <= 0 && state.queue.length + (state.active ? 1 : 0) < queueCapacity()) {
    state.queue.push(generateCustomer());
    state.spawnT += SPAWN_INTERVAL;
    arrived = true;
  }
  if (state.queue.length + (state.active ? 1 : 0) >= queueCapacity()) {
    state.spawnT = SPAWN_INTERVAL;
  }
  if (arrived) {
    if (!document.hidden) sfx.play('arrival');
    renderQueue();
  } else {
    updateArrivalStatus();
  }
}

function needsHtml(c, t) {
  return c.needs.map(n => {
    const have = Math.max(0, t[n.attr] || 0);
    const pct = Math.min(100, have / n.target * 100);
    return `<div class="need">
      <div class="need-head"><span>${ATTRS[n.attr].icon} ${ATTRS[n.attr].name} <span class="prio p${n.prio}">${PRIO_LABEL[n.prio]}</span></span><span>${have}/${n.target}</span></div>
      <div class="bar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

function itemRewardHtml(c, earned = null) {
  const { item, material, quality } = c.itemReward;
  const threshold = Math.round(quality * 100);
  const resource = material && MATERIALS[material.id];
  const description = item
    ? `1 ${item.name} ab ${threshold} % Boxqualität${earned === true ? ' – erreicht' : ''} · ${ITEM_RARITIES[item.rarity].label} · ${statsText(item.stats)}`
    : `${material.amount} ${resource.name} ab ${threshold} % Boxqualität${earned === true ? ' – erreicht' : ''}`;
  return `<span class="reward-offer item-rarity-${item ? item.rarity : 'common'}${earned === true ? ' earned' : ''}" role="img" aria-label="${description}" title="${description}">
    <span class="reward-icon" aria-hidden="true">${item ? item.icon : `${resource.icon} ×${material.amount}`}</span>
    <span>${earned === true ? '✓ ' : ''}${material ? resource.name : 'Reward'}</span>
    <span class="reward-threshold">ab ${threshold} %</span>
  </span>`;
}

function renderQueue() {
  $('queue').innerHTML = state.queue.length ? state.queue.map(c => {
    const needs = c.needs.map(n => `<span class="need-icons">${ATTRS[n.attr].icon.repeat(n.prio)}</span>`).join('');
    const m = RARITY[c.rarity].mult;
    return `<button class="queue-item r-${c.rarity} tier-${c.tier}" data-cid="${c.id}" ${state.shopping || state.showingResult ? 'disabled' : ''}>
      <span class="ico">${c.icon}</span>
      <span class="txt">${c.name} <small>${c.cls} · ${c.tierLabel}</small><span class="needs">${needs}</span></span>
      ${itemRewardHtml(c)}
      <span class="mult">${m > 1 ? '×' + m : ''}</span>
    </button>`;
  }).join('') : '<div class="empty">Gerade keine Kunden…</div>';
  $('queue').querySelectorAll('.queue-item').forEach(el => el.onclick = () => selectCustomer(+el.dataset.cid));
  $('queueInfo').textContent = `${state.queue.length}/${queueCapacity()}${state.active ? ' · 1 in Bearbeitung' : ''}`;
  updateArrivalStatus();
}

function updateArrivalStatus() {
  const full = state.queue.length + (state.active ? 1 : 0) >= queueCapacity();
  const minutes = Math.ceil(state.spawnT / 60);
  $('arrivalStatus').textContent = full
    ? 'Alle Kundenplätze belegt. Neue Ankünfte pausieren, bis du einen Auftrag abschließt.'
    : `Nächster Kunde in ${minutes} Min. · Kunden warten unbegrenzt, auch wenn du das Spiel schließt.`;
}

function render() {
  syncTime();
  const c = state.active;
  renderStreak();
  $('gold').textContent = state.gold;
  $('shopGold').textContent = state.gold;
  const progress = progression();
  $('level').textContent = progress.level;
  $('exp').textContent = `${progress.current}/${progress.required}`;
  $('levelProgress').max = progress.required;
  $('levelProgress').value = progress.current;
  $('merchantPanel').hidden = !MERCHANT_ENABLED;
  $('merchantStatus').textContent = state.shopping ? 'Händler da · Kunden warten unbegrenzt' : `Händler in ${MERCHANT_INTERVAL - state.completed} Aufträgen`;
  $('merchantProgress').value = state.shopping ? MERCHANT_INTERVAL : state.completed;
  $('debtInfo').textContent = state.debt ? `Offener Vorschuss: ${state.debt} Gold` : '';
  $('finishShopping').hidden = !state.shopping;
  $('finishShopping').disabled = state.showingResult;
  $('checkoutTotal').textContent = `${cartTotal()} Gold`;
  const discount = discountPercent();
  $('shopDiscount').textContent = discount
    ? `${discount} % Serienrabatt für diesen gesamten Besuch. Rabatt auf die Warenkorbsumme; Endpreis auf ganze Gold aufgerundet.`
    : 'Kein Serienrabatt für diesen Besuch.';
  $('checkoutDiscount').textContent = discount ? `Serienrabatt: ${discount} % · Ersparnis: ${cartSubtotal() - cartTotal()} Gold` : '';
  $('cartCount').textContent = cartQuantity() ? `(${cartQuantity()})` : '';
  $('checkout').disabled = !state.shopping || cartQuantity() === 0 || cartTotal() > state.gold;
  $('checkoutMessage').textContent ||= '';
  $('checkoutMessage').classList.toggle('error', cartQuantity() > 0 && cartTotal() > state.gold);
  $('checkoutMessage').textContent = cartQuantity() > 0 && cartTotal() > state.gold
    ? `Es fehlen ${cartTotal() - state.gold} Gold. Passe den Warenkorb an.`
    : $('checkoutMessage').textContent;
  $('shopHint').textContent = state.shopping
    ? `${state.shopOffers.length} Angebote: 4 feste Basis-Items und ${Math.max(0, state.shopOffers.length - SHOP_BASE_IDS.length)} zufällige Extras. Nächster Angebotsplatz: Level ${(Math.floor(progress.level / SHOP_SLOT_INTERVAL) + 1) * SHOP_SLOT_INTERVAL}. Auswahl bleibt für diesen Besuch gleich. Händlerpreise: +25 %, auf ganze Gold aufgerundet; Serienrabatt gilt danach. Jeder Kauf landet im Inventar.`
    : 'Der Händler ist vorerst deaktiviert. Nutze Bestellungen im Inventar, die Werkstatt oder den Notfall-Restock.';
  $('restock').disabled = state.shopping || state.showingResult || (state.debt > 0 && state.gold < RESTOCK_COST);
  $('restock').textContent = `Notfall-Restock · ${RESTOCK_COST} Gold`;
  $('restockHint').textContent = `${RESTOCK_SIZE} zufällige Basis-Items: kleiner Heiltrank, Kurzschwert, Holzschild oder Zauberstab. Mindestens zwei Attribute. Fehlendes Gold wird als Vorschuss mit künftigen Goldbelohnungen verrechnet. ${state.debt ? 'Kein weiterer Vorschuss, bis die offene Gebühr bezahlt ist.' : ''}`;

  $('customer').innerHTML = c
    ? `<div class="cust-name r-${c.rarity} tier-${c.tier}">${c.icon} ${c.name} <small>${c.cls} · ${c.tierLabel} · ${RARITY[c.rarity].label}</small></div>` + needsHtml(c, totals()) + itemRewardHtml(c, rewardFor(quality(), c).earned)
    : '<div class="empty">Wähle einen Kunden aus der Liste</div>';
  $('selectionCustomer').innerHTML = c
    ? `<div class="cust-name r-${c.rarity} tier-${c.tier}">${c.icon} ${c.name} <small>${c.cls} · ${c.tierLabel} · ${RARITY[c.rarity].label}</small></div>` + needsHtml(c, {}) + itemRewardHtml(c)
    : '';

  const used = usedSlots();
  $('box').innerHTML = state.box.length
    ? state.box.map((it, i) => `<button class="box-item item-rarity-${it.rarity}" data-i="${i}"><span class="ico">${it.icon}</span><span class="txt">${itemNameHtml(it)}<small>${itemDetailsHtml(it)}</small></span><span class="remove">✕</span></button>`).join('')
    : `<div class="empty">${state.boxType ? 'Leer – packe Items aus deinem Inventar ein' : 'Wähle zuerst eine Box'}</div>`;
  $('box').querySelectorAll('.box-item').forEach(el => el.onclick = () => removeFromBox(+el.dataset.i));
  $('slotInfo').textContent = state.boxType ? `${used}/${capacity()} Items` : '';
  $('boxEffects').textContent = state.boxType ? `Kisteneffekt: ${boxEffectsText(state.boxType)}` : '';
  $('capacityBar').style.width = capacity() ? `${used / capacity() * 100}%` : '0%';
  $('capacityBar').classList.toggle('full', capacity() > 0 && used >= capacity());

  if (c) {
    const q = quality(), r = rewardFor(q, c);
    const itemCost = state.box.reduce((sum, item) => sum + shopPrice(item), 0);
    const repayment = Math.min(state.debt, r.gold);
    const netGold = r.gold - itemCost - repayment;
    $('preview').innerHTML = `Aktuell: ${qualityPercent(q)}% → 💰 ${r.gold}  ⭐ ${r.exp}<br>
      <span class="item-cost">Shopwert: ${itemCost} 💰 (ohne Rabatt; Belohnungsitems sind gratis)</span>
      <span class="net-gold${netGold < 0 ? ' loss' : ''}"> · Gegenwert-Differenz: ${netGold >= 0 ? '+' : ''}${netGold} 💰</span>
      ${repayment ? `<br>Davon Vorschuss-Rückzahlung: ${repayment} Gold (in der Differenz berücksichtigt)` : ''}<br>
      ${itemRewardHtml(c, r.earned)}<div class="streak-preview">+${CUSTOMER_TIERS.find(tier => tier.id === c.tier).points} Serienpunkte bei Reward</div>`;
  } else {
    $('preview').textContent = '';
  }
  $('send').disabled = state.shopping || state.showingResult || !c || !state.boxType;

  const shopRow = it => {
    const inCart = state.cart[it.id] || 0;
    return `<div class="shop-row item-rarity-${it.rarity}">
      <span class="ico">${it.icon}</span>
      <span class="txt">${itemNameHtml(it)}<small>${SHOP_BASE_IDS.includes(it.id) ? 'Festes Basis-Angebot' : 'Zufallsangebot für diesen Besuch'}</small><small>${itemDetailsHtml(it)}</small><small>Im Lager: ${state.inventory[it.id] || 0} · Im Warenkorb: ${inCart}</small></span>
      <span class="cost">💰 ${shopPrice(it)}</span>
      <button class="add-item" data-id="${it.id}" aria-label="${it.name} in den Warenkorb legen">＋</button>
    </div>`;
  };
  $('shop').innerHTML = state.shopping
    ? shopItems().map(shopRow).join('')
    : '<div class="empty">Der Händler ist unterwegs.</div>';
  $('shop').querySelectorAll('.add-item').forEach(el => el.onclick = () => addToCart(el.dataset.id));
  $('cart').innerHTML = cartQuantity()
    ? ITEMS.filter(it => state.cart[it.id] > 0).map(it => `<div class="cart-row item-rarity-${it.rarity}">
        <span class="ico">${it.icon}</span>
        <span class="txt">${itemNameHtml(it)}<small>${itemDetailsHtml(it)}</small><small>Im Lager: ${state.inventory[it.id] || 0} · Im Warenkorb: ${state.cart[it.id]}</small></span>
        <span class="cost">×${state.cart[it.id]}</span>
        <button class="remove-item" data-id="${it.id}" aria-label="${it.name} aus dem Warenkorb entfernen">−</button>
      </div>`).join('')
    : '<div class="empty">Der Warenkorb ist leer.</div>';
  $('cart').querySelectorAll('.remove-item').forEach(el => el.onclick = () => removeFromCart(el.dataset.id));
  const shopDialog = $('shopDialog');
  if (MERCHANT_ENABLED && state.shopping && !state.showingResult && !shopDialog.open) shopDialog.showModal();
  else if ((!state.shopping || state.showingResult) && shopDialog.open) shopDialog.close();
  renderInventory();
  renderPicker();
  renderQueue();
  renderWorkshop();
  renderSupply();
  const orderDialog = $('orderDialog');
  $('boxSelection').hidden = !c || !!state.boxType;
  $('packingView').hidden = !c || !state.boxType;
  orderDialog.setAttribute('aria-labelledby', state.boxType ? 'packingTitle' : 'orderTitle');
  if (c && !state.shopping && !state.showingResult && !orderDialog.open) orderDialog.showModal();
  else if ((!c || state.shopping || state.showingResult) && orderDialog.open) orderDialog.close();
  saveGame();
}

function renderInventory() {
  const count = Object.values(state.inventory).reduce((sum, quantity) => sum + quantity, 0);
  $('inventoryInfo').textContent = `${count} Items`;
  const owned = ITEMS.filter(it => state.inventory[it.id] > 0);
  $('inventory').innerHTML = owned.length
    ? owned.map(it => {
        const off = !isUnlocked(it) || !state.active || !state.boxType || usedSlots() >= capacity();
        return `<button class="shop-item item-rarity-${it.rarity}" data-id="${it.id}" ${off ? 'disabled' : ''}>
          <span class="ico">${it.icon}</span>
          <span class="txt">${itemNameHtml(it)}<small>${itemDetailsHtml(it)} · In Box legen</small></span>
          <span class="cost">×${state.inventory[it.id]}</span>
        </button>`;
      }).join('')
    : `<div class="empty">${state.shopping ? 'Dein Lager ist leer. Kaufe Vorräte im Shop.' : 'Dein Lager ist leer. Bestelle Nachschub im Inventar-Menü oder nutze den Notfall-Restock.'}</div>`;
  $('inventory').querySelectorAll('.shop-item').forEach(el => el.onclick = () => packItem(el.dataset.id));
}

function renderPicker() {
  $('boxPicker').innerHTML = !state.active
    ? '<div class="empty">Wähle zuerst einen Kunden</div>'
    : BOXES.map(b => {
        const locked = !isUnlocked(b);
        const sel = state.boxType && state.boxType.id === b.id;
        return `<button class="pick-item${sel ? ' selected' : ''}" data-bid="${b.id}" ${locked ? 'disabled' : ''}>
          <span class="ico">${b.icon}</span>
          <span class="txt">${b.name}<small>${b.slots} Items · ${boxEffectsText(b)}</small></span>
          <span class="req">${locked ? '🔒 Level ' + b.level : sel ? '✔' : ''}</span>
        </button>`;
      }).join('');
  $('boxPicker').querySelectorAll('.pick-item').forEach(el => el.onclick = () => chooseBox(el.dataset.bid));
  $('pickInfo').textContent = state.boxType ? state.boxType.name : '';
}

function startCraft(id) {
  const recipe = RECIPES.find(entry => entry.item === id);
  if (!recipe || !isUnlocked(recipe) || !workshopCapacity() || state.crafts.length >= workshopCapacity()
    || !Object.entries(recipe.materials).every(([material, amount]) => state.materials[material] >= amount)) return;
  syncTime();
  for (const [material, amount] of Object.entries(recipe.materials)) state.materials[material] -= amount;
  state.crafts.push({ item: recipe.item, finishAt: lastUpdatedAt + craftDuration(recipe) });
  sfx.play('select');
  render();
}

function collectCraft(index) {
  const craft = state.crafts[index];
  if (!craft || Math.max(Date.now(), lastUpdatedAt) < craft.finishAt) return;
  state.inventory[craft.item] = (state.inventory[craft.item] || 0) + 1;
  state.crafts.splice(index, 1);
  sfx.play('checkout');
  render();
}

function renderWorkshop() {
  const level = progression().level;
  const slots = workshopCapacity(level);
  const now = Math.max(Date.now(), lastUpdatedAt);
  const ready = state.crafts.filter(craft => craft.finishAt <= now).length;
  $('openWorkshop').disabled = slots === 0;
  $('workshopSummary').textContent = slots
    ? `${state.crafts.length}/${slots} Plätze belegt${ready ? ` · ${ready} abholbereit` : ''}`
    : `Ab Level ${WORKSHOP_LEVEL} freigeschaltet`;
  const materialsText = Object.entries(MATERIALS)
    .map(([id, material]) => `${material.icon} ${material.name}: ${state.materials[id]}`).join(' · ');
  $('homeMaterials').textContent = materialsText;
  if (!$('workshopDialog').open) return;
  $('workshopMaterials').textContent = materialsText;
  $('craftSlots').innerHTML = Array.from({ length: slots }, (_, i) => {
    const craft = state.crafts[i];
    if (!craft) return `<div class="workshop-row">Platz ${i + 1}: Frei</div>`;
    const item = ITEMS.find(entry => entry.id === craft.item);
    const minutes = Math.ceil(Math.max(0, craft.finishAt - now) / 60000);
    return `<div class="workshop-row"><span>${item.icon} ${item.name}<small>${minutes ? `Noch ${minutes} Min.` : 'Fertig – wartet auf Abholung'}</small></span>
      <button class="secondary collect-craft" data-index="${i}" ${minutes ? 'disabled' : ''}>Abholen</button></div>`;
  }).join('');
  $('craftSlots').querySelectorAll('.collect-craft').forEach(button => button.onclick = () => collectCraft(+button.dataset.index));
  $('recipes').innerHTML = RECIPES.map(recipe => {
    const item = ITEMS.find(entry => entry.id === recipe.item);
    const unlocked = recipe.level <= level;
    const enough = Object.entries(recipe.materials).every(([id, amount]) => state.materials[id] >= amount);
    const costs = Object.entries(recipe.materials).map(([id, amount]) => `${MATERIALS[id].icon} ${amount} ${MATERIALS[id].name}`).join(' · ');
    return `<div class="workshop-row"><span>${item.icon} ${itemNameHtml(item)}<small>${statsText(item.stats)}</small>
      <small>${costs} · ${craftDuration(recipe, level) / 60000} Min.${unlocked ? '' : ` · Ab Level ${recipe.level}`}</small></span>
      <button class="secondary start-craft" data-item="${item.id}" ${!unlocked || !enough || state.crafts.length >= slots ? 'disabled' : ''}>Herstellen</button></div>`;
  }).join('');
  $('recipes').querySelectorAll('.start-craft').forEach(button => button.onclick = () => startCraft(button.dataset.item));
}

function openWorkshop() {
  if (!workshopCapacity() || state.shopping || state.showingResult || state.active) return;
  syncTime();
  $('workshopDialog').showModal();
  renderWorkshop();
}

const orderDrafts = {};

function placeOrder(id, quantity) {
  syncTime();
  const item = ITEMS.find(entry => entry.id === id);
  let error = '';
  if (!item || !canOrder(item)) error = 'Dieses Item ist noch nicht bestellbar.';
  else if (!Number.isInteger(quantity) || quantity < 1 || quantity > orderQuantityLimit()) error = `Wähle eine ganze Menge von 1 bis ${orderQuantityLimit()}.`;
  else if (state.orders.length >= orderCapacity()) error = 'Alle Bestellplätze sind belegt. Warte auf eine Lieferung.';
  else if (state.gold < orderPrice(item, quantity)) error = 'Nicht genug Gold für diese Bestellung.';
  if (error) {
    $('supplyMessage').textContent = error;
    $('supplyMessage').classList.add('error');
    renderSupply();
    return;
  }
  const price = orderPrice(item, quantity);
  const discount = orderDiscount();
  state.gold -= price;
  if (discount) state.pendingDiscounts.shift();
  state.orders.push({ item: id, quantity, finishAt: lastUpdatedAt + ORDER_DURATION });
  $('supplyMessage').classList.remove('error');
  $('supplyMessage').textContent = `${quantity}× ${item.name} für ${price} Gold bestellt${discount ? ` (${discount} % Rabatt)` : ''}. Lieferung in 30 Minuten.`;
  sfx.play('checkout');
  render();
}

function renderDeliveries() {
  $('supplySummary').textContent = `${state.orders.length}/${orderCapacity()} Bestellplätze belegt · bis zu ${orderQuantityLimit()} Stück je Bestellung`;
  $('deliverySlots').innerHTML = Array.from({ length: orderCapacity() }, (_, i) => {
    const order = state.orders[i];
    if (!order) return '<div class="workshop-row">Bestellplatz frei</div>';
    const item = ITEMS.find(entry => entry.id === order.item);
    const minutes = Math.ceil(Math.max(0, order.finishAt - lastUpdatedAt) / 60000);
    return `<div class="workshop-row"><span>${item.icon} ${order.quantity}× ${item.name}<small>Lieferung in ${minutes} Min. · danach automatisch im Inventar</small></span></div>`;
  }).join('');
}

function adjustOrderQuantity(id, delta) {
  const item = ITEMS.find(entry => entry.id === id);
  if (!item || !canOrder(item) || ![-1, 1].includes(delta)) return;
  const quantity = Math.min(orderQuantityLimit(), Math.max(1, (orderDrafts[id] ?? 1) + delta));
  orderDrafts[id] = quantity;
  const controls = $('supplyInventory');
  controls.querySelector(`[data-quantity="${id}"]`).textContent = quantity;
  controls.querySelector(`[data-decrease="${id}"]`).disabled = quantity === 1;
  controls.querySelector(`[data-increase="${id}"]`).disabled = quantity === orderQuantityLimit();
  const button = controls.querySelector(`[data-item="${id}"]`);
  button.textContent = `Bestellen · ${orderPrice(item, quantity)} Gold`;
  button.disabled = state.orders.length >= orderCapacity() || orderPrice(item, quantity) > state.gold;
}

function renderSupply() {
  renderDeliveries();
  if (!$('supplyDialog').open) return;
  $('supplyGold').textContent = state.gold;
  const discount = orderDiscount();
  $('supplyDiscount').textContent = discount
    ? `${discount} % Rabatt auf deine nächste Bestellung (gesamte Menge). Weitere Rabatte folgen einzeln.`
    : 'Kein Bestellrabatt vorgemerkt.';
  const visibleItems = ITEMS.filter(item => !$('hideUnavailable').checked || canOrder(item) || state.inventory[item.id] > 0);
  $('supplyInventory').innerHTML = visibleItems.map(item => {
    const catalog = ORDER_CATALOG.find(entry => entry.item === item.id);
    const available = canOrder(item);
    const quantity = orderDrafts[item.id] ?? 1;
    const price = orderPrice(item, quantity);
    return `<div class="supply-row item-rarity-${item.rarity}">
      <div class="supply-item"><span>${item.icon} ${itemNameHtml(item)}</span><b>Vorrat: ${state.inventory[item.id] || 0}</b></div>
      <small>${itemDetailsHtml(item)}${isUnlocked(item) ? '' : ` · Item ab Level ${item.level}`}</small>
      ${available ? `<div class="supply-controls">
        <div class="quantity-controls" role="group" aria-label="Bestellmenge ${item.name}">
          <button class="secondary" data-decrease="${item.id}" aria-label="${item.name}: Menge verringern" ${quantity === 1 ? 'disabled' : ''}>−</button>
          <output data-quantity="${item.id}" aria-live="polite" aria-label="Menge ${item.name}">${quantity}</output>
          <button class="secondary" data-increase="${item.id}" aria-label="${item.name}: Menge erhöhen" ${quantity === orderQuantityLimit() ? 'disabled' : ''}>+</button>
        </div>
        <button class="secondary order-item" data-item="${item.id}" ${state.orders.length >= orderCapacity() || price > state.gold ? 'disabled' : ''}>Bestellen · ${price} Gold</button></div>`
      : `<small>${catalog ? `Bestellbar ab Level ${catalog.level}` : 'Nicht bestellbar · Kundenbelohnungen oder Werkstatt'}</small>`}
    </div>`;
  }).join('');
  $('supplyInventory').querySelectorAll('[data-decrease]').forEach(button => {
    button.onclick = () => adjustOrderQuantity(button.dataset.decrease, -1);
  });
  $('supplyInventory').querySelectorAll('[data-increase]').forEach(button => {
    button.onclick = () => adjustOrderQuantity(button.dataset.increase, 1);
  });
  $('supplyInventory').querySelectorAll('.order-item').forEach(button => {
    button.onclick = () => placeOrder(button.dataset.item, orderDrafts[button.dataset.item] ?? 1);
  });
}

function openSupply() {
  if (state.showingResult) return;
  syncTime();
  $('supplyDialog').showModal();
  renderSupply();
  saveGame();
}

$('send').onclick = send;
$('openSupply').onclick = openSupply;
$('packingSupply').onclick = openSupply;
$('closeSupply').onclick = () => $('supplyDialog').close();
$('hideUnavailable').checked = true;
$('hideUnavailable').onchange = renderSupply;
$('openWorkshop').onclick = openWorkshop;
$('closeWorkshop').onclick = () => $('workshopDialog').close();
$('backToBoxes').onclick = backToBoxes;
$('backToCustomers').onclick = backToCustomers;
$('orderDialog').addEventListener('cancel', event => {
  event.preventDefault();
  if (state.boxType) backToBoxes(); else backToCustomers();
});
$('finishShopping').onclick = finishShopping;
$('checkout').onclick = checkout;
$('shopDialog').addEventListener('cancel', event => event.preventDefault());
$('restock').onclick = emergencyRestock;
function openRoadmap() {
  renderRoadmap();
  $('roadmapDialog').showModal();
}
$('showRoadmap').onclick = openRoadmap;
$('shopRoadmap').onclick = openRoadmap;
$('closeRoadmap').onclick = () => $('roadmapDialog').close();
$('showStreak').onclick = () => openStreak();
$('shopStreak').onclick = () => openStreak();
$('closeStreak').onclick = () => $('streakDialog').close();
if (!loadGame()) {
  for (let i = 0; i < queueCapacity(); i++) state.queue.push(generateCustomer());
}
render();
document.addEventListener('visibilitychange', () => {
  syncTime();
  renderWorkshop();
  renderSupply();
  saveGame();
});
window.addEventListener('pagehide', () => {
  syncTime();
  saveGame();
});
window.addEventListener('storage', event => {
  if (event.key !== SAVE_KEY && event.key !== null) return;
  savingBlocked = true;
  showSaveStatus('Spielstand in einem anderen Tab geändert. Lade diese Seite neu; dieser Tab speichert nicht mehr.', true);
});
setInterval(() => {
  const ordersBefore = state.orders.length;
  syncTime();
  if (ordersBefore !== state.orders.length) renderSupply(); else renderDeliveries();
  if ($('workshopDialog').open && !document.hidden) {
    const focused = document.activeElement;
    const selector = focused?.classList.contains('start-craft') ? `.start-craft[data-item="${focused.dataset.item}"]`
      : focused?.classList.contains('collect-craft') ? `.collect-craft[data-index="${focused.dataset.index}"]` : null;
    renderWorkshop();
    if (selector) $('workshopDialog').querySelector(selector)?.focus();
  } else {
    renderWorkshop();
  }
  saveGame();
}, 10000);
