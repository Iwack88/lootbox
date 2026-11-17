const $ = id => document.getElementById(id);
// Die frühere Erfolgsserie bleibt deaktiviert erhalten.
const STREAK_ENABLED = false;
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
const CUSTOMER_RECRUIT_COST = 10;
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
const WORKSHOP_LEVEL = STREAK_ENABLED ? 3 : 4;
const WORKSHOP_SPEED_LEVEL = STREAK_ENABLED ? 7 : 14;
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

// Freischaltungen des ursprünglichen Kurzfortschritts auf 25 Level verteilen.
if (!STREAK_ENABLED) {
  for (const item of ITEMS) item.level = ({ 1: 1, 2: 3, 3: 7, 4: 12, 5: 18 })[item.level];
  BOXES.find(box => box.id === 'medium').level = 7;
  BOXES.find(box => box.id === 'magic').level = 12;
  BOXES.push(
    { id: 'large', name: 'Große Kiste', icon: '📦', slots: 6, level: 16, modifiers: {} },
    { id: 'expedition', name: 'Expeditionskiste', icon: '🧰', slots: 8, level: 24, modifiers: {} },
  );
  CUSTOMER_PLACES[1].level = 9;
  CUSTOMER_PLACES[2].level = 19;
  for (const tier of CUSTOMER_TIERS) tier.level = ({ wannabe: 1, adventurer: 5, hero: 18, demigod: 25 })[tier.id];
  for (const entry of WORKSHOP_SLOTS) entry.level = ({ 3: 4, 6: 13, 10: 23 })[entry.level];
  for (const recipe of RECIPES) recipe.level = ({ 3: 4, 4: 9, 5: 14 })[recipe.level];
  for (const entry of ORDER_SLOTS) entry.level = ({ 1: 1, 5: 10, 10: 20 })[entry.level];
  ORDER_QUANTITIES[1].level = 16;
  for (const entry of ORDER_CATALOG) entry.level = ({ 1: 1, 4: 6, 5: 8, 6: 11, 8: 15, 10: 21 })[entry.level];
}

const LEVEL_REWARDS = [
  { level: 2, items: { bandage: 3, leatherCap: 3, sparkStone: 3 } },
  { level: 6, items: { pot1: 3 } },
  { level: 8, discount: 10 },
  { level: 11, items: { shield: 2, wand: 2 } },
  { level: 15, discount: 10 },
  { level: 17, items: { pot2: 3, ironSword: 3 } },
  { level: 20, discount: 15 },
  { level: 22, items: { righteousShield: 1, runeblade: 1 } },
  { level: 24, discount: 15 },
  { level: 25, items: { pot3: 2, warhammer: 1 }, discount: 20 },
];
const LAST_MILESTONE = 25;

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
const craftDuration = (recipe, level = progression().level) => recipe.minutes * 60 * 1000 * (level >= WORKSHOP_SPEED_LEVEL ? 0.8 : 1);
const orderCapacity = (level = progression().level) => ORDER_SLOTS.filter(entry => entry.level <= level).at(-1).count;
const orderQuantityLimit = (level = progression().level) => ORDER_QUANTITIES.filter(entry => entry.level <= level).at(-1).count;
const canOrder = (item, level = progression().level) => item.level <= level && ORDER_CATALOG.some(entry => entry.item === item.id && entry.level <= level);
const orderDiscount = () => CHECKPOINTS.find(entry => entry.points === state.pendingDiscounts[0])?.discount || state.levelDiscounts[0] || 0;
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
    ...(level === WORKSHOP_SPEED_LEVEL ? ['Werkstatt: 20 % schnellere neue Herstellungsaufträge'] : []),
    ...(MERCHANT_ENABLED && level === 1 ? ['Shop: 4 feste Basis-Angebote – Verband, Kurzschwert, Lederkappe und Funkenstein'] : []),
    ...(MERCHANT_ENABLED && level % SHOP_SLOT_INTERVAL === 0 ? [`Shop: +1 zufälliger Angebotsplatz (${shopCapacity(level)} Plätze insgesamt) ab dem nächsten Händlerbesuch`] : []),
    ...(!MERCHANT_ENABLED ? ORDER_SLOTS.filter(entry => entry.level === level).map(entry => `Bestellungen: ${entry.count} parallele Plätze`) : []),
    ...(!MERCHANT_ENABLED ? ORDER_QUANTITIES.filter(entry => entry.level === level).map(entry => `Bestellmenge: bis zu ${entry.count} Stück pro Bestellung`) : []),
    ...(!MERCHANT_ENABLED ? ORDER_CATALOG.filter(entry => entry.level === level).map(entry => `Bestellbar: ${ITEMS.find(item => item.id === entry.item).name}`) : []),
    ...(!STREAK_ENABLED ? levelRewardDescriptions(level) : []),
  ];
}

function levelRewardDescriptions(level) {
  const reward = LEVEL_REWARDS.find(reward => reward.level === level);
  if (!reward) return [];
  return [
    ...(reward.items ? [`Itempaket: ${Object.entries(reward.items).map(([id, count]) => `${count}× ${ITEMS.find(item => item.id === id).name}`).join(', ')}`] : []),
    ...(reward.discount ? [`${reward.discount} % Rabatt auf eine Bestellung (gesamte Menge)`] : []),
  ];
}

function grantLevelRewards(previousLevel, newLevel) {
  const bonuses = [];
  for (const reward of LEVEL_REWARDS) {
    if (reward.level <= previousLevel || reward.level > newLevel || state.claimedLevelRewards.includes(reward.level)) continue;
    state.claimedLevelRewards.push(reward.level);
    for (const [id, quantity] of Object.entries(reward.items || {})) {
      state.inventory[id] = (state.inventory[id] || 0) + quantity;
    }
    if (reward.discount) state.levelDiscounts.push(reward.discount);
    bonuses.push(...levelRewardDescriptions(reward.level).map(text => `Level ${reward.level}: ${text} erhalten.`));
  }
  return bonuses;
}

function raiseTestLevel() {
  syncTime();
  const previousLevel = progression().level;
  const newLevel = previousLevel + 1;
  state.exp = expForLevel(newLevel);
  const bonuses = STREAK_ENABLED ? [] : grantLevelRewards(previousLevel, newLevel);
  sfx.play(bonuses.length ? 'checkpoint' : 'level');
  render();
}

function renderRoadmap(selected = null) {
  const { level } = progression();
  const lastMilestone = STREAK_ENABLED ? Math.max(10, (Math.floor(level / SHOP_SLOT_INTERVAL) + 1) * SHOP_SLOT_INTERVAL,
    ...[...ITEMS, ...BOXES, ...CUSTOMER_TIERS, ...CUSTOMER_PLACES].map(entry => entry.level)) : LAST_MILESTONE;
  $('roadmap').innerHTML = Array.from({ length: lastMilestone }, (_, i) => {
    const milestone = i + 1;
    return `<section id="level-milestone-${milestone}" tabindex="-1" class="milestone ${milestone <= level ? 'unlocked' : 'locked'}${selected === milestone ? ' selected-checkpoint' : ''}">
      <h3>Level ${milestone} · ${milestone <= level ? 'Freigeschaltet' : 'Gesperrt'}${milestone === level ? ' · Aktuell' : ''}</h3>
      <small>${expForLevel(milestone)} Gesamt-EXP${milestone > 1 ? ` · ${100 * (milestone - 1)} EXP ab Level ${milestone - 1}` : ''}</small>
      <ul>${unlocksAtLevel(milestone).map(unlock => `<li>${unlock}</li>`).join('')}</ul>
    </section>`;
  }).join('') + (MERCHANT_ENABLED
    ? '<p class="hint">Item-Freischaltungen erweitern den möglichen Angebots- und Belohnungspool, nicht automatisch dein Inventar oder das Shop-Sortiment. Vier schwächste Basis-Items sind immer im Shop. Alle fünf Level kommt ein zufälliger Angebotsplatz dazu. Die Auswahl wird pro Händlerbesuch neu gezogen und bleibt während des Besuchs gleich. Auch nach Level 10 gibt es alle fünf Level einen weiteren Platz. Wenn der Itempool zu klein ist, bleiben Plätze leer: Mindestens ein wechselndes Item bleibt immer außerhalb des Sortiments.</p>'
    : '<p class="hint">Meilensteine sind bis Level 25 geplant. Weitere Level sind möglich, danach vorerst ohne neue Freischaltungen. Itempakete werden beim Levelaufstieg automatisch ins Inventar gelegt; Rabatte gelten einmal pro Bestellung. Item-Freischaltungen und bestellbare Itemtypen sind getrennt. Nicht jedes Item kann bestellt werden; Belohnungen und Werkstatt bleiben wichtig. Eine Bestellung belegt einen Platz für einen Itemtyp, unabhängig von der Menge. Jede Lieferung dauert 30 Minuten und landet automatisch im Inventar, auch offline. Der Händler ist vorerst deaktiviert.</p>');
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
  orders: [], boxPositions: [],
  claimedLevelRewards: [], levelDiscounts: [],
};

const SAVE_KEY = 'lootboxPacker.save';
const SAVE_VERSION = 4;
let lastUpdatedAt = Date.now();
let savingBlocked = false;
let storageError = '';

function showSaveStatus(message, error = false) {
  for (const id of ['saveStatus', 'saveAlert', 'orderSaveStatus', 'packingSaveStatus', 'packedItemSaveStatus', 'shopSaveStatus', 'workshopSaveStatus', 'supplySaveStatus']) {
    if ($(id).textContent !== message) $(id).textContent = message;
    $(id).classList.toggle('error', error);
    $(id).hidden = id !== 'saveStatus' && !error;
  }
}

function storageFailure(message, error) {
  if (storageError !== message) console.error(message, error);
  storageError = message;
  showSaveStatus(message, true);
}

function resetGame() {
  if (!confirm('Spielstand wirklich unwiderruflich löschen? Alle Items, Aufträge und Fortschritte gehen verloren. Du beginnst wieder bei Level 1.')) return;
  const wasBlocked = savingBlocked;
  // Auch pagehide darf den gelöschten Spielstand beim Neuladen nicht wiederherstellen.
  savingBlocked = true;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    savingBlocked = wasBlocked;
    const message = 'Zurücksetzen fehlgeschlagen. Dein Spielstand wurde nicht gelöscht. Erlaube lokalen Browser-Speicher und versuche es erneut.';
    $('resetMessage').textContent = message;
    $('resetMessage').hidden = false;
    storageFailure(message, error);
    return;
  }
  window.location.reload();
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
  require(record(data) && [1, 2, 3, SAVE_VERSION].includes(data.version) && count(data.savedAt) && record(data.state));
  const saved = data.state;
  for (const key of ['gold', 'exp', 'debt', 'streak', 'completed']) require(count(saved[key]));
  require(saved.completed < MERCHANT_INTERVAL && typeof saved.shopping === 'boolean');
  require(Number.isFinite(saved.spawnT) && saved.spawnT >= 0 && saved.spawnT <= SPAWN_INTERVAL);
  let totalExp = saved.exp;
  if (data.version < 4 && !STREAK_ENABLED) {
    // Frühere Freischaltungen bleiben erhalten; Level und Teilfortschritt werden auf die längere Kurve übertragen.
    const old = progression(saved.exp);
    const migratedLevel = ({ 1: 1, 2: 5, 3: 9, 4: 12, 5: 18, 6: 19 })[old.level] || old.level + 18;
    totalExp = expForLevel(migratedLevel) + Math.floor(old.current / old.required * migratedLevel * 100);
  }
  const level = progression(totalExp).level;
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
  const boxPositions = saved.boxPositions === undefined ? box.map((_, index) => index) : saved.boxPositions;
  require(Array.isArray(boxPositions) && boxPositions.length === box.length
    && new Set(boxPositions).size === boxPositions.length
    && boxPositions.every(position => count(position) && position < (boxType?.slots || 0)));
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
  const claimedLevelRewards = data.version < 4
    ? LEVEL_REWARDS.filter(reward => reward.level <= level).map(reward => reward.level) : saved.claimedLevelRewards;
  const levelDiscounts = data.version < 4 ? [] : saved.levelDiscounts;
  require(Array.isArray(claimedLevelRewards) && new Set(claimedLevelRewards).size === claimedLevelRewards.length
    && claimedLevelRewards.every(value => value <= level && LEVEL_REWARDS.some(reward => reward.level === value)));
  require(Array.isArray(levelDiscounts) && levelDiscounts.every(value => [10, 15, 20].includes(value)));
  return { gold: saved.gold, exp: totalExp, debt: saved.debt, streak: saved.streak, completed: saved.completed,
    spawnT: saved.spawnT, shopping: saved.shopping, showingResult: false, inventory, cart, boxType, box, boxPositions: [...boxPositions], active, queue,
    shopOffers, claimedCheckpoints, pendingDiscounts, activeDiscount, materials: { ...materials }, crafts: crafts.map(craft => ({ ...craft })),
    orders: orders.map(order => ({ item: order.item, quantity: order.quantity, finishAt: order.finishAt })),
    claimedLevelRewards: [...claimedLevelRewards], levelDiscounts: [...levelDiscounts] };
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
    if (data.version < 4 && !STREAK_ENABLED) {
      const oldLevel = progression(data.state.exp).level;
      const newLevel = progression(restored.exp).level;
      $('progressionNotice').textContent = `Dein Spielstand wurde auf die neuen Meilensteine übertragen${newLevel !== oldLevel ? `: Level ${oldLevel} → ${newLevel}` : ''}. Bereits freigeschaltete Inhalte und verdiente Rabatte bleiben erhalten. Frühere Level-Pakete werden nicht nachträglich vergeben.`;
      $('progressionNotice').hidden = false;
    }
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
  if (!STREAK_ENABLED) return [];
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
  if (!STREAK_ENABLED) {
    renderLevelTrack();
    return;
  }
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

function renderLevelTrack() {
  const progress = progression();
  const upcoming = Array.from({ length: Math.max(0, Math.min(5, LAST_MILESTONE - progress.level)) }, (_, i) => progress.level + i + 1);
  $('streakPoints').textContent = progress.level;
  $('trackStart').textContent = progress.level;
  $('streakProgress').max = upcoming.length || 1;
  $('streakProgress').value = upcoming.length ? progress.current / progress.required : 1;
  $('streakProgress').setAttribute('aria-label', 'Fortschritt zu den nächsten Level-Meilensteinen');
  $('streakNext').textContent = upcoming.length
    ? `Nächster Meilenstein: Level ${upcoming[0]} · ${progress.required - progress.current} EXP fehlen`
    : 'Alle geplanten Meilensteine bis Level 25 erreicht.';
  $('streakCheckpoints').innerHTML = upcoming.map((level, index) => {
    const reward = LEVEL_REWARDS.find(reward => reward.level === level);
    const icon = reward?.items ? '🎁' : reward?.discount ? '🏷️' : '⭐';
    return `<button class="checkpoint" style="left:${(index + 1) / upcoming.length * 100}%" data-level-milestone="${level}" aria-haspopup="dialog" aria-controls="roadmapDialog" aria-label="Level ${level}: Freischaltungen ansehen">
      <span>${icon}</span><b>${level}</b></button>`;
  }).join('');
  $('streakCheckpoints').querySelectorAll('[data-level-milestone]').forEach(button => {
    button.onclick = () => openRoadmap(+button.dataset.levelMilestone);
  });
  const discounts = [
    ...state.pendingDiscounts.map(points => CHECKPOINTS.find(checkpoint => checkpoint.points === points).discount),
    ...state.levelDiscounts,
  ];
  $('streakDiscounts').textContent = discounts.length ? `Bestellrabatte vorgemerkt: ${discounts.map(value => `${value} %`).join(' · ')}` : '';
}

function openStreak(selected = null) {
  if (!STREAK_ENABLED) {
    openRoadmap();
    return;
  }
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

function totals(previewItem = null) {
  const t = {};
  if (state.boxType) {
    for (const [attr, value] of Object.entries(state.boxType.modifiers)) t[attr] = value;
  }
  for (const it of previewItem ? [...state.box, previewItem] : state.box) {
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
  const points = STREAK_ENABLED && earned ? CUSTOMER_TIERS.find(tier => tier.id === c.tier).points : 0;
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
  state.boxPositions = [];
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
  sfx.play('checkout');
  render();
}

function packItem(id, position = null) {
  const it = ITEMS.find(i => i.id === id);
  if (!it || !isUnlocked(it) || !state.active || !state.boxType || !state.inventory[id] || usedSlots() >= capacity()) return;
  if (position === null) position = Array.from({ length: capacity() }, (_, i) => i).find(i => !state.boxPositions.includes(i));
  if (!Number.isInteger(position) || position < 0 || position >= capacity() || state.boxPositions.includes(position)) return;
  state.inventory[id]--;
  state.box.push(it);
  state.boxPositions.push(position);
  sfx.play('pack');
  render();
  return true;
}

function removeFromBox(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.box.length) return;
  const [it] = state.box.splice(index, 1);
  state.boxPositions.splice(index, 1);
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
  const bonuses = STREAK_ENABLED ? changeStreak(r.points) : grantLevelRewards(previousLevel, newLevel);
  sfx.play(bonuses.length ? 'checkpoint' : newLevel > previousLevel ? 'level' : 'send');
  state.box = [];
  state.boxPositions = [];
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
    ${STREAK_ENABLED ? `<div>Serie: +${r.points} Punkte · Gesamt: ${state.streak}</div>` : ''}
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

function needsHtml(c, t, preview = t) {
  return c.needs.map(n => {
    const have = Math.max(0, t[n.attr] || 0);
    const projected = Math.max(0, preview[n.attr] || 0);
    const pct = Math.min(100, projected / n.target * 100);
    const values = projected === have ? `${have}/${n.target}` : `${have}/${n.target} → <strong>${projected}/${n.target}</strong>`;
    return `<div class="need">
      <div class="need-head"><span>${ATTRS[n.attr].icon} ${ATTRS[n.attr].name} <span class="prio p${n.prio}">${PRIO_LABEL[n.prio]}</span></span><span>${values}</span></div>
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
  const placesAvailable = state.queue.length + (state.active ? 1 : 0) < queueCapacity();
  $('recruitCustomer').disabled = state.shopping || state.showingResult || !placesAvailable || state.gold < CUSTOMER_RECRUIT_COST;
  $('recruitCustomer').textContent = `Kunden anwerben · ${CUSTOMER_RECRUIT_COST} Gold`;
  $('recruitStatus').textContent = !placesAvailable ? 'Alle Kundenplätze sind belegt.'
    : state.gold < CUSTOMER_RECRUIT_COST ? `Noch ${CUSTOMER_RECRUIT_COST - state.gold} Gold bis zum nächsten Kunden.`
    : '';
  updateArrivalStatus();
}

function recruitCustomer() {
  const placesAvailable = state.queue.length + (state.active ? 1 : 0) < queueCapacity();
  if (state.shopping || state.showingResult || !placesAvailable || state.gold < CUSTOMER_RECRUIT_COST) return;
  state.gold -= CUSTOMER_RECRUIT_COST;
  state.queue.push(generateCustomer());
  if (state.queue.length + (state.active ? 1 : 0) >= queueCapacity()) state.spawnT = SPAWN_INTERVAL;
  sfx.play('arrival');
  render();
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
  const testLevelStatus = `Aktuell: Level ${progress.level}`;
  if ($('testLevelStatus').textContent !== testLevelStatus) $('testLevelStatus').textContent = testLevelStatus;
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
  $('box').innerHTML = Array.from({ length: capacity() }, (_, position) => {
    const index = state.boxPositions.indexOf(position);
    const item = state.box[index];
    return item
      ? `<button class="box-item icon-slot item-rarity-${item.rarity}" data-slot="${position}" aria-label="Slot ${position + 1}: ${item.name}, Details anzeigen" title="${item.name}"><span aria-hidden="true">${item.icon}</span></button>`
      : `<button class="icon-slot empty-slot" data-slot="${position}" aria-label="Slot ${position + 1}: leer, Item auswählen"><span aria-hidden="true">＋</span></button>`;
  }).join('');
  $('box').querySelectorAll('[data-slot]').forEach(el => el.onclick = () => openBoxSlot(+el.dataset.slot));
  $('slotInfo').textContent = state.boxType ? `${used}/${capacity()} Items` : '';
  $('boxEffects').textContent = state.boxType ? `Kisteneffekt: ${boxEffectsText(state.boxType)}` : '';

  if (c) {
    const q = quality(), r = rewardFor(q, c);
    const itemCost = state.box.reduce((sum, item) => sum + shopPrice(item), 0);
    const repayment = Math.min(state.debt, r.gold);
    const netGold = r.gold - itemCost - repayment;
    $('preview').innerHTML = `<div>Aktuell: ${qualityPercent(q)}% → 💰 ${r.gold}  ⭐ ${r.exp} ${itemRewardHtml(c, r.earned)}</div>
      <details class="preview-details"><summary>Wert &amp; Vorschuss</summary>
      <span class="item-cost">Shopwert: ${itemCost} 💰 (ohne Rabatt; Belohnungsitems sind gratis)</span>
      <span class="net-gold${netGold < 0 ? ' loss' : ''}"> · Gegenwert-Differenz: ${netGold >= 0 ? '+' : ''}${netGold} 💰</span>
      ${repayment ? `<br>Davon Vorschuss-Rückzahlung: ${repayment} Gold (in der Differenz berücksichtigt)` : ''}</details>
      ${STREAK_ENABLED ? `<div class="streak-preview">+${CUSTOMER_TIERS.find(tier => tier.id === c.tier).points} Serienpunkte bei Reward</div>` : ''}`;
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

let selectedSlot = null;
let selectedPackingItem = null;
let selectedSupplyItem = null;

function itemIconButton(item, quantity, attribute, selected = false) {
  return `<button class="icon-slot item-rarity-${item.rarity}${selected ? ' selected' : ''}" ${attribute}="${item.id}" aria-label="${item.name}, Vorrat: ${quantity}" aria-pressed="${selected}" title="${item.name}">
    <span aria-hidden="true">${item.icon}</span><b class="item-count">${quantity}</b></button>`;
}

function itemInfoHtml(item) {
  return `<div class="item-rarity-${item.rarity}"><strong>${item.icon} ${itemNameHtml(item)}</strong><p>${itemDetailsHtml(item)}</p><p>Vorrat: ${state.inventory[item.id] || 0}</p></div>`;
}

function openBoxSlot(position) {
  if (!state.active || !state.boxType || !Number.isInteger(position) || position < 0 || position >= capacity()) return;
  selectedSlot = position;
  const index = state.boxPositions.indexOf(position);
  if (index >= 0) {
    $('packedItemDetails').innerHTML = itemInfoHtml(state.box[index]);
    $('packedItemDialog').showModal();
  } else {
    selectedPackingItem = null;
    renderInventory();
    $('packingInventoryDialog').showModal();
  }
}

function renderInventory() {
  const customer = state.active;
  const owned = ITEMS.filter(it => state.inventory[it.id] > 0);
  const item = owned.find(it => it.id === selectedPackingItem);
  const previewItem = item && isUnlocked(item) && selectedSlot !== null
    && selectedSlot < capacity() && !state.boxPositions.includes(selectedSlot) ? item : null;
  $('packingNeeds').hidden = !customer || !state.boxType;
  $('packingNeedsTitle').textContent = previewItem ? 'Kundenwünsche · Vorschau' : 'Kundenwünsche';
  if ($('packingNeeds').hidden) {
    $('packingNeedValues').innerHTML = '';
  } else {
    const current = totals();
    $('packingNeedValues').innerHTML = needsHtml(customer, current, previewItem ? totals(previewItem) : current);
  }
  $('inventory').innerHTML = owned.length
    ? owned.map(it => itemIconButton(it, state.inventory[it.id], 'data-pack-item', selectedPackingItem === it.id)).join('')
    : `<div class="empty">${state.shopping ? 'Dein Lager ist leer. Kaufe Vorräte im Shop.' : 'Dein Lager ist leer. Bestelle Nachschub im Inventar-Menü oder nutze den Notfall-Restock.'}</div>`;
  $('inventory').querySelectorAll('[data-pack-item]').forEach(el => el.onclick = () => {
    selectedPackingItem = el.dataset.packItem;
    renderInventory();
    $('inventory').querySelector(`[data-pack-item="${selectedPackingItem}"]`)?.focus();
  });
  $('packingItemDetails').innerHTML = item ? `${itemInfoHtml(item)}
    ${isUnlocked(item) ? '<button id="confirmPackItem" class="primary">Einpacken</button>' : `<p>Ab Level ${item.level} verwendbar.</p>`}`
    : '<p class="hint">Tippe auf ein Item, um seine Werte zu sehen.</p>';
  if (item && isUnlocked(item)) $('confirmPackItem').onclick = () => {
    if (packItem(item.id, selectedSlot)) {
      $('packingInventoryDialog').close();
      $('box').querySelector(`[data-slot="${selectedSlot}"]`)?.focus();
    }
  };
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
  $('workshopHint').textContent = `Rohstoffe gibt es manchmal statt eines Items als Kundenbelohnung. Beim Herstellen werden sie sofort verbraucht. Fertige Items warten auf Abholung – auch offline. Ein Platz bleibt bis zur Abholung belegt. Ab Level ${WORKSHOP_SPEED_LEVEL} starten Aufträge 20 % schneller.`;
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
  if (discount) {
    if (state.pendingDiscounts.length) state.pendingDiscounts.shift();
    else state.levelDiscounts.shift();
  }
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
  const controls = $('supplyItemDetails');
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
  if (!visibleItems.some(item => item.id === selectedSupplyItem)) selectedSupplyItem = null;
  $('supplyInventory').innerHTML = visibleItems.map(item =>
    itemIconButton(item, state.inventory[item.id] || 0, 'data-supply-item', selectedSupplyItem === item.id)
  ).join('') || '<p class="hint">Keine Items verfügbar.</p>';
  $('supplyInventory').querySelectorAll('[data-supply-item]').forEach(button => button.onclick = () => {
    selectedSupplyItem = button.dataset.supplyItem;
    renderSupply();
    $('supplyInventory').querySelector(`[data-supply-item="${selectedSupplyItem}"]`)?.focus();
  });
  const item = visibleItems.find(entry => entry.id === selectedSupplyItem);
  $('supplyItemDetails').innerHTML = item ? (() => {
    const catalog = ORDER_CATALOG.find(entry => entry.item === item.id);
    const available = canOrder(item);
    const quantity = orderDrafts[item.id] ?? 1;
    const price = orderPrice(item, quantity);
    return `<div class="supply-row item-rarity-${item.rarity}">
      ${itemInfoHtml(item)}
      <small>${isUnlocked(item) ? '' : `Item ab Level ${item.level}`}</small>
      ${available ? `<div class="supply-controls">
        <div class="quantity-controls" role="group" aria-label="Bestellmenge ${item.name}">
          <button class="secondary" data-decrease="${item.id}" aria-label="${item.name}: Menge verringern" ${quantity === 1 ? 'disabled' : ''}>−</button>
          <output data-quantity="${item.id}" aria-live="polite" aria-label="Menge ${item.name}">${quantity}</output>
          <button class="secondary" data-increase="${item.id}" aria-label="${item.name}: Menge erhöhen" ${quantity === orderQuantityLimit() ? 'disabled' : ''}>+</button>
        </div>
        <button class="secondary order-item" data-item="${item.id}" ${state.orders.length >= orderCapacity() || price > state.gold ? 'disabled' : ''}>Bestellen · ${price} Gold</button></div>`
      : `<small>${catalog ? `Bestellbar ab Level ${catalog.level}` : 'Nicht bestellbar · Kundenbelohnungen oder Werkstatt'}</small>`}
    </div>`;
  })() : '<p class="hint">Tippe auf ein Item, um Details und Bestellmöglichkeiten zu sehen.</p>';
  $('supplyItemDetails').querySelectorAll('[data-decrease]').forEach(button => {
    button.onclick = () => adjustOrderQuantity(button.dataset.decrease, -1);
  });
  $('supplyItemDetails').querySelectorAll('[data-increase]').forEach(button => {
    button.onclick = () => adjustOrderQuantity(button.dataset.increase, 1);
  });
  $('supplyItemDetails').querySelectorAll('.order-item').forEach(button => {
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
$('recruitCustomer').onclick = recruitCustomer;
$('openSupply').onclick = openSupply;
$('packingSupply').onclick = openSupply;
$('closeSupply').onclick = () => $('supplyDialog').close();
$('supplyDialog').addEventListener('close', () => {
  if ($('packingInventoryDialog').open) renderInventory();
});
$('closePackingInventory').onclick = () => $('packingInventoryDialog').close();
$('closePackedItem').onclick = () => $('packedItemDialog').close();
for (const id of ['packingInventoryDialog', 'packedItemDialog']) {
  $(id).addEventListener('close', () => $('box').querySelector(`[data-slot="${selectedSlot}"]`)?.focus());
}
$('removePackedItem').onclick = () => {
  const index = state.boxPositions.indexOf(selectedSlot);
  if (index < 0) return;
  removeFromBox(index);
  $('packedItemDialog').close();
  $('box').querySelector(`[data-slot="${selectedSlot}"]`)?.focus();
};
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
$('openOptions').onclick = () => $('optionsDialog').showModal();
$('closeOptions').onclick = () => $('optionsDialog').close();
$('raiseTestLevel').onclick = raiseTestLevel;
$('resetGame').onclick = resetGame;
function openRoadmap(selected = null) {
  renderRoadmap(selected);
  $('roadmapDialog').showModal();
  if (Number.isInteger(selected)) $(`level-milestone-${selected}`).focus();
}
$('shopRoadmap').onclick = () => openRoadmap();
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
