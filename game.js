const $ = id => document.getElementById(id);
const desktopLayout = matchMedia('(min-width: 900px)');

function openDesktopPanels() {
  if (desktopLayout.matches) {
    for (const id of ['queueCard', 'custCard', 'pickCard', 'boxCard', 'inventoryCard']) $(id).open = true;
  }
}
desktopLayout.addEventListener('change', openDesktopPanels);

const ATTRS = {
  hp:    { name: 'Leben',    icon: '❤️' },
  melee: { name: 'Nahkampf', icon: '⚔️' },
  magic: { name: 'Magie',    icon: '🔮' },
  armor: { name: 'Rüstung',  icon: '🛡️' },
};

// Größere Items sind pro kg effizienter, kosten aber deutlich mehr Gold.
const ITEMS = [
  { id: 'pot1',   name: 'Kleiner Heiltrank', icon: '🧪', attr: 'hp',    value: 10, weight: 1, cost: 5 },
  { id: 'pot2',   name: 'Heiltrank',         icon: '🧪', attr: 'hp',    value: 25, weight: 2, cost: 18 },
  { id: 'pot3',   name: 'Großer Heiltrank',  icon: '🍶', attr: 'hp',    value: 50, weight: 3, cost: 45 },
  { id: 'dag',    name: 'Dolch',             icon: '🗡️', attr: 'melee', value: 8,  weight: 1, cost: 6 },
  { id: 'sword',  name: 'Schwert',           icon: '⚔️', attr: 'melee', value: 20, weight: 2, cost: 22 },
  { id: 'shield', name: 'Holzschild',        icon: '🛡️', attr: 'armor', value: 10, weight: 1, cost: 8 },
  { id: 'plate',  name: 'Plattenrüstung',    icon: '🥋', attr: 'armor', value: 30, weight: 3, cost: 40 },
  { id: 'wand',   name: 'Zauberstab',        icon: '🪄', attr: 'magic', value: 15, weight: 1, cost: 10 },
];

const BOXES = [
  { id: 'small',  name: 'Kleine Kiste',   icon: '📦', capacity: 10, exp: 0 },
  { id: 'medium', name: 'Mittlere Kiste', icon: '🧰', capacity: 18, exp: 60 },
  { id: 'large',  name: 'Große Truhe',    icon: '🗄️', capacity: 30, exp: 200 },
];

const NEED_WEIGHT = { 3: 3, 2: 2, 1: 1 };
const PRIO_LABEL = { 3: 'sehr wichtig', 2: 'wichtig', 1: 'gering' };

const NAMES = ['Willi', 'Luna', 'Finn', 'Gero', 'Ida', 'Morwen', 'Brom', 'Selma', 'Thok', 'Pip', 'Konrad', 'Jax', 'Mara', 'Olaf', 'Elda', 'Rurik', 'Nia', 'Tarn', 'Hilde', 'Kael'];

const CLASSES = [
  { cls: 'Krieger',       icon: '🪓',   needs: [ { attr: 'hp', prio: 3, target: 50 }, { attr: 'melee', prio: 2, target: 20 }, { attr: 'armor', prio: 3, target: 20 } ] },
  { cls: 'Magier',        icon: '🧙',   needs: [ { attr: 'magic', prio: 3, target: 30 }, { attr: 'hp', prio: 2, target: 25 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Schurke',       icon: '🥷',   needs: [ { attr: 'melee', prio: 3, target: 28 }, { attr: 'hp', prio: 2, target: 20 } ] },
  { cls: 'Paladin',       icon: '🛡️',   needs: [ { attr: 'armor', prio: 3, target: 40 }, { attr: 'hp', prio: 3, target: 35 }, { attr: 'melee', prio: 1, target: 10 } ] },
  { cls: 'Bogenschütze',  icon: '🏹',   needs: [ { attr: 'melee', prio: 3, target: 24 }, { attr: 'armor', prio: 2, target: 10 }, { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Hexer',         icon: '🧛',   needs: [ { attr: 'magic', prio: 3, target: 45 }, { attr: 'hp', prio: 1, target: 10 } ] },
  { cls: 'Zwerg',         icon: '⛏️',   needs: [ { attr: 'armor', prio: 3, target: 30 }, { attr: 'melee', prio: 2, target: 20 } ] },
  { cls: 'Heiler',        icon: '🌿',   needs: [ { attr: 'hp', prio: 3, target: 60 }, { attr: 'magic', prio: 2, target: 15 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Barbar',        icon: '💪',   needs: [ { attr: 'melee', prio: 3, target: 40 }, { attr: 'hp', prio: 2, target: 35 } ] },
  { cls: 'Novize',        icon: '📚',   needs: [ { attr: 'magic', prio: 2, target: 15 }, { attr: 'hp', prio: 2, target: 10 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { cls: 'Ritter',        icon: '🐴',   needs: [ { attr: 'armor', prio: 3, target: 30 }, { attr: 'melee', prio: 3, target: 20 }, { attr: 'hp', prio: 2, target: 25 } ] },
  { cls: 'Gaukler',       icon: '🎭',   needs: [ { attr: 'hp', prio: 2, target: 20 }, { attr: 'magic', prio: 1, target: 15 } ] },
];

const EPIC_CLASSES = [
  { cls: 'König',      icon: '👑', needs: [ { attr: 'hp', prio: 3, target: 70 }, { attr: 'armor', prio: 3, target: 40 }, { attr: 'melee', prio: 2, target: 20 } ] },
  { cls: 'Held',       icon: '🦸', needs: [ { attr: 'melee', prio: 3, target: 45 }, { attr: 'hp', prio: 3, target: 50 }, { attr: 'armor', prio: 2, target: 30 } ] },
  { cls: 'Erzmagier',  icon: '🔮', needs: [ { attr: 'magic', prio: 3, target: 60 }, { attr: 'hp', prio: 2, target: 40 }, { attr: 'armor', prio: 1, target: 20 } ] },
];

// mult: Belohnungsfaktor, time: Sekunden bis der Kunde geht, scale: Skalierung der Zielwerte
const RARITY = {
  common: { label: 'Gewöhnlich', mult: 1, time: 90, scale: 1,    weight: 70 },
  rare:   { label: 'Selten',     mult: 2, time: 75, scale: 1.25, weight: 22 },
  epic:   { label: 'Episch',     mult: 4, time: 60, scale: 1,    weight: 8 },
};
const QUEUE_SIZE = 3;
const SPAWN_INTERVAL = 5;
const MERCHANT_INTERVAL = 5;
const RESTOCK_COST = 20;
const RESTOCK_SIZE = 3;
const RESTOCK_IDS = ['pot1', 'dag', 'shield', 'wand'];
const ITEM_REWARDS = [
  { quality: 0.3, rarities: ['common', 'rare', 'epic'], ids: ['pot1', 'dag', 'shield', 'wand'] },
  { quality: 0.6, rarities: ['rare', 'epic'], ids: ['pot2', 'sword'] },
  { quality: 0.9, rarities: ['epic'], ids: ['pot3', 'plate'] },
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function rollRarity() {
  let r = Math.random() * 100;
  for (const [key, def] of Object.entries(RARITY)) {
    if ((r -= def.weight) < 0) return key;
  }
  return 'common';
}

let nextId = 1;
// Zielwerte schwanken um ±20% (auf 5 gerundet), damit gleiche Klassen nicht identisch sind.
function generateCustomer() {
  const rarity = rollRarity();
  const def = RARITY[rarity];
  const base = pick(rarity === 'epic' ? EPIC_CLASSES : CLASSES);
  const needs = base.needs.map(n => ({ ...n, target: Math.max(5, Math.round(n.target * def.scale * (0.8 + Math.random() * 0.4) / 5) * 5) }));
  const itemRewards = ITEM_REWARDS.filter(tier => tier.rarities.includes(rarity))
    .map(tier => {
      const id = pick(tier.ids);
      return { quality: tier.quality, item: ITEMS.find(it => it.id === id) };
    });
  return { id: nextId++, name: pick(NAMES), cls: base.cls, icon: base.icon, needs, rarity, itemRewards, timeLeft: def.time, maxTime: def.time };
}

const state = {
  gold: 100, exp: 0, inventory: {}, cart: {}, boxType: null, box: [], active: null, queue: [], spawnT: 0,
  shopping: true, completed: 0, debt: 0, showingResult: false,
};

const capacity = () => state.boxType ? state.boxType.capacity : 0;

const usedWeight = () => state.box.reduce((s, i) => s + i.weight, 0);

function totals() {
  const t = {};
  for (const it of state.box) t[it.attr] = (t[it.attr] || 0) + it.value;
  return t;
}

// Erfüllung je Need auf 100% gedeckelt; Gesamtqualität nach Wichtigkeit gewichtet.
function quality() {
  const t = totals();
  let sum = 0, wsum = 0;
  for (const n of state.active.needs) {
    const w = NEED_WEIGHT[n.prio];
    sum += w * Math.min(1, (t[n.attr] || 0) / n.target);
    wsum += w;
  }
  return sum / wsum;
}

const rewardFor = (q, c) => {
  const m = RARITY[c.rarity].mult;
  const eligible = c.itemRewards.filter(reward => q >= reward.quality);
  const item = eligible.length ? eligible[eligible.length - 1].item : null;
  return { gold: Math.round((10 + q * 30) * m), exp: Math.round((5 + q * 15) * m), item };
};

function returnBoxToInventory() {
  for (const it of state.box) {
    state.inventory[it.id] = (state.inventory[it.id] || 0) + 1;
  }
  state.box = [];
}

const cartQuantity = () => Object.values(state.cart).reduce((sum, quantity) => sum + quantity, 0);

const cartTotal = () => ITEMS.reduce((sum, item) => sum + item.cost * (state.cart[item.id] || 0), 0);

function addToCart(id) {
  const it = ITEMS.find(i => i.id === id);
  if (!state.shopping || !it) return;
  const restoreFocus = document.activeElement?.closest('#shop .shop-item')?.dataset.id === id;
  $('checkoutMessage').textContent = '';
  state.cart[id] = (state.cart[id] || 0) + 1;
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
  render();
}

function checkout() {
  if (!state.shopping || cartQuantity() === 0 || cartTotal() > state.gold) return;
  const total = cartTotal();
  const purchases = Object.entries(state.cart);
  state.gold -= total;
  for (const [id, quantity] of purchases) {
    state.inventory[id] = (state.inventory[id] || 0) + quantity;
  }
  state.cart = {};
  $('checkoutMessage').textContent = `Einkauf abgeschlossen: ${total} Gold bezahlt.`;
  render();
}

function finishShopping() {
  if (!state.shopping) return;
  if (cartQuantity() > 0 && !confirm('Warenkorb verwerfen und Einkauf beenden?')) return;
  state.cart = {};
  state.shopping = false;
  $('checkoutMessage').textContent = '';
  $('queueCard').open = true;
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
  render();
}

function packItem(id) {
  const it = ITEMS.find(i => i.id === id);
  if (!it || !state.active || !state.boxType || !state.inventory[id] || usedWeight() + it.weight > capacity()) return;
  state.inventory[id]--;
  state.box.push(it);
  render();
}

function removeFromBox(index) {
  const [it] = state.box.splice(index, 1);
  state.inventory[it.id] = (state.inventory[it.id] || 0) + 1;
  render();
}

// Der bisher aktive Kunde nimmt den Platz des gewählten in der Liste ein; seine Zeit läuft dort weiter.
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
  if (autoCollapse && !desktopLayout.matches) {
    $('queueCard').open = false;
    for (const id of ['custCard', 'pickCard', 'boxCard']) $(id).open = true;
    $('inventoryCard').open = false;
  }
  openDesktopPanels();
  render();
}

function chooseBox(id) {
  const type = BOXES.find(b => b.id === id);
  if (!state.active || !type || state.exp < type.exp) return;
  if (state.boxType === type) return;
  returnBoxToInventory();
  state.boxType = type;
  $('inventoryCard').open = true;
  render();
}

function send() {
  if (state.shopping || state.showingResult || !state.active || !state.boxType) return;
  const q = quality();
  const r = rewardFor(q, state.active);
  const repayment = Math.min(state.debt, r.gold);
  state.debt -= repayment;
  state.gold += r.gold - repayment;
  state.exp += r.exp;
  if (r.item) state.inventory[r.item.id] = (state.inventory[r.item.id] || 0) + 1;
  state.box = [];
  state.boxType = null;
  state.active = null;
  state.completed++;
  state.showingResult = true;
  if (state.completed === MERCHANT_INTERVAL) {
    state.completed = 0;
    state.shopping = true;
  }
  const label = q >= 0.9 ? 'Perfekt!' : q >= 0.6 ? 'Gut' : q >= 0.3 ? 'Geht so' : 'Schlecht';
  $('result').innerHTML = `
    <h1>${label}</h1>
    <div>Erfüllung: ${Math.round(q * 100)}%</div>
    <div>💰 +${r.gold} &nbsp; ⭐ +${r.exp}</div>
    ${repayment ? `<div>Vorschuss-Rückzahlung: −${repayment} Gold · Ausgezahlt: ${r.gold - repayment} Gold</div>` : ''}
    <div>${r.item ? `Inventar: +1 ${r.item.icon} ${r.item.name}` : 'Keine Itembelohnung (ab 30% Erfüllung)'}</div>
    <button class="primary" id="next">${state.shopping ? 'Zum Händler' : 'Weiter'}</button>`;
  render();
  $('result').classList.remove('hidden');
  $('next').onclick = () => {
    state.showingResult = false;
    $('result').classList.add('hidden');
    if (!state.shopping && autoCollapse) $('queueCard').open = true;
    render();
  };
}

function tick(dt) {
  if (state.shopping || state.showingResult) return;
  let changed = false;
  for (const c of state.queue) c.timeLeft -= dt;
  const before = state.queue.length;
  state.queue = state.queue.filter(c => c.timeLeft > 0);
  if (state.queue.length !== before) changed = true;

  state.spawnT -= dt;
  if (state.spawnT <= 0 && state.queue.length < QUEUE_SIZE) {
    state.queue.push(generateCustomer());
    state.spawnT = SPAWN_INTERVAL;
    changed = true;
  }
  if (changed) renderQueue(); else updateTimers();
}

function updateTimers() {
  for (const c of state.queue) {
    const el = document.querySelector(`[data-cid="${c.id}"]`);
    if (!el) continue;
    el.querySelector('.timer > div').style.width = `${Math.max(0, c.timeLeft / c.maxTime * 100)}%`;
    el.querySelector('.secs').textContent = `${Math.ceil(c.timeLeft)}s`;
  }
}

function needsHtml(c, t) {
  return c.needs.map(n => {
    const have = t[n.attr] || 0;
    const pct = Math.min(100, have / n.target * 100);
    return `<div class="need">
      <div class="need-head"><span>${ATTRS[n.attr].icon} ${ATTRS[n.attr].name} <span class="prio p${n.prio}">${PRIO_LABEL[n.prio]}</span></span><span>${have}/${n.target}</span></div>
      <div class="bar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

function itemRewardsHtml(c) {
  return `<span class="reward-offer">Itembelohnung (1 Item): ${c.itemRewards.map(reward =>
    `ab ${Math.round(reward.quality * 100)}%: ${reward.item.icon} ${reward.item.name}`
  ).join(' · ')}. Die höchste erreichte Stufe zählt.</span>`;
}

function renderQueue() {
  $('queue').innerHTML = state.queue.length ? state.queue.map(c => {
    const needs = c.needs.map(n => `<span class="need-icons">${ATTRS[n.attr].icon.repeat(n.prio)}</span>`).join('');
    const m = RARITY[c.rarity].mult;
    return `<button class="queue-item r-${c.rarity}" data-cid="${c.id}" ${state.shopping || state.showingResult ? 'disabled' : ''}>
      <span class="ico">${c.icon}</span>
      <span class="txt">${c.name} <small>${c.cls}</small><span class="needs">${needs}</span>${itemRewardsHtml(c)}</span>
      <span class="mult">${m > 1 ? '×' + m : ''}</span>
      <span class="secs">${Math.ceil(c.timeLeft)}s</span>
      <span class="timer"><div style="width:${Math.max(0, c.timeLeft / c.maxTime * 100)}%"></div></span>
    </button>`;
  }).join('') : '<div class="empty">Gerade keine Kunden…</div>';
  $('queue').querySelectorAll('.queue-item').forEach(el => el.onclick = () => selectCustomer(+el.dataset.cid));
  $('queueInfo').textContent = `${state.queue.length}/${QUEUE_SIZE}`;
}

function render() {
  const c = state.active;
  $('gold').textContent = state.gold;
  $('shopGold').textContent = state.gold;
  $('exp').textContent = state.exp;
  $('merchantStatus').textContent = state.shopping ? 'Händler da · Kundentimer pausiert' : `Händler in ${MERCHANT_INTERVAL - state.completed} Aufträgen`;
  $('merchantProgress').value = state.shopping ? MERCHANT_INTERVAL : state.completed;
  $('debtInfo').textContent = state.debt ? `Offener Vorschuss: ${state.debt} Gold` : '';
  $('finishShopping').hidden = !state.shopping;
  $('finishShopping').disabled = state.showingResult;
  $('checkoutTotal').textContent = `${cartTotal()} Gold`;
  $('cartCount').textContent = cartQuantity() ? `(${cartQuantity()})` : '';
  $('checkout').disabled = !state.shopping || cartQuantity() === 0 || cartTotal() > state.gold;
  $('checkoutMessage').textContent ||= '';
  $('checkoutMessage').classList.toggle('error', cartQuantity() > 0 && cartTotal() > state.gold);
  $('checkoutMessage').textContent = cartQuantity() > 0 && cartTotal() > state.gold
    ? `Es fehlen ${cartTotal() - state.gold} Gold. Passe den Warenkorb an.`
    : $('checkoutMessage').textContent;
  $('shopHint').textContent = state.shopping
    ? 'Kaufe Vorräte für fünf Aufträge. Jeder Kauf landet im Inventar. Mit „Einkauf beenden“ startet die Runde.'
    : 'Der Händler kommt nach fünf abgeschlossenen Aufträgen wieder. Nutze bis dahin dein Inventar oder den Notfall-Restock.';
  $('restock').disabled = state.shopping || state.showingResult || (state.debt > 0 && state.gold < RESTOCK_COST);
  $('restock').textContent = `Notfall-Restock · ${RESTOCK_COST} Gold`;
  $('restockHint').textContent = `${RESTOCK_SIZE} zufällige Basis-Items: kleiner Heiltrank, Dolch, Holzschild oder Zauberstab. Mindestens zwei Attribute. Fehlendes Gold wird als Vorschuss mit künftigen Goldbelohnungen verrechnet. ${state.debt ? 'Kein weiterer Vorschuss, bis die offene Gebühr bezahlt ist.' : ''}`;

  $('customer').innerHTML = c
    ? `<div class="cust-name r-${c.rarity}">${c.icon} ${c.name} <small>${c.cls} · ${RARITY[c.rarity].label}</small></div>` + needsHtml(c, totals()) + itemRewardsHtml(c)
    : '<div class="empty">Wähle einen Kunden aus der Liste</div>';

  const used = usedWeight();
  $('box').innerHTML = state.box.length
    ? state.box.map((it, i) => `<button class="box-item" data-i="${i}"><span class="ico">${it.icon}</span><span class="txt">${it.name}</span><span class="kg">${it.weight} kg ✕</span></button>`).join('')
    : `<div class="empty">${state.boxType ? 'Leer – packe Items aus deinem Inventar ein' : 'Wähle zuerst eine Box'}</div>`;
  $('box').querySelectorAll('.box-item').forEach(el => el.onclick = () => removeFromBox(+el.dataset.i));
  $('slotInfo').textContent = state.boxType ? `${used}/${capacity()} kg` : '';
  $('weightBar').style.width = capacity() ? `${used / capacity() * 100}%` : '0%';
  $('weightBar').classList.toggle('full', capacity() > 0 && used >= capacity());

  if (c) {
    const q = quality(), r = rewardFor(q, c);
    const itemCost = state.box.reduce((sum, item) => sum + item.cost, 0);
    const repayment = Math.min(state.debt, r.gold);
    const netGold = r.gold - itemCost - repayment;
    $('preview').innerHTML = `Aktuell: ${Math.round(q * 100)}% → 💰 ${r.gold}  ⭐ ${r.exp}<br>
      <span class="item-cost">Itemkosten: ${itemCost} 💰</span>
      <span class="net-gold${netGold < 0 ? ' loss' : ''}"> · Netto: ${netGold >= 0 ? '+' : ''}${netGold} 💰</span>
      ${repayment ? `<br>Davon Vorschuss-Rückzahlung: ${repayment} Gold (im Netto berücksichtigt)` : ''}<br>
      ${r.item ? `Itembelohnung: +1 ${r.item.icon} ${r.item.name}` : 'Itembelohnung ab 30% Erfüllung'}`;
  } else {
    $('preview').textContent = '';
  }
  $('send').disabled = state.shopping || state.showingResult || !c || !state.boxType;

  $('shop').innerHTML = state.shopping ? ITEMS.map(it => {
    const inCart = state.cart[it.id] || 0;
    return `<div class="shop-row">
      <span class="ico">${it.icon}</span>
      <span class="txt">${it.name}<small>${ATTRS[it.attr].icon} +${it.value} · ${it.weight} kg · Im Lager: ${state.inventory[it.id] || 0} · Im Warenkorb: ${inCart}</small></span>
      <span class="cost">💰 ${it.cost}</span>
      <button class="add-item" data-id="${it.id}" aria-label="${it.name} in den Warenkorb legen">＋</button>
    </div>`;
  }).join('') : '<div class="empty">Der Händler ist unterwegs.</div>';
  $('shop').querySelectorAll('.add-item').forEach(el => el.onclick = () => addToCart(el.dataset.id));
  $('cart').innerHTML = cartQuantity()
    ? ITEMS.filter(it => state.cart[it.id] > 0).map(it => `<div class="cart-row">
        <span class="ico">${it.icon}</span>
        <span class="txt">${it.name}<small>Im Lager: ${state.inventory[it.id] || 0} · Im Warenkorb: ${state.cart[it.id]}</small></span>
        <span class="cost">×${state.cart[it.id]}</span>
        <button class="remove-item" data-id="${it.id}" aria-label="${it.name} aus dem Warenkorb entfernen">−</button>
      </div>`).join('')
    : '<div class="empty">Der Warenkorb ist leer.</div>';
  $('cart').querySelectorAll('.remove-item').forEach(el => el.onclick = () => removeFromCart(el.dataset.id));
  const shopDialog = $('shopDialog');
  if (state.shopping && !state.showingResult && !shopDialog.open) shopDialog.showModal();
  else if ((!state.shopping || state.showingResult) && shopDialog.open) shopDialog.close();
  renderInventory();
  renderPicker();
  renderQueue();
}

function renderInventory() {
  const count = Object.values(state.inventory).reduce((sum, quantity) => sum + quantity, 0);
  $('inventoryInfo').textContent = `${count} Items`;
  const owned = ITEMS.filter(it => state.inventory[it.id] > 0);
  $('inventory').innerHTML = owned.length
    ? owned.map(it => {
        const off = !state.active || !state.boxType || usedWeight() + it.weight > capacity();
        return `<button class="shop-item" data-id="${it.id}" ${off ? 'disabled' : ''}>
          <span class="ico">${it.icon}</span>
          <span class="txt">${it.name}<small>${ATTRS[it.attr].icon} +${it.value} · ${it.weight} kg · In Box legen</small></span>
          <span class="cost">×${state.inventory[it.id]}</span>
        </button>`;
      }).join('')
    : `<div class="empty">${state.shopping ? 'Dein Lager ist leer. Kaufe Vorräte im Shop.' : 'Dein Lager ist leer. Nutze den Notfall-Restock.'}</div>`;
  $('inventory').querySelectorAll('.shop-item').forEach(el => el.onclick = () => packItem(el.dataset.id));
}

function renderPicker() {
  $('boxPicker').innerHTML = !state.active
    ? '<div class="empty">Wähle zuerst einen Kunden</div>'
    : BOXES.map(b => {
        const locked = state.exp < b.exp;
        const sel = state.boxType && state.boxType.id === b.id;
        return `<button class="pick-item${sel ? ' selected' : ''}" data-bid="${b.id}" ${locked ? 'disabled' : ''}>
          <span class="ico">${b.icon}</span>
          <span class="txt">${b.name}<small>${b.capacity} kg</small></span>
          <span class="req">${locked ? '🔒 ' + b.exp + ' EXP' : sel ? '✔' : ''}</span>
        </button>`;
      }).join('');
  $('boxPicker').querySelectorAll('.pick-item').forEach(el => el.onclick = () => chooseBox(el.dataset.bid));
  $('pickInfo').textContent = state.boxType ? state.boxType.name : '';
}

// Auto-Einklappen der Kundenliste: nach Kundenwahl zu, nach dem Absenden wieder auf.
let autoCollapse = localStorage.getItem('autoCollapseQueue') !== '0';
function renderAuto() { $('autoToggle').textContent = (autoCollapse ? '☑' : '☐') + ' Auto-Einklappen'; }
$('autoToggle').onclick = e => {
  e.preventDefault();
  e.stopPropagation();
  autoCollapse = !autoCollapse;
  localStorage.setItem('autoCollapseQueue', autoCollapse ? '1' : '0');
  renderAuto();
};
renderAuto();

$('send').onclick = send;
$('finishShopping').onclick = finishShopping;
$('checkout').onclick = checkout;
$('shopDialog').addEventListener('cancel', event => event.preventDefault());
$('restock').onclick = emergencyRestock;
for (let i = 0; i < 3; i++) state.queue.push(generateCustomer());
render();
let lastT = performance.now();
setInterval(() => {
  const now = performance.now();
  tick(Math.min((now - lastT) / 1000, 1));
  lastT = now;
}, 250);
