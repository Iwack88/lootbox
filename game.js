const $ = id => document.getElementById(id);

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
  return { id: nextId++, name: pick(NAMES), cls: base.cls, icon: base.icon, needs, rarity, timeLeft: def.time, maxTime: def.time };
}

const state = { gold: 100, exp: 0, boxType: null, box: [], active: null, queue: [], spawnT: 0 };

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
  return { gold: Math.round((10 + q * 30) * m), exp: Math.round((5 + q * 15) * m) };
};

function refundBox() {
  for (const it of state.box) state.gold += it.cost;
  state.box = [];
}

function buy(id) {
  const it = ITEMS.find(i => i.id === id);
  if (!state.active || !state.boxType || state.gold < it.cost || usedWeight() + it.weight > capacity()) return;
  state.gold -= it.cost;
  state.box.push(it);
  render();
}

// Entfernen erstattet den vollen Preis, damit Probieren nichts kostet.
function removeFromBox(index) {
  const [it] = state.box.splice(index, 1);
  state.gold += it.cost;
  render();
}

// Der bisher aktive Kunde nimmt den Platz des gewählten in der Liste ein; seine Zeit läuft dort weiter.
function selectCustomer(id) {
  const i = state.queue.findIndex(c => c.id === id);
  if (i < 0) return;
  const chosen = state.queue[i];
  refundBox();
  if (state.active) state.queue[i] = state.active;
  else state.queue.splice(i, 1);
  state.active = chosen;
  state.boxType = null;
  if (autoCollapse) {
    $('queueCard').open = false;
    for (const id of ['custCard', 'pickCard', 'boxCard']) $(id).open = true;
    $('shopCard').open = false;
  }
  render();
}

function chooseBox(id) {
  const type = BOXES.find(b => b.id === id);
  if (!state.active || !type || state.exp < type.exp) return;
  refundBox();
  state.boxType = type;
  $('shopCard').open = true;
  render();
}

function send() {
  if (!state.active || !state.boxType) return;
  const q = quality();
  const r = rewardFor(q, state.active);
  state.gold += r.gold;
  state.exp += r.exp;
  state.box = [];
  state.boxType = null;
  state.active = null;
  const label = q >= 0.9 ? 'Perfekt!' : q >= 0.6 ? 'Gut' : q >= 0.3 ? 'Geht so' : 'Schlecht';
  $('result').innerHTML = `
    <h1>${label}</h1>
    <div>Erfüllung: ${Math.round(q * 100)}%</div>
    <div>💰 +${r.gold} &nbsp; ⭐ +${r.exp}</div>
    <button class="primary" id="next">Weiter</button>`;
  $('result').classList.remove('hidden');
  $('next').onclick = () => {
    $('result').classList.add('hidden');
    if (autoCollapse) $('queueCard').open = true;
    render();
  };
}

function tick(dt) {
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

function renderQueue() {
  $('queue').innerHTML = state.queue.length ? state.queue.map(c => {
    const needs = c.needs.map(n => `<span class="need-icons">${ATTRS[n.attr].icon.repeat(n.prio)}</span>`).join('');
    const m = RARITY[c.rarity].mult;
    return `<button class="queue-item r-${c.rarity}" data-cid="${c.id}">
      <span class="ico">${c.icon}</span>
      <span class="txt">${c.name} <small>${c.cls}</small><span class="needs">${needs}</span></span>
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
  $('exp').textContent = state.exp;

  $('customer').innerHTML = c
    ? `<div class="cust-name r-${c.rarity}">${c.icon} ${c.name} <small>${c.cls} · ${RARITY[c.rarity].label}</small></div>` + needsHtml(c, totals())
    : '<div class="empty">Wähle einen Kunden aus der Liste</div>';

  const used = usedWeight();
  $('box').innerHTML = state.box.length
    ? state.box.map((it, i) => `<button class="box-item" data-i="${i}"><span class="ico">${it.icon}</span><span class="txt">${it.name}</span><span class="kg">${it.weight} kg ✕</span></button>`).join('')
    : `<div class="empty">${state.boxType ? 'Leer – kaufe Items im Shop' : 'Wähle zuerst eine Box'}</div>`;
  $('box').querySelectorAll('.box-item').forEach(el => el.onclick = () => removeFromBox(+el.dataset.i));
  $('slotInfo').textContent = state.boxType ? `${used}/${capacity()} kg` : '';
  $('weightBar').style.width = capacity() ? `${used / capacity() * 100}%` : '0%';
  $('weightBar').classList.toggle('full', capacity() > 0 && used >= capacity());

  if (c) {
    const q = quality(), r = rewardFor(q, c);
    const itemCost = state.box.reduce((sum, item) => sum + item.cost, 0);
    const netGold = r.gold - itemCost;
    $('preview').innerHTML = `Aktuell: ${Math.round(q * 100)}% → 💰 ${r.gold}  ⭐ ${r.exp}<br>
      <span class="item-cost">Itemkosten: ${itemCost} 💰</span>
      <span class="net-gold${netGold < 0 ? ' loss' : ''}"> · Netto: ${netGold >= 0 ? '+' : ''}${netGold} 💰</span>`;
  } else {
    $('preview').textContent = '';
  }
  $('send').disabled = !c || !state.boxType;

  $('shop').innerHTML = ITEMS.map(it => {
    const off = !c || !state.boxType || state.gold < it.cost || used + it.weight > capacity();
    return `<button class="shop-item" data-id="${it.id}" ${off ? 'disabled' : ''}>
      <span class="ico">${it.icon}</span>
      <span class="txt">${it.name}<small>${ATTRS[it.attr].icon} +${it.value} · ${it.weight} kg</small></span>
      <span class="cost">💰 ${it.cost}</span>
    </button>`;
  }).join('');
  $('shop').querySelectorAll('.shop-item').forEach(el => el.onclick = () => buy(el.dataset.id));
  renderPicker();
  renderQueue();
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
for (let i = 0; i < 3; i++) state.queue.push(generateCustomer());
render();
let lastT = performance.now();
setInterval(() => {
  const now = performance.now();
  tick(Math.min((now - lastT) / 1000, 1));
  lastT = now;
}, 250);
