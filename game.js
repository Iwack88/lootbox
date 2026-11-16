const $ = id => document.getElementById(id);

const ATTRS = {
  hp:    { name: 'Leben',    icon: '❤️' },
  melee: { name: 'Nahkampf', icon: '⚔️' },
  magic: { name: 'Magie',    icon: '🔮' },
  armor: { name: 'Rüstung',  icon: '🛡️' },
};

// Größere Items sind pro Slot effizienter, kosten aber deutlich mehr Gold.
const ITEMS = [
  { id: 'pot1',   name: 'Kleiner Heiltrank', icon: '🧪', attr: 'hp',    value: 10, slots: 1, cost: 5 },
  { id: 'pot2',   name: 'Heiltrank',         icon: '🧪', attr: 'hp',    value: 25, slots: 2, cost: 18 },
  { id: 'pot3',   name: 'Großer Heiltrank',  icon: '🍶', attr: 'hp',    value: 50, slots: 3, cost: 45 },
  { id: 'dag',    name: 'Dolch',             icon: '🗡️', attr: 'melee', value: 8,  slots: 1, cost: 6 },
  { id: 'sword',  name: 'Schwert',           icon: '⚔️', attr: 'melee', value: 20, slots: 2, cost: 22 },
  { id: 'shield', name: 'Holzschild',        icon: '🛡️', attr: 'armor', value: 10, slots: 1, cost: 8 },
  { id: 'plate',  name: 'Plattenrüstung',    icon: '🥋', attr: 'armor', value: 30, slots: 3, cost: 40 },
  { id: 'wand',   name: 'Zauberstab',        icon: '🪄', attr: 'magic', value: 15, slots: 1, cost: 10 },
];

const NEED_WEIGHT = { 3: 3, 2: 2, 1: 1 };
const PRIO_LABEL = { 3: 'sehr wichtig', 2: 'wichtig', 1: 'gering' };

const CUSTOMERS = [
  { name: 'Krieger Willi', icon: '🪓', needs: [ { attr: 'hp', prio: 3, target: 50 }, { attr: 'melee', prio: 2, target: 20 }, { attr: 'armor', prio: 3, target: 20 } ] },
  { name: 'Magierin Luna', icon: '🧙‍♀️', needs: [ { attr: 'magic', prio: 3, target: 30 }, { attr: 'hp', prio: 2, target: 25 }, { attr: 'armor', prio: 1, target: 10 } ] },
  { name: 'Schurke Finn',  icon: '🥷', needs: [ { attr: 'melee', prio: 3, target: 28 }, { attr: 'hp', prio: 2, target: 20 } ] },
];

const state = { gold: 30, exp: 0, slots: 4, box: [], customer: null };

function newCustomer() {
  state.customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  state.box = [];
}

const usedSlots = () => state.box.reduce((s, i) => s + i.slots, 0);

function totals() {
  const t = {};
  for (const it of state.box) t[it.attr] = (t[it.attr] || 0) + it.value;
  return t;
}

// Erfüllung je Need auf 100% gedeckelt; Gesamtqualität nach Wichtigkeit gewichtet.
function quality() {
  const t = totals();
  let sum = 0, wsum = 0;
  for (const n of state.customer.needs) {
    const w = NEED_WEIGHT[n.prio];
    sum += w * Math.min(1, (t[n.attr] || 0) / n.target);
    wsum += w;
  }
  return sum / wsum;
}

const rewardFor = q => ({ gold: 10 + Math.round(q * 30), exp: 5 + Math.round(q * 15) });

function buy(id) {
  const it = ITEMS.find(i => i.id === id);
  if (state.gold < it.cost || usedSlots() + it.slots > state.slots) return;
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

function send() {
  const q = quality();
  const r = rewardFor(q);
  state.gold += r.gold;
  state.exp += r.exp;
  const label = q >= 0.9 ? 'Perfekt!' : q >= 0.6 ? 'Gut' : q >= 0.3 ? 'Geht so' : 'Schlecht';
  $('result').innerHTML = `
    <h1>${label}</h1>
    <div>Erfüllung: ${Math.round(q * 100)}%</div>
    <div>💰 +${r.gold} &nbsp; ⭐ +${r.exp}</div>
    <button class="primary" id="next">Nächster Kunde</button>`;
  $('result').classList.remove('hidden');
  $('next').onclick = () => { $('result').classList.add('hidden'); newCustomer(); render(); };
}

function render() {
  const c = state.customer, t = totals();
  $('gold').textContent = state.gold;
  $('exp').textContent = state.exp;

  $('customer').innerHTML = `<h2>${c.icon} ${c.name}</h2>` + c.needs.map(n => {
    const have = t[n.attr] || 0;
    const pct = Math.min(100, have / n.target * 100);
    return `<div class="need">
      <div class="need-head"><span>${ATTRS[n.attr].icon} ${ATTRS[n.attr].name} <span class="prio p${n.prio}">${PRIO_LABEL[n.prio]}</span></span><span>${have}/${n.target}</span></div>
      <div class="bar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  const cells = [];
  state.box.forEach((it, i) => {
    for (let s = 0; s < it.slots; s++) {
      cells.push(`<div class="slot item" data-i="${i}">${s === 0 ? it.icon : '▪️'}</div>`);
    }
  });
  while (cells.length < state.slots) cells.push('<div class="slot"></div>');
  $('box').innerHTML = cells.join('');
  $('box').querySelectorAll('.item').forEach(el => el.onclick = () => removeFromBox(+el.dataset.i));
  $('slotInfo').textContent = `${usedSlots()}/${state.slots} Slots`;

  const q = quality(), r = rewardFor(q);
  $('preview').textContent = `Aktuell: ${Math.round(q * 100)}% → 💰 ${r.gold}  ⭐ ${r.exp}`;

  $('shop').innerHTML = ITEMS.map(it => {
    const off = state.gold < it.cost || usedSlots() + it.slots > state.slots;
    return `<button class="shop-item" data-id="${it.id}" ${off ? 'disabled' : ''}>
      <span class="ico">${it.icon}</span>
      <span class="txt">${it.name}<small>${ATTRS[it.attr].icon} +${it.value} · ${it.slots} Slot${it.slots > 1 ? 's' : ''}</small></span>
      <span class="cost">💰 ${it.cost}</span>
    </button>`;
  }).join('');
  $('shop').querySelectorAll('.shop-item').forEach(el => el.onclick = () => buy(el.dataset.id));
}

$('send').onclick = send;
newCustomer();
render();
