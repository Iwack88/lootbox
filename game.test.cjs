const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function createGame(options = {}) {
  const elements = new Map();
  const storage = options.storage || new Map();
  const intervals = [];
  const context = vm.createContext({
    AudioContext: options.AudioContext,
    console: { ...console, ...options.console },
    Date: class extends Date { static now() { return options.now ? options.now() : 1_700_000_000_000; } },
    window: {
      listeners: {},
      location: { reload() { this.reloaded = true; } },
      addEventListener(type, listener) { this.listeners[type] = listener; },
    },
    intervals,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    document: {
      hidden: false,
      listeners: {},
      addEventListener(type, listener) {
        const previous = this.listeners[type];
        this.listeners[type] = event => { previous?.(event); return listener(event); };
      },
      querySelector: () => null,
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            classList: { add() {}, remove() {}, toggle() {} },
            style: {},
            listeners: {},
            querySelectorAll: () => [],
            querySelector: () => null,
            addEventListener(type, listener) { this.listeners[type] = listener; },
            setAttribute(name, value) { this[name] = value; },
            showModal() { this.open = true; },
            close() { this.open = false; },
            focus() {},
          });
        }
        return elements.get(id);
      },
    },
    localStorage: options.localStorage || {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    confirm: options.confirm || (() => true),
    performance: { now: () => 0 },
    setInterval(callback) { intervals.push(callback); },
  });
  for (const file of ['sound.js', 'game.js']) {
    let source = readFileSync(`${__dirname}/${file}`, 'utf8');
    // Historical fixtures exercise preserved systems; live milestone tests leave both systems disabled.
    if (file === 'game.js' && options.legacyMerchant !== false) source = source.replace('const MERCHANT_ENABLED = false;', 'const MERCHANT_ENABLED = true;');
    if (file === 'game.js' && options.legacyStreak !== false) source = source.replace('const STREAK_ENABLED = false;', 'const STREAK_ENABLED = true;');
    vm.runInContext(source, context);
  }
  return code => vm.runInContext(code, context);
}

function fakeAudio(options = {}) {
  const contexts = [];
  const param = () => ({
    events: [],
    setValueAtTime(...args) { this.events.push(['set', ...args]); },
    linearRampToValueAtTime(...args) { this.events.push(['ramp', ...args]); },
    cancelScheduledValues(...args) { this.events.push(['cancel', ...args]); },
    setTargetAtTime(...args) { this.events.push(['target', ...args]); },
  });
  class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 1;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      contexts.push(this);
    }
    resume() {
      if (options.failResume) return Promise.reject(new Error('Audio blocked'));
      this.state = 'running';
      return Promise.resolve();
    }
    createGain() {
      const gain = { gain: param(), connect() {}, disconnect() { this.disconnected = true; } };
      this.gains.push(gain);
      return gain;
    }
    createOscillator() {
      if (options.failOscillator) throw new Error('Audio output failed');
      const oscillator = {
        frequency: param(),
        connect() {},
        disconnect() { this.disconnected = true; },
        start(time) { this.startTime = time; },
        stop(time) { this.stopTime = time; },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
  }
  return { contexts, AudioContext };
}

function createShoppingGame(options = {}) {
  const run = createGame(options);
  // Broad purchase fixtures exercise inventory mechanics independently of the random assortment.
  run('state.inventory = {}; state.exp = expForLevel(7); state.shopping = true; state.shopOffers = ITEMS.map(item => item.id); render();');
  return run;
}

function createOrderingGame(options = {}) {
  return createGame({ ...options, legacyMerchant: false });
}

function createMilestoneGame(options = {}) {
  return createOrderingGame({ ...options, legacyStreak: false });
}

test('sponsoring unlocks at 25, persists the candidates and uses regular customer loot in a separate packing flow', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run("$('openSponsor').onclick()");
  assert.equal(run("$('sponsorCard').hidden"), true);
  assert.equal(run('state.sponsorship'), null);
  run("state.exp = expForLevel(25); render(); $('openSponsor').onclick()");
  assert.equal(run(`SPONSOR_STAGES.every(stage => stage.routes.every(route => {
    const item = ITEMS.find(item => item.id === route.item);
    return isUnlocked(item) && !canOrder(item) && CUSTOMER_TIERS.some(tier => tier.reward.ids.includes(item.id));
  }))`), true, 'each route depends on equipment available through normal customer rewards');
  assert.equal(run("$('sponsorDialog').open"), true);
  assert.equal(run('new Set(state.sponsorship.candidates).size'), 3);
  const candidates = run('JSON.stringify(state.sponsorship.candidates)');
  const restored = createMilestoneGame({ storage });
  assert.equal(restored('JSON.stringify(state.sponsorship.candidates)'), candidates);
  restored(`openSponsorship(); chooseSponsor(state.sponsorship.candidates[0]);
    globalThis.routes = [0,1].map(route => ({dataset:{route:String(route)}}));
    $('sponsorContent').querySelectorAll = () => routes; renderSponsorship(); routes[1].onclick();`);
  assert.match(restored("$('sponsorContent').innerHTML"), /Glutamulett/);
  restored("routes[0].onclick(); $('startSponsorPacking').onclick(); packItem('pot1', 2); $('send').onclick()");
  assert.equal(restored('state.sponsorship.trip'), null);
  assert.equal(restored("$('send').disabled"), true);
  assert.equal(restored('state.active'), null);
  assert.equal(restored('state.queue.length'), 4);
  const packing = createMilestoneGame({ storage });
  assert.equal(packing('state.boxType === SPONSOR_BOX && state.boxPositions[0] === 2'), true);
  assert.match(packing("$('preview').innerHTML"), /Fehlt: .*Schwert/);
  packing("$('backToBoxes').onclick()");
  assert.equal(packing('state.inventory.pot1'), 5);
  assert.equal(packing('state.boxType'), null);
  assert.equal(packing("$('sponsorDialog').open"), true);
  packing(`$('closeSponsor').onclick(); selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp',target:10,prio:1}];
    state.active.itemReward = {quality: .5, item: ITEMS.find(item => item.id === 'sword')};
    packItem('pot1'); send(); $('next').onclick();`);
  assert.equal(packing('state.inventory.sword'), 1);
  packing('openSponsorship(); startSponsorPacking(); packItem("sword"); send()');
  assert.equal(packing('state.inventory.sword'), 0);
  assert.equal(packing('state.queue.length'), 3);
  assert.equal(packing('state.sponsorship.trip.quality'), 21);
});

test('expeditions resolve offline once, recovery starts at arrival, and three successes finish the chapter', () => {
  const storage = new Map();
  let now = 1_700_000_000_000;
  const options = { storage, now: () => now };
  const run = createMilestoneGame(options);
  run(`state.exp = expForLevel(25); openSponsorship(); chooseSponsor(state.sponsorship.candidates[0]);
    state.sponsorship.route = 0; state.inventory.sword = 3; render();`);
  now += 48 * 60 * 60000;
  const waiting = createMilestoneGame(options);
  assert.equal(waiting('state.sponsorship.hp'), 3);
  waiting('startSponsorPacking(); packItem("sword"); send();');
  now += 30 * 60000 - 1;
  const traveling = createMilestoneGame(options);
  assert.equal(traveling('state.sponsorship.hp'), 3);
  now++;
  traveling('intervals[0]()');
  assert.equal(traveling('state.sponsorship.hp'), 1);
  assert.equal(traveling('state.sponsorship.stage'), 0);
  traveling('startSponsorPacking(); packItem("sword"); send()');
  now += 30 * 60000 + 4 * 60 * 60000 - 1;
  const recovering = createMilestoneGame(options);
  assert.equal(recovering('state.sponsorship.hp'), 0);
  recovering('startSponsorPacking()');
  assert.equal(recovering('state.boxType'), null);
  now++;
  recovering('intervals[0]()');
  assert.equal(recovering('state.sponsorship.hp'), 3);
  assert.equal(recovering('state.gold'), 500);
  const loadouts = [
    ['sword','sword','dag','pot1','pot1','pot1'],
    ['restorationDraught','pot2','shield','shield','shield','shield'],
    ['plate','plate','warhammer','dag','pot2','pot1'],
  ];
  let game = recovering;
  for (const [stage, items] of loadouts.entries()) {
    game(`state.sponsorship.route = 0; startSponsorPacking();
      for (const id of ${JSON.stringify(items)}) { state.inventory[id] = 1; packItem(id); } send();`);
    now = game('state.sponsorship.trip.finishAt');
    game = createMilestoneGame(options);
    assert.equal(game('state.sponsorship.stage'), stage + 1);
  }
  assert.equal(game('state.gold'), 575);
  assert.equal(game('state.exp - expForLevel(25)'), 45);
  game('openSponsorship()');
  assert.match(game("$('sponsorContent').innerHTML"), /Level 4.*Kapitel abgeschlossen/s);
  assert.equal(createMilestoneGame(options)('state.gold'), 575);
});

test('customers can be recruited for 10 gold only when a queue place and enough gold are available', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  assert.equal(run("$('recruitCustomer').disabled"), true);
  assert.match(run("$('recruitStatus').textContent"), /Alle Kundenplätze sind belegt/);
  run('state.gold = 9; render()');
  assert.equal(run("$('recruitCustomer').disabled"), true);
  run('state.queue.pop(); state.spawnT = 23; render()');
  assert.equal(run("$('recruitCustomer').disabled"), true);
  assert.match(run("$('recruitStatus').textContent"), /Noch 1 Gold/);
  const before = run('JSON.stringify(state.queue)');
  run("$('recruitCustomer').onclick()");
  assert.equal(run('JSON.stringify(state.queue)'), before);
  assert.equal(run('state.gold'), 9);
  run('state.gold = 10; render()');
  assert.equal(run("$('recruitCustomer').disabled"), false);
  run("$('recruitCustomer').onclick()");
  assert.equal(run('state.gold'), 0);
  assert.equal(run('state.queue.length'), 4);
  assert.equal(run('state.spawnT'), run('SPAWN_INTERVAL'));
  assert.equal(run('state.queue.every(customer => NAMES.includes(customer.name) && CUSTOMER_TIERS.some(tier => tier.id === customer.tier))'), true);
  assert.equal(run("$('recruitCustomer').disabled"), true);
  const reloaded = createMilestoneGame({ storage });
  assert.equal(reloaded('state.gold'), 0);
  assert.equal(reloaded('state.queue.length'), 4);
});

test('need bars identify their attribute while preserving progress values', () => {
  const run = createMilestoneGame();
  const html = run(`needsHtml({needs: [
    {attr:'hp', target:20, prio:2},
    {attr:'magic', target:10, prio:1},
    {attr:'armor', target:8, prio:3}
  ]}, {hp:10, magic:0, armor:12})`);
  assert.match(html, /Leben.*wichtig.*10\/20[\s\S]*?need-bar-hp"><div style="width:50%"/);
  assert.match(html, /Magie.*gering.*0\/10[\s\S]*?need-bar-magic"><div style="width:0%"/);
  assert.match(html, /Rüstung.*sehr wichtig.*12\/8[\s\S]*?need-bar-armor"><div style="width:100%"/);
});

test('individual slots retain their positions after reload and return items on tap', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run(`selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:20, prio:2}]; render();`);
  assert.equal((run("$('box').innerHTML").match(/data-slot=/g) || []).length, 3);
  run('openBoxSlot(2)');
  assert.equal(run('selectedSlot'), 2);
  assert.equal(run("$('packingNeeds').hidden"), false);
  assert.match(run("$('packingNeedValues').innerHTML"), /Leben.*wichtig.*0\/20/);
  assert.match(run("$('inventory').innerHTML"), /data-pack-item="pot1"/);
  assert.match(run("$('inventory').innerHTML"), /Kleiner Heiltrank, Vorrat: 5/);
  assert.match(run("$('inventory').innerHTML"), /assets\/art\/healing-potion\.svg/);
  assert.match(run("$('inventory').innerHTML"), /assets\/art\/short-sword\.svg/);
  assert.match(run("$('inventory').innerHTML"), /assets\/art\/wooden-shield\.svg/);
  assert.match(run("$('inventory').innerHTML"), /aria-hidden="true">🪄/);
  run(`globalThis.potionIcon = { dataset: { packItem: 'pot1' } };
    $('inventory').querySelectorAll = () => [potionIcon];
    renderInventory(); potionIcon.onclick();`);
  assert.match(run("$('packingItemDetails').innerHTML"), /Leben: \+10/);
  assert.equal(run('state.inventory.pot1'), 4);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.boxPositions)')), [2]);
  assert.match(run("$('box').innerHTML"), /Slot 3: Kleiner Heiltrank/);
  assert.match(run("$('box').innerHTML"), /assets\/art\/healing-potion\.svg/);
  assert.match(run("$('packingNeedValues').innerHTML"), /10\/20/);
  assert.match(run("$('preview').innerHTML"), /Aktuell: 50%/);
  run('openBoxSlot(1)');
  assert.match(run("$('packingNeedValues').innerHTML"), /Leben.*wichtig.*10\/20/);
  run("packItem('dag', 0); packItem('dag', 0); packItem('dag', 3)");
  assert.equal(run('state.box.length'), 2);
  const restored = createMilestoneGame({ storage });
  assert.deepEqual(JSON.parse(restored('JSON.stringify(state.boxPositions)')), [2,0]);
  restored('openBoxSlot(2)');
  assert.equal(restored('state.inventory.pot1'), 5);
  assert.equal(restored('selectedSlot'), 2);
  assert.deepEqual(JSON.parse(restored('JSON.stringify(state.boxPositions)')), [0]);
  assert.match(restored("$('box').innerHTML"), /Slot 3: leer/);
  restored('backToBoxes()');
  assert.equal(restored('state.inventory.dag'), 5);
  assert.equal(restored('state.boxPositions.length'), 0);
});

test('tapping inventory packs immediately, updates needs, and does not overfill the box', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run(`selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:20, prio:2}, {attr:'melee', target:16, prio:1}];
    packItem('pot1', 0);
    globalThis.icons = ['pot1', 'dag'].map(packItem => ({ dataset: { packItem } }));
    $('inventory').querySelectorAll = () => icons;
    openBoxSlot(1);`);
  const key = run('SAVE_KEY');
  const saved = storage.get(key);
  run('icons[0].onclick()');
  assert.match(run("$('packingNeedValues').innerHTML"), /20\/20/);
  assert.match(run("$('packingNeedValues').innerHTML"), /width:100%/);
  assert.notEqual(storage.get(key), saved);
  run('icons[1].onclick()');
  assert.match(run("$('packingNeedValues').innerHTML"), /8\/16/);
  assert.equal(run('state.box.length'), 3);
  const fullSave = storage.get(key);
  run('icons[1].onclick()');
  assert.equal(storage.get(key), fullSave);
  assert.match(run("$('packingItemDetails').innerHTML"), /Kiste voll/);
  assert.equal(run('state.inventory.dag'), 4);
  run('openBoxSlot(2)');
  assert.match(run("$('packingNeedValues').innerHTML"), /0\/16/);
  assert.equal(run('state.inventory.dag'), 5);
});

test('old saves restore packed items in sequential slots and invalid slot positions cannot overwrite a save', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1'); packItem('dag');");
  const key = run('SAVE_KEY');
  const old = JSON.parse(storage.get(key));
  delete old.state.boxPositions;
  storage.set(key, JSON.stringify(old));
  const restored = createMilestoneGame({ storage });
  assert.deepEqual(JSON.parse(restored('JSON.stringify(state.boxPositions)')), [0,1]);
  for (const positions of [[1,1], [0,3], [0], [0,'1'], null]) {
    const invalid = JSON.parse(JSON.stringify(old));
    invalid.state.boxPositions = positions;
    const raw = JSON.stringify(invalid);
    storage.set(key, raw);
    const rejected = createMilestoneGame({ storage, console: { error() {} } });
    assert.equal(rejected('savingBlocked'), true);
    assert.equal(storage.get(key), raw);
  }
});

test('inventory icon selection shows order details and preserves filter, stock and order controls', () => {
  const run = createMilestoneGame();
  run("openSupply(); selectedSupplyItem = 'bandage'; renderSupply()");
  assert.match(run("$('supplyInventory').innerHTML"), /data-supply-item="bandage"/);
  assert.match(run("$('supplyItemDetails').innerHTML"), /Verband/);
  assert.match(run("$('supplyItemDetails').innerHTML"), /Leben: \+6/);
  assert.match(run("$('supplyItemDetails').innerHTML"), /Bestellen · 3 Gold/);
  run("placeOrder('bandage', 1)");
  assert.match(run("$('supplyItemDetails').innerHTML"), /Verband/);
  assert.equal(run('state.orders.length'), 1);
  run("state.inventory.runeblade = 1; selectedSupplyItem = 'runeblade'; renderSupply()");
  assert.match(run("$('supplyItemDetails').innerHTML"), /Nicht bestellbar/);
  run("state.inventory.runeblade = 0; renderSupply()");
  assert.equal(run('selectedSupplyItem'), null);
});

test('the options test button advances one level per click and saves normal rewards and unlocks', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run("state.exp = 90; render(); $('openOptions').onclick(); $('raiseTestLevel').onclick()");
  assert.equal(run('progression().level'), 2);
  assert.equal(run('progression().current'), 0);
  assert.equal(run('state.inventory.bandage'), 3);
  assert.match(run("$('testLevelStatus').textContent"), /Level 2/);
  run("$('raiseTestLevel').onclick(); $('raiseTestLevel').onclick()");
  assert.equal(run("$('optionsDialog').open"), true);
  assert.equal(run('progression().level'), 4);
  assert.equal(run("$('openWorkshop').disabled"), false);
  const restored = createMilestoneGame({ storage });
  assert.equal(restored('progression().level'), 4);
  assert.equal(restored('state.inventory.bandage'), 3);
  assert.equal(restored("$('openWorkshop').disabled"), false);
});

test('options open and close without changing progress, and normal save messages stay inside options', () => {
  const run = createMilestoneGame();
  const saved = run('JSON.stringify(state)');
  run("$('openOptions').onclick()");
  assert.equal(run("$('optionsDialog').open"), true);
  assert.match(run("$('saveStatus').textContent"), /Automatisch lokal gespeichert/);
  assert.equal(run("$('saveStatus').hidden"), false);
  for (const id of ['saveAlert', 'orderSaveStatus', 'shopSaveStatus', 'workshopSaveStatus', 'supplySaveStatus']) {
    assert.equal(run(`$('${id}').hidden`), true);
  }
  run("$('closeOptions').onclick()");
  assert.equal(run("$('optionsDialog').open"), false);
  assert.equal(run('JSON.stringify(state)'), saved);
});

test('canceling reset preserves the save and accepting resets only this game without pagehide recreating it', () => {
  let accept = false;
  const storage = new Map([['soundEnabled', '0'], ['unrelated', 'keep']]);
  const run = createMilestoneGame({ storage, confirm: () => accept });
  run(`state.exp = expForLevel(10); state.gold = 1000; state.materials.cloth = 4;
    startCraft('bandage'); placeOrder('bandage',2);
    selectCustomer(state.queue[0].id); chooseBox('medium'); packItem('pot1');`);
  const key = run('SAVE_KEY');
  const saved = storage.get(key);
  run("$('resetGame').onclick()");
  assert.equal(storage.get(key), saved);
  assert.notEqual(run('window.location.reloaded'), true);
  assert.equal(run('savingBlocked'), false);
  accept = true;
  run("$('resetGame').onclick(); window.listeners.pagehide(); render(); intervals[0]()");
  assert.equal(run('window.location.reloaded'), true);
  assert.equal(storage.has(key), false);
  assert.equal(storage.get('soundEnabled'), '0');
  assert.equal(storage.get('unrelated'), 'keep');
  const fresh = createMilestoneGame({ storage });
  assert.equal(fresh('state.exp'), 0);
  assert.equal(fresh('state.orders.length + state.crafts.length + state.box.length'), 0);
  assert.equal(fresh('state.active'), null);
  assert.equal(fresh('JSON.stringify(state.inventory)'), createMilestoneGame()('JSON.stringify(state.inventory)'));
});

test('reset can recover a corrupt save and reports deletion failures without reloading or unblocking stale saves', () => {
  const storage = new Map([['lootboxPacker.save', '{broken']]);
  const broken = createMilestoneGame({ storage, console: { error() {} } });
  assert.equal(broken('savingBlocked'), true);
  broken("$('resetGame').onclick()");
  assert.equal(storage.has(broken('SAVE_KEY')), false);
  assert.equal(createMilestoneGame({ storage })('savingBlocked'), false);
  for (const blocked of [false, true]) {
    const errors = [];
    const failed = createMilestoneGame({
      console: { error: (...args) => errors.push(args) },
      localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem() { throw new Error('Storage denied'); },
      },
    });
    const saved = storage.get(failed('SAVE_KEY'));
    failed(`savingBlocked = ${blocked}; $('resetGame').onclick()`);
    assert.equal(failed('savingBlocked'), blocked);
    assert.notEqual(failed('window.location.reloaded'), true);
    assert.equal(storage.get(failed('SAVE_KEY')), saved);
    assert.equal(failed("$('resetMessage').hidden"), false);
    assert.match(failed("$('resetMessage').textContent"), /Zurücksetzen fehlgeschlagen/);
    assert.equal(failed("$('saveAlert').hidden"), false);
    assert.equal(errors.length, 1);
  }
});

test('the reused milestone track always shows the next five levels with working detail buttons', () => {
  const run = createMilestoneGame();
  for (const [level, expected] of [[1, [2,3,4,5,6]], [8, [9,10,11,12,13]], [20, [21,22,23,24,25]],
    [23, [24,25]], [25, []], [28, []]]) {
    run(`state.exp = expForLevel(${level}); render()`);
    const html = run("$('streakCheckpoints').innerHTML");
    const actual = [...html.matchAll(/data-level-milestone="(\d+)"/g)].map(match => Number(match[1]));
    assert.deepEqual(actual, expected);
    assert.doesNotMatch(html, /data-checkpoint|streakDialog/);
    assert.equal(run("$('streakPoints').textContent"), level);
  }
  run(`state.exp = expForLevel(8) + 400; globalThis.buttons = [9,10,11,12,13].map(level =>
    ({dataset: {levelMilestone: String(level)}}));
    $('streakCheckpoints').querySelectorAll = () => buttons; render(); buttons[2].onclick();`);
  assert.equal(run("$('roadmapDialog').open"), true);
  assert.match(run("$('roadmap').innerHTML"), /id="level-milestone-11"[^>]*selected-checkpoint/);
  assert.equal(run("$('streakProgress').value"), .5);
  assert.match(run("$('streakNext').textContent"), /400 EXP fehlen/);
  assert.equal((run("$('roadmap').innerHTML").match(/id="level-milestone-/g) || []).length, 25);
  run("$('closeRoadmap').onclick(); $('showStreak').onclick()");
  assert.equal(run("$('roadmapDialog').open"), true);
  assert.notEqual(run("$('streakDialog').open"), true);
});

test('streaks no longer award points, packages, sounds or result and preview text', () => {
  const run = createMilestoneGame();
  run(`state.streak = 9; globalThis.stock = JSON.stringify(state.inventory); changeStreak(20); render();`);
  assert.equal(run('state.streak'), 9);
  assert.equal(run('JSON.stringify(state.inventory)'), run('stock'));
  assert.equal(run('state.claimedCheckpoints.length'), 0);
  run(`selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}]; packItem('pot1');
    globalThis.sounds = []; sfx.play = name => sounds.push(name);`);
  assert.doesNotMatch(run("$('preview').innerHTML"), /Serienpunkte|streak-preview/);
  assert.equal(run('rewardFor(quality(), state.active).points'), 0);
  run('send()');
  assert.equal(run('state.streak'), 9);
  assert.equal(run('state.claimedCheckpoints.length'), 0);
  assert.doesNotMatch(run("$('result').innerHTML"), /Serie:|Serienpunkte|Checkpunkt/);
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), ['send']);
});

test('live unlocks reach level 25, every level has a milestone, and item pools remain valid', () => {
  const run = createMilestoneGame();
  for (let level = 1; level <= 25; level++) {
    run(`state.exp = expForLevel(${level})`);
    assert.ok(run(`unlocksAtLevel(${level}).length`) > 0, `Level ${level} has a reward or unlock`);
    assert.equal(run(`Array.from({length: 30}, () => generateCustomer()).every(customer =>
      CUSTOMER_TIERS.find(tier => tier.id === customer.tier).level <= progression().level &&
      (!customer.itemReward.item || isUnlocked(customer.itemReward.item)))`), true);
  }
  assert.equal(run("CUSTOMER_TIERS.find(tier => tier.id === 'demigod').level"), 25);
  assert.equal(run("CUSTOMER_TIERS.find(tier => tier.id === 'hero').level"), 18);
  assert.equal(run('WORKSHOP_LEVEL'), 4);
  assert.equal(run('WORKSHOP_SPEED_LEVEL'), 14);
  assert.equal(run('Math.max(...ITEMS.map(item => item.level))'), 18);
  run('state.exp = expForLevel(13); renderWorkshop()');
  assert.equal(run('workshopCapacity()'), 2);
  run("state.exp = expForLevel(24); selectCustomer(state.queue[0].id); chooseBox('expedition')");
  assert.equal(run('capacity()'), 8);
});

test('level-up packages are automatic, persisted once, and crossing several levels grants each reward once', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run(`state.exp = 95; selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.itemReward = {quality: .5, item: ITEMS.find(item => item.id === 'pot1')};
    state.active.needs = [{attr:'hp', target:10, prio:1}]; packItem('pot1'); send();`);
  assert.equal(run('progression().level'), 2);
  assert.equal(run('state.inventory.bandage'), 3);
  assert.equal(run('state.inventory.leatherCap'), 3);
  assert.equal(run('state.inventory.sparkStone'), 3);
  assert.match(run("$('result').innerHTML"), /Level 2: Itempaket/);
  const reloaded = createMilestoneGame({ storage });
  assert.equal(reloaded('state.inventory.bandage'), 3);
  reloaded('grantLevelRewards(1,2); render()');
  assert.equal(reloaded('state.inventory.bandage'), 3);
  reloaded(`state.exp = expForLevel(25); grantLevelRewards(2,25); render();`);
  assert.deepEqual(JSON.parse(reloaded('JSON.stringify(state.levelDiscounts)')), [10,10,15,15,20]);
  assert.equal(reloaded('state.inventory.righteousShield'), 1);
  assert.equal(reloaded('state.inventory.pot3'), 2);
  const stock = reloaded('JSON.stringify(state.inventory)');
  reloaded('grantLevelRewards(1,25)');
  assert.equal(reloaded('JSON.stringify(state.inventory)'), stock);
  assert.deepEqual(JSON.parse(createMilestoneGame({ storage })('JSON.stringify(state.levelDiscounts)')), [10,10,15,15,20]);
});

test('level discounts are queued per order, survive reload and do not vanish on a failed order', () => {
  const storage = new Map();
  const run = createMilestoneGame({ storage });
  run(`state.exp = expForLevel(8); grantLevelRewards(7,8); state.gold = 0; render(); placeOrder('bandage', 5);`);
  assert.equal(run('orderDiscount()'), 10);
  run("state.gold = 500; placeOrder('bandage', 5)");
  assert.equal(run('state.gold'), 486);
  assert.equal(run('state.levelDiscounts.length'), 0);
  const reload = createMilestoneGame({ storage });
  assert.equal(reload('state.gold'), 486);
  assert.equal(reload('state.levelDiscounts.length'), 0);
  reload("placeOrder('bandage', 5)");
  assert.equal(reload('state.gold'), 471);
});

test('old saves keep unlocked content, in-flight work, pending discounts and level fraction when progression stretches', () => {
  for (const [oldLevel, newLevel] of [[1,1], [2,5], [3,9], [4,12], [5,18], [6,19], [7,25], [10,28]]) {
    const storage = new Map();
    const old = createOrderingGame({ storage });
    old(`state.exp = expForLevel(${oldLevel}) + ${oldLevel} * 50;
      state.inventory = Object.fromEntries(ITEMS.filter(isUnlocked).map(item => [item.id, 2]));
      globalThis.unlockedItems = ITEMS.filter(isUnlocked).map(item => item.id);
      globalThis.unlockedBoxes = BOXES.filter(isUnlocked).map(box => box.id);
      changeStreak(25);
      if (workshopCapacity()) { state.materials.cloth = 10; startCraft('bandage'); }
      placeOrder('bandage', 5); render();`);
    const key = old('SAVE_KEY');
    const data = JSON.parse(storage.get(key));
    data.version = 3;
    delete data.state.claimedLevelRewards;
    delete data.state.levelDiscounts;
    storage.set(key, JSON.stringify(data));
    const restored = createMilestoneGame({ storage });
    assert.equal(restored('savingBlocked'), false, `old level ${oldLevel} migrates`);
    assert.equal(restored('progression().level'), newLevel);
    assert.equal(restored('progression().current / progression().required'), .5);
    assert.equal(restored('state.gold'), old('state.gold'));
    assert.equal(restored('JSON.stringify(state.inventory)'), old('JSON.stringify(state.inventory)'));
    assert.equal(restored('JSON.stringify(state.orders)'), old('JSON.stringify(state.orders)'));
    assert.equal(restored('JSON.stringify(state.crafts)'), old('JSON.stringify(state.crafts)'));
    assert.equal(restored('JSON.stringify(state.pendingDiscounts)'), old('JSON.stringify(state.pendingDiscounts)'));
    assert.equal(restored(`ITEMS.filter(item => ${old('JSON.stringify(unlockedItems)')}.includes(item.id)).every(isUnlocked)`), true);
    assert.equal(restored(`BOXES.filter(box => ${old('JSON.stringify(unlockedBoxes)')}.includes(box.id)).every(isUnlocked)`), true);
    const stock = restored('JSON.stringify(state.inventory)');
    restored(`grantLevelRewards(1,${newLevel})`);
    assert.equal(restored('JSON.stringify(state.inventory)'), stock, 'migration must not retroactively grant packages');
    const second = createMilestoneGame({ storage });
    assert.equal(second('state.exp'), restored('state.exp'), 'migration applies only once');
    assert.equal(JSON.parse(storage.get(key)).version, 4);
  }
});

test('legacy discounts are used before level coupons and level reward save fields reject malformed data', () => {
  const run = createMilestoneGame();
  run(`state.pendingDiscounts = [15]; state.claimedCheckpoints = [15];
    state.levelDiscounts = [15]; state.gold = 500; placeOrder('bandage', 5);`);
  assert.equal(run('state.gold'), 486);
  assert.equal(run('state.pendingDiscounts.length'), 0);
  assert.equal(run('orderDiscount()'), 15);
  run("placeOrder('bandage', 5)");
  assert.equal(run('state.gold'), 473);
  assert.equal(run('orderDiscount()'), 0);
  for (const fields of [
    { claimedLevelRewards: [2] }, { claimedLevelRewards: ['2'] },
    { claimedLevelRewards: [1] }, { claimedLevelRewards: [2,2] },
    { levelDiscounts: [100] }, { levelDiscounts: ['10'] }, { levelDiscounts: null },
  ]) {
    const storage = new Map();
    const seed = createMilestoneGame({ storage });
    const key = seed('SAVE_KEY');
    const data = JSON.parse(storage.get(key));
    Object.assign(data.state, fields);
    const invalid = JSON.stringify(data);
    storage.set(key, invalid);
    const restored = createMilestoneGame({ storage });
    assert.equal(restored('savingBlocked'), true);
    assert.equal(storage.get(key), invalid);
  }
});

test('availability filter defaults on, keeps orderable or stocked items and can reveal the full catalog', () => {
  const run = createOrderingGame();
  run('state.inventory = {runeblade: 1}; openSupply()');
  assert.equal(run("$('hideUnavailable').checked"), true);
  assert.match(run("$('supplyInventory').innerHTML"), /Runenklinge/);
  assert.match(run("$('supplyInventory').innerHTML"), /Verband/);
  assert.doesNotMatch(run("$('supplyInventory').innerHTML"), /Plattenrüstung/);
  assert.equal((run("$('supplyInventory').innerHTML").match(/Vorrat:/g) || []).length, 5);
  run("$('hideUnavailable').checked = false; $('hideUnavailable').onchange()");
  assert.equal((run("$('supplyInventory').innerHTML").match(/Vorrat:/g) || []).length, run('ITEMS.length'));
  run("$('hideUnavailable').checked = true; state.inventory.runeblade = 0; $('hideUnavailable').onchange()");
  assert.doesNotMatch(run("$('supplyInventory').innerHTML"), /Runenklinge/);
  run('state.exp = expForLevel(4); renderSupply()');
  assert.match(run("$('supplyInventory').innerHTML"), /Kleiner Heiltrank/);
  run('state.gold = 0; state.orders = [{item:"bandage", quantity:1, finishAt:lastUpdatedAt + ORDER_DURATION}, {item:"dag", quantity:1, finishAt:lastUpdatedAt + ORDER_DURATION}]; renderSupply()');
  assert.match(run("$('supplyInventory').innerHTML"), /Verband/);
});

test('quantity buttons clamp to level limits and update the order price and affordability', () => {
  const run = createOrderingGame();
  run(`globalThis.quantityElements = {};
    $('supplyItemDetails').querySelector = selector => quantityElements[selector] ||= {};
    openSupply(); selectedSupplyItem = 'bandage'; renderSupply(); state.gold = 6; adjustOrderQuantity('bandage', 1);`);
  assert.equal(run('orderDrafts.bandage'), 2);
  assert.equal(run(`quantityElements['[data-quantity="bandage"]'].textContent`), 2);
  assert.equal(run(`quantityElements['[data-item="bandage"]'].textContent`), 'Bestellen · 6 Gold');
  assert.equal(run(`quantityElements['[data-item="bandage"]'].disabled`), false);
  run("adjustOrderQuantity('bandage', 1)");
  assert.equal(run(`quantityElements['[data-item="bandage"]'].disabled`), true);
  run("for (let i=0; i<10; i++) adjustOrderQuantity('bandage', 1)");
  assert.equal(run('orderDrafts.bandage'), 5);
  assert.equal(run(`quantityElements['[data-increase="bandage"]'].disabled`), true);
  run("state.exp = expForLevel(7); adjustOrderQuantity('bandage', 1)");
  assert.equal(run('orderDrafts.bandage'), 6);
  run("for (let i=0; i<10; i++) adjustOrderQuantity('bandage', -1)");
  assert.equal(run('orderDrafts.bandage'), 1);
  assert.equal(run(`quantityElements['[data-decrease="bandage"]'].disabled`), true);
  assert.equal(run(`quantityElements['[data-increase="bandage"]'].disabled`), false);
  run("renderSupply()");
  assert.doesNotMatch(run("$('supplyItemDetails').innerHTML"), /<input/);
  assert.match(run("$('supplyItemDetails').innerHTML"), /data-decrease="bandage"/);
  assert.match(run("$('supplyItemDetails').innerHTML"), /data-increase="bandage"/);
  run("state.gold = 500; adjustOrderQuantity('bandage', 1); placeOrder('bandage', orderDrafts.bandage)");
  assert.equal(run('state.orders[0].quantity'), 2);
  assert.equal(run('state.gold'), 494);
});

test('one order slot holds a chosen quantity of one item and prices scale per piece', () => {
  const run = createOrderingGame();
  run("openSupply(); placeOrder('bandage', 2)");
  assert.equal(run('state.orders.length'), 1);
  assert.equal(run('state.orders[0].quantity'), 2);
  assert.equal(run('state.gold'), 494);
  assert.equal(run('state.inventory.bandage'), undefined);
  assert.equal(run('state.orders[0].finishAt - lastUpdatedAt'), 30 * 60000);
  assert.match(run("$('deliverySlots').innerHTML"), /2× Verband/);
  assert.match(run("$('supplySummary').textContent"), /1\/2 Bestellplätze/);
  assert.equal((run("$('supplyInventory').innerHTML").match(/Vorrat:/g) || []).length,
    run('ITEMS.filter(item => canOrder(item) || state.inventory[item.id] > 0).length'));
  run("placeOrder('dag', 5); placeOrder('sparkStone', 1)");
  assert.equal(run('state.orders.length'), 2);
  assert.equal(run('state.gold'), 454);
  assert.equal(run('state.orders[1].quantity'), 5);
  assert.match(run("$('supplyMessage').textContent"), /Alle Bestellplätze/);
});

test('order quantities, item unlocks, availability, gold and parallel limits are enforced', () => {
  const run = createOrderingGame();
  for (const quantity of [0, -1, 1.5, 6, NaN, Infinity]) {
    run(`placeOrder('bandage', ${quantity})`);
    assert.equal(run('state.orders.length'), 0);
    assert.equal(run('state.gold'), 500);
  }
  run("placeOrder('pot1', 1); placeOrder('unknown', 1)");
  assert.equal(run('state.orders.length'), 0);
  assert.match(run("$('supplyMessage').textContent"), /noch nicht bestellbar/);
  run("state.gold = 2; placeOrder('bandage', 1)");
  assert.equal(run('state.orders.length'), 0);
  assert.match(run("$('supplyMessage').textContent"), /Nicht genug Gold/);
  run("state.gold = 500; state.exp = expForLevel(4); placeOrder('pot1', 2)");
  assert.equal(run('state.orders.length'), 1);
  assert.equal(run('orderCapacity()'), 2);
  run("state.exp = expForLevel(5); placeOrder('shield', 1); placeOrder('bandage', 5)");
  assert.equal(run('state.orders.length'), 3);
  run("state.exp = expForLevel(7); placeOrder('wand', 10)");
  assert.equal(run('state.orders.length'), 3);
  run("state.exp = expForLevel(10); placeOrder('wand', 10)");
  assert.equal(run('state.orders.length'), 4);
  assert.equal(run('state.orders[3].quantity'), 10);
  assert.equal(run("canOrder(ITEMS.find(item => item.id === 'runeblade'))"), false);
  assert.equal(run("isUnlocked(ITEMS.find(item => item.id === 'runeblade'))"), true);
  run("renderRoadmap()");
  assert.match(run("$('roadmap').innerHTML"), /Bestellungen: 3 parallele Plätze/);
  assert.match(run("$('roadmap').innerHTML"), /Bestellmenge: bis zu 10 Stück/);
  assert.match(run("$('roadmap').innerHTML"), /Bestellbar: Eisenschwert/);
  assert.doesNotMatch(run("$('roadmap').innerHTML"), /Shop: \+1/);
});

test('deliveries survive reload, complete at the exact boundary offline, free slots and never charge or credit twice', () => {
  const storage = new Map();
  let now = 1_700_000_000_000;
  const options = { storage, now: () => now };
  const run = createOrderingGame(options);
  run("placeOrder('bandage', 5); placeOrder('sparkStone', 2)");
  const gold = run('state.gold');
  now += 1_799_999;
  const waiting = createOrderingGame(options);
  assert.equal(waiting('state.orders.length'), 2);
  assert.equal(waiting('state.inventory.bandage'), undefined);
  assert.equal(waiting('state.gold'), gold);
  now++;
  const arrived = createOrderingGame(options);
  assert.equal(arrived('state.orders.length'), 0);
  assert.equal(arrived('state.inventory.bandage'), 5);
  assert.equal(arrived('state.inventory.sparkStone'), 2);
  assert.equal(arrived('state.gold'), gold);
  const again = createOrderingGame(options);
  assert.equal(again('state.inventory.bandage'), 5);
  again("placeOrder('bandage', 1)");
  assert.equal(again('state.orders.length'), 1);
  now += 7 * 24 * 60 * 60 * 1000;
  const longAbsence = createOrderingGame(options);
  assert.equal(longAbsence('state.inventory.bandage'), 6);
  assert.equal(longAbsence('state.orders.length'), 0);
});

test('deliveries also update the inventory of an active packing session and the visible supply menu', () => {
  let now = 1_700_000_000_000;
  const run = createOrderingGame({ now: () => now });
  run("placeOrder('bandage', 2); selectCustomer(state.queue[0].id); chooseBox('small'); openSupply()");
  assert.equal(run("$('orderDialog').open"), true);
  assert.equal(run("$('supplyDialog').open"), true);
  now += 1_800_000;
  run("intervals[0]()");
  assert.equal(run('state.orders.length'), 0);
  assert.equal(run('state.inventory.bandage'), 2);
  assert.match(run("$('supplyMessage').textContent"), /Angekommen: 2× Verband/);
  assert.match(run("$('supplyInventory').innerHTML"), /Vorrat: 2/);
  run("$('closeSupply').onclick(); packItem('bandage')");
  assert.equal(run('state.box[0].id'), 'bandage');
  assert.equal(run('state.inventory.bandage'), 1);
});

test('old merchant visits migrate without charging the cart and carry their active and pending discounts into orders', () => {
  for (const version of [1, 2]) {
    const storage = new Map();
    const legacy = createGame({ storage });
    legacy(`state.exp = expForLevel(5); changeStreak(25); state.pendingDiscounts = [25]; state.activeDiscount = 15;
      state.shopping = true; state.shopOffers = rollShopOffers(); state.cart = {dag: 2}; render();`);
    const key = legacy('SAVE_KEY');
    const data = JSON.parse(storage.get(key));
    data.version = version;
    delete data.state.orders;
    if (version === 1) { delete data.state.materials; delete data.state.crafts; }
    storage.set(key, JSON.stringify(data));
    const run = createOrderingGame({ storage });
    assert.equal(run('savingBlocked'), false);
    assert.equal(run('state.gold'), 500);
    assert.equal(run('state.shopping'), false);
    assert.equal(run('cartQuantity()'), 0);
    assert.equal(run('state.shopOffers.length'), 0);
    assert.equal(run('state.activeDiscount'), null);
    assert.deepEqual(JSON.parse(run('JSON.stringify(state.pendingDiscounts)')), [15, 25]);
    run("placeOrder('dag', 5)");
    assert.equal(run('state.gold'), 464); // 40 Gold minus 10%.
    assert.equal(run('orderDiscount()'), 15);
    run("placeOrder('bandage', 5)");
    assert.equal(run('state.gold'), 451); // 15 Gold minus 15%, rounded up.
    assert.equal(run('state.pendingDiscounts.length'), 0);
    assert.equal(JSON.parse(storage.get(key)).version, 4);
    const reloaded = createOrderingGame({ storage });
    assert.equal(reloaded('state.gold'), 451);
    assert.equal(reloaded('state.pendingDiscounts.length'), 0);
  }
});

test('failed orders keep discounts and a fifth delivery no longer opens the preserved merchant', () => {
  const run = createOrderingGame();
  run("changeStreak(15); state.gold = 0; placeOrder('bandage', 2)");
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.pendingDiscounts)')), [15]);
  run("state.gold = 500");
  for (let i = 0; i < 5; i++) {
    run(`state.queue = [generateCustomer()]; selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();`);
    assert.equal(run('state.shopping'), false);
    assert.notEqual(run("$('shopDialog').open"), true);
  }
  run("addToCart('bandage'); checkout()");
  assert.equal(run('cartQuantity()'), 0);
  assert.equal(run("$('merchantPanel').hidden"), true);
  assert.match(run("checkpointStatus(CHECKPOINTS[1])"), /Bestellung vorgemerkt/);
});

test('malformed orders are rejected without overwriting the old save', () => {
  const seed = new Map();
  const game = createOrderingGame({ storage: seed });
  const key = game('SAVE_KEY');
  for (const order of [
    { item: 'bandage', quantity: 0, finishAt: 123 },
    { item: 'bandage', quantity: 6, finishAt: 123 },
    { item: 'bandage', quantity: 1.5, finishAt: 123 },
    { item: 'pot1', quantity: 1, finishAt: 123 },
    { item: 'bandage', quantity: 1, finishAt: -1 },
  ]) {
    const data = JSON.parse(seed.get(key));
    data.state.orders = [order];
    const raw = JSON.stringify(data);
    const storage = new Map([[key, raw]]);
    const restored = createOrderingGame({ storage, console: { error() {} } });
    assert.equal(restored('savingBlocked'), true);
    assert.equal(storage.get(key), raw);
  }
});

test('resource rewards are fixed, visible, meet tier thresholds and grant streak points instead of an item', () => {
  for (const [tier, amount, threshold, points] of [
    ['wannabe', 2, .5, 1], ['adventurer', 3, .7, 2], ['hero', 4, .85, 3], ['demigod', 5, 1, 4],
  ]) {
    const storage = new Map();
    const run = createGame({ storage });
    run(`state.exp = expForLevel(7); globalThis.rollMaterialReward = () => true;
      globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}');
      state.queue = [generateCustomer()]; selectCustomer(state.queue[0].id);
      globalThis.reward = JSON.stringify(state.active.itemReward);`);
    const offer = JSON.parse(run('reward'));
    assert.equal(offer.material.amount, amount);
    assert.ok(['wood', 'iron', 'cloth'].includes(offer.material.id));
    assert.equal(offer.item, undefined);
    assert.equal(run(`rewardFor(${threshold - .000001}, state.active, true).earned`), false);
    assert.equal(run('rewardFor(1, state.active, false).earned'), false);
    assert.equal(run(`rewardFor(${threshold}, state.active, true).points`), points);
    assert.match(run("$('selectionCustomer').innerHTML"), new RegExp(`×${amount}`));
    const restored = createGame({ storage });
    assert.equal(restored('JSON.stringify(state.active.itemReward)'), run('reward'));
    restored(`chooseBox('small'); state.active.needs = [{attr:'hp', target:10, prio:1}];
      packItem('pot1'); globalThis.beforeItems = Object.values(state.inventory).reduce((a,b) => a+b,0); send();`);
    assert.equal(restored(`state.materials['${offer.material.id}']`), amount);
    assert.equal(restored('Object.values(state.inventory).reduce((a,b) => a+b,0)'), restored('beforeItems'));
    assert.equal(restored('state.streak'), points);
    assert.match(restored("$('result').innerHTML"), /✓ (Holz|Eisen|Stoff)/);
    restored('send()');
    assert.equal(restored(`state.materials['${offer.material.id}']`), amount);
    assert.equal(createGame({ storage })(`state.materials['${offer.material.id}']`), amount);
  }
});

test('an unmet resource reward and an empty box award no resources or streak', () => {
  const run = createGame();
  run(`globalThis.rollMaterialReward = () => true; state.queue = [generateCustomer()];
    selectCustomer(state.queue[0].id); chooseBox('small'); send();`);
  assert.equal(run('Object.values(state.materials).reduce((a,b) => a+b,0)'), 0);
  assert.equal(run('state.streak'), 0);
  assert.match(run("$('result').innerHTML"), /Keine Rohstoffbelohnung/);
});

test('workshop unlocks, recipes, slot limits and material consumption are independent and enforced', () => {
  const run = createGame();
  run("state.materials = {wood:10, iron:10, cloth:10}; startCraft('bandage')");
  assert.equal(run('state.crafts.length'), 0);
  assert.equal(run("$('openWorkshop').disabled"), true);
  run("state.exp = expForLevel(3); render(); openWorkshop(); startCraft('ironSword')");
  assert.equal(run("$('workshopDialog').open"), true);
  assert.equal(run('state.crafts.length'), 0);
  run("startCraft('bandage'); startCraft('buckler')");
  assert.equal(run('state.crafts.length'), 1);
  assert.equal(run('state.materials.cloth'), 8);
  assert.equal(run('state.materials.wood'), 10);
  assert.equal(run('state.crafts[0].finishAt - lastUpdatedAt'), 15 * 60000);
  run('collectCraft(0)');
  assert.equal(run('state.crafts.length'), 1);
  run("state.exp = expForLevel(6); startCraft('buckler')");
  assert.equal(run('state.crafts.length'), 2);
  assert.equal(run('state.materials.wood'), 8);
  assert.equal(run('state.materials.iron'), 9);
  run("state.exp = expForLevel(7); startCraft('sparkStone')");
  assert.equal(run('state.crafts.length'), 2);
  run("state.exp = expForLevel(10); startCraft('sparkStone')");
  assert.equal(run('state.crafts.length'), 3);
  assert.equal(run('state.crafts[0].finishAt - lastUpdatedAt'), 15 * 60000);
  assert.equal(run('state.crafts[2].finishAt - lastUpdatedAt'), 24 * 60000);
  run('renderRoadmap()');
  assert.match(run("$('roadmap').innerHTML"), /Werkstatt: 1 Herstellungsplatz/);
  assert.match(run("$('roadmap').innerHTML"), /Werkstatt: 2 Herstellungsplätze/);
  assert.match(run("$('roadmap').innerHTML"), /20 % schnellere neue Herstellungsaufträge/);
  assert.match(run("$('roadmap').innerHTML"), /Rezept: .* Eisenschwert/);
});

test('crafts finish offline, occupy slots until collected and grant their item once across reloads', () => {
  const storage = new Map();
  let now = 1_700_000_000_000;
  const options = { storage, now: () => now };
  const run = createGame(options);
  run(`state.exp = expForLevel(3); state.materials.cloth = 2; render(); startCraft('bandage');`);
  const finish = run('state.crafts[0].finishAt');
  const pending = createGame(options);
  assert.equal(pending('state.materials.cloth'), 0);
  now = finish - 1;
  pending('collectCraft(0)');
  assert.equal(pending('state.inventory.bandage'), undefined);
  now = finish;
  const ready = createGame(options);
  assert.equal(ready('state.crafts.length'), 1);
  assert.match(ready("$('workshopSummary').textContent"), /1 abholbereit/);
  ready("state.materials.cloth = 2; startCraft('bandage')");
  assert.equal(ready('state.materials.cloth'), 2);
  ready('collectCraft(0); collectCraft(0)');
  assert.equal(ready('state.inventory.bandage'), 1);
  assert.equal(ready('state.crafts.length'), 0);
  const reloaded = createGame(options);
  assert.equal(reloaded('state.inventory.bandage'), 1);
  assert.equal(reloaded('state.crafts.length'), 0);
  reloaded("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('bandage')");
  assert.equal(reloaded('state.box[0].id'), 'bandage');
});

test('version 1 saves retain customers and progress and migrate to an empty workshop without rerolling offers', () => {
  const storage = new Map();
  const run = createGame({ storage });
  run(`globalThis.rollMaterialReward = () => false; state.queue = [generateCustomer()]; state.exp = expForLevel(3);
    state.gold = 345; selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');`);
  const data = JSON.parse(storage.get(run('SAVE_KEY')));
  data.version = 1;
  delete data.state.materials;
  delete data.state.crafts;
  storage.set(run('SAVE_KEY'), JSON.stringify(data));
  const restored = createGame({ storage });
  assert.equal(restored('savingBlocked'), false);
  assert.equal(restored('state.gold'), 345);
  assert.equal(restored('state.box.length'), 1);
  assert.equal(restored('state.active.itemReward.item.id'), data.state.active.rewardItem);
  assert.deepEqual(JSON.parse(restored('JSON.stringify(state.materials)')), { wood: 0, iron: 0, cloth: 0 });
  assert.equal(restored('state.crafts.length'), 0);
  assert.equal(JSON.parse(storage.get(run('SAVE_KEY'))).version, 4);
});

test('corrupt workshop data is rejected without replacing the local save', () => {
  const original = new Map();
  const game = createGame({ storage: original });
  const key = game('SAVE_KEY');
  const mutations = [
    data => { data.state.materials.wood = -1; },
    data => { data.state.materials.wood = 0.5; },
    data => { data.state.crafts = [{ item: 'bandage', finishAt: 123 }]; },
    data => { data.state.queue[0].rewardItem = undefined; data.state.queue[0].rewardMaterial = { id: 'invalid', amount: 2 }; },
  ];
  for (const mutate of mutations) {
    const data = JSON.parse(original.get(key));
    mutate(data);
    const raw = JSON.stringify(data);
    const storage = new Map([[key, raw]]);
    const restored = createGame({ storage, console: { error() {} } });
    assert.equal(restored('savingBlocked'), true);
    assert.equal(storage.get(key), raw);
  }
});

test('local saves restore progression, inventory and a packed order with canonical item and box references', () => {
  const storage = new Map();
  const run = createGame({ storage });
  run(`state.exp = expForLevel(3); state.gold = 333; state.debt = 7; state.completed = 2;
    changeStreak(15); selectCustomer(state.queue[0].id); chooseBox('medium'); packItem('pot1');`);
  const stock = run('JSON.stringify(state.inventory)');
  const customer = run('JSON.stringify(savedCustomer(state.active))');
  const restored = createGame({ storage });
  assert.equal(restored('state.gold'), 333);
  assert.equal(restored('state.debt'), 7);
  assert.equal(restored('progression().level'), 3);
  assert.equal(restored('state.completed'), 2);
  assert.equal(restored('state.streak'), 15);
  assert.equal(restored('JSON.stringify(state.inventory)'), stock);
  assert.equal(restored('JSON.stringify(savedCustomer(state.active))'), customer);
  assert.equal(restored("state.boxType === BOXES.find(box => box.id === 'medium')"), true);
  assert.equal(restored("state.box[0] === ITEMS.find(item => item.id === 'pot1')"), true);
  assert.equal(restored("$('orderDialog').open"), true);
  assert.equal(restored("$('packingView').hidden"), false);
  restored("chooseBox('medium')");
  assert.equal(restored('state.box.length'), 1);
  assert.equal(restored('JSON.stringify(state.inventory)'), stock);
  restored('backToBoxes(); backToCustomers()');
  const selection = createGame({ storage });
  selection('selectCustomer(state.queue[0].id)');
  const reselected = createGame({ storage });
  assert.equal(reselected("$('boxSelection').hidden"), false);
  assert.equal(reselected('state.box.length'), 0);
  assert.equal(reselected('state.inventory.pot1'), JSON.parse(stock).pot1 + 1);
  assert.equal(reselected('new Set([...state.queue.map(customer => customer.id), state.active.id, generateCustomer().id]).size'),
    reselected('state.queue.length + 2'));
});

test('reloading after a delivery preserves rewards once and resumes the merchant, cart and discount without rerolling', () => {
  const storage = new Map();
  const run = createGame({ storage });
  run(`state.exp = expForLevel(5); changeStreak(14); state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}]; packItem('pot1'); send();`);
  const gold = run('state.gold');
  const stock = run('JSON.stringify(state.inventory)');
  const offers = run('JSON.stringify(state.shopOffers)');
  const shop = createGame({ storage });
  assert.equal(shop('state.gold'), gold);
  assert.equal(shop('JSON.stringify(state.inventory)'), stock);
  assert.equal(shop('state.streak'), 15);
  assert.equal(shop('state.activeDiscount'), 15);
  assert.equal(shop('JSON.stringify(state.shopOffers)'), offers);
  assert.equal(shop('state.showingResult'), false);
  assert.equal(shop("$('shopDialog').open"), true);
  shop("send(); addToCart('dag'); addToCart('bandage')");
  const cart = shop('JSON.stringify(state.cart)');
  const total = shop('cartTotal()');
  const cartReload = createGame({ storage });
  assert.equal(cartReload('JSON.stringify(state.cart)'), cart);
  assert.equal(cartReload('state.gold'), gold);
  assert.equal(cartReload('JSON.stringify(state.shopOffers)'), offers);
  assert.equal(cartReload('state.activeDiscount'), 15);
  cartReload('checkout()');
  const bought = createGame({ storage });
  assert.equal(bought('state.gold'), gold - total);
  assert.equal(bought('cartQuantity()'), 0);
  assert.equal(bought('state.activeDiscount'), 15);
  bought('finishShopping()');
  const home = createGame({ storage });
  assert.equal(home('state.shopping'), false);
  assert.equal(home('state.activeDiscount'), null);
  assert.equal(home('state.shopOffers.length'), 0);
});

test('offline arrivals honor exact 30-minute boundaries, retain partial progress and cannot bank arrivals beyond capacity', () => {
  const storage = new Map();
  let now = 1_700_000_000_000;
  const options = { storage, now: () => now };
  const run = createGame(options);
  run('state.queue = []; render()');
  now += 1_799_000;
  const before = createGame(options);
  assert.equal(before('state.queue.length'), 0);
  assert.equal(before('state.spawnT'), 1);
  now += 1_000;
  const first = createGame(options);
  assert.equal(first('state.queue.length'), 1);
  assert.equal(first('state.spawnT'), 1800);
  const repeated = createGame(options);
  assert.equal(repeated('state.queue.length'), 1);
  now -= 60_000;
  const rollback = createGame(options);
  assert.equal(rollback('state.queue.length'), 1);
  assert.equal(rollback('state.spawnT'), 1800);
  now += 30 * 24 * 60 * 60 * 1000;
  const full = createGame(options);
  assert.equal(full('state.queue.length'), 4);
  assert.equal(full('state.spawnT'), 1800);
  full("selectCustomer(state.queue[0].id); chooseBox('small'); send()");
  const after = createGame(options);
  assert.equal(after('state.queue.length'), 3);
  assert.equal(after('state.spawnT'), 1800);
  now += 1_799_000;
  const waiting = createGame(options);
  assert.equal(waiting('state.queue.length'), 3);
  now += 1_000;
  assert.equal(createGame(options)('state.queue.length'), 4);
});

test('background lifecycle events catch up elapsed time and preserve an active order and its reserved return place', () => {
  const storage = new Map();
  let now = 1_700_000_000_000;
  const options = { storage, now: () => now };
  const run = createGame(options);
  run(`selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');
    state.queue.pop(); render(); document.hidden = true; document.listeners.visibilitychange();`);
  now += 24 * 60 * 60 * 1000;
  run('document.hidden = false; document.listeners.visibilitychange(); window.listeners.pagehide()');
  const restored = createGame(options);
  assert.equal(restored('state.queue.length'), 3);
  assert.equal(restored('state.box.length'), 1);
  assert.equal(restored('state.inventory.pot1'), 4);
  restored('backToBoxes(); backToCustomers()');
  assert.equal(restored('state.queue.length'), 4);
  assert.equal(restored('state.inventory.pot1'), 5);
  restored("selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick()");
  now += 1_800_000;
  restored('intervals[0]()');
  assert.equal(restored('state.queue.length'), 4);
  assert.equal(createGame(options)('state.queue.length'), 4);
});

test('invalid or incompatible saves are reported and never overwritten by a fresh session', () => {
  const seed = new Map();
  const run = createGame({ storage: seed });
  const key = run('SAVE_KEY');
  const valid = seed.get(key);
  const mutations = [
    () => '{broken',
    data => { data.version++; },
    data => { data.state.gold = -1; },
    data => { data.state.inventory.unknown = 3; },
    data => { data.state.queue[0].name = '<img src=x onerror=alert(1)>'; },
    data => { data.state.queue.push(data.state.queue[0]); },
    data => { data.state.box = ['pot1']; },
    data => { data.state.pendingDiscounts = [15]; },
  ];
  for (const mutate of mutations) {
    const data = JSON.parse(valid);
    const raw = mutate(data) || JSON.stringify(data);
    const storage = new Map([[key, raw]]);
    const errors = [];
    const broken = createGame({ storage, console: { error: (...args) => errors.push(args) } });
    broken('render(); window.listeners.pagehide()');
    assert.equal(storage.get(key), raw);
    assert.equal(errors.length, 1);
    assert.equal(broken('savingBlocked'), true);
    assert.match(broken("$('saveStatus').textContent"), /nicht geladen/);
    assert.match(broken("$('orderSaveStatus').textContent"), /nicht gespeichert/);
  }
});

test('storage access and write failures are visible, and writing resumes after storage becomes available', () => {
  let unavailable = true;
  const storage = new Map();
  const errors = [];
  const run = createGame({
    console: { error: (...args) => errors.push(args) },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { if (unavailable) throw new Error('Storage quota'); storage.set(key, value); },
    },
  });
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1')");
  assert.equal(run('state.box.length'), 1);
  assert.match(run("$('saveStatus').textContent"), /Speichern fehlgeschlagen/);
  assert.equal(run("$('saveAlert').hidden"), false);
  assert.equal(run("$('orderSaveStatus').hidden"), false);
  assert.equal(errors.length, 1);
  unavailable = false;
  run('render()');
  assert.match(run("$('saveStatus').textContent"), /Automatisch lokal gespeichert/);
  assert.equal(run("$('saveAlert').hidden"), true);
  assert.equal(run("$('orderSaveStatus').hidden"), true);
  assert.equal(createGame({ storage })('state.box.length'), 1);
  let writes = 0;
  const denied = createGame({
    console: { error() {} },
    localStorage: {
      getItem(key) { if (key === 'lootboxPacker.save') throw new Error('Storage denied'); return null; },
      setItem() { writes++; },
    },
  });
  assert.equal(denied('savingBlocked'), true);
  assert.equal(writes, 0);
});

test('a stale tab stops saving when another tab changes or deletes the local save', () => {
  const storage = new Map();
  const run = createGame({ storage });
  const saved = storage.get(run('SAVE_KEY'));
  run("window.listeners.storage({key: 'soundEnabled'})");
  assert.equal(run('savingBlocked'), false);
  run('window.listeners.storage({key: SAVE_KEY}); state.gold = 123; render(); window.listeners.pagehide()');
  assert.equal(storage.get(run('SAVE_KEY')), saved);
  assert.match(run("$('saveStatus').textContent"), /anderen Tab/);
});

test('merchant capacity grows independently of item unlocks and always includes the weakest item for every need', () => {
  const run = createGame();
  for (const [level, count] of [[1, 4], [2, 4], [4, 4], [5, 5], [9, 5], [10, 6], [15, 7], [100, 23]]) {
    for (const random of [0, .4, .99999]) {
      run(`state.exp = expForLevel(${level}); Math.random = () => ${random};
        state.shopOffers = rollShopOffers(); state.shopping = true; render();`);
      assert.equal(run('shopItems().length'), count);
      assert.equal(run('new Set(state.shopOffers).size'), count);
      assert.equal(run('shopItems().every(isUnlocked)'), true);
      assert.equal(run('SHOP_BASE_IDS.every(id => state.shopOffers.includes(id))'), true);
      assert.equal(run(`Object.keys(ATTRS).every(attr => shopItems().some(item =>
        Object.keys(item.stats).length === 1 &&
        item.stats[attr] === Math.min(...ITEMS.filter(candidate => candidate.stats[attr] > 0).map(candidate => candidate.stats[attr]))
      ))`), true);
      assert.equal((run("$('shop').innerHTML").match(/class="add-item"/g) || []).length, count);
      assert.ok(count < run('ITEMS.filter(isUnlocked).length'));
    }
  }
  run('state.exp = expForLevel(15); renderRoadmap()');
  assert.match(run("$('roadmap').innerHTML"), /Shop: \+1 zufälliger Angebotsplatz \(5 Plätze insgesamt\)/);
  assert.match(run("$('roadmap').innerHTML"), /Shop: \+1 zufälliger Angebotsplatz \(6 Plätze insgesamt\)/);
  assert.match(run("$('roadmap').innerHTML"), /Level 20/);
});

test('a level-up on the fifth delivery expands the upcoming visit and offers stay fixed until the next visit', () => {
  const run = createGame();
  run(`Math.random = () => 0; state.exp = expForLevel(5) - 1; state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}]; packItem('pot1'); send();`);
  assert.equal(run('progression().level'), 5);
  assert.equal(run('state.shopOffers.length'), 5);
  assert.match(run("$('result').innerHTML"), /Shop: \+1 zufälliger Angebotsplatz/);
  run(`$('next').onclick(); globalThis.offers = JSON.stringify(state.shopOffers);
    Math.random = () => .99999; render(); openRoadmap(); $('closeRoadmap').onclick();
    addToCart('bandage'); checkout(); addToCart('bandage'); removeFromCart('bandage'); render();`);
  assert.equal(run('JSON.stringify(state.shopOffers)'), run('offers'));
  run(`finishShopping(); state.completed = 4; state.queue = [generateCustomer()];
    selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();`);
  assert.equal(run('state.shopOffers.length'), 5);
  assert.notEqual(run('JSON.stringify(state.shopOffers)'), run('offers'));
  assert.equal(run("state.shopOffers.includes('vampiricDagger')"), true);
});

test('unoffered unlocked items cannot be bought and visit discounts apply after the shop markup', () => {
  const run = createGame();
  run(`state.exp = expForLevel(5); Math.random = () => 0; state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();
    globalThis.gold = state.gold; globalThis.stock = JSON.stringify(state.inventory);
    addToCart('sword');`);
  assert.equal(run("isUnlocked(ITEMS.find(item => item.id === 'sword'))"), true);
  assert.equal(run('cartQuantity()'), 0);
  run("state.cart.sword = 1; checkout()");
  assert.equal(run('state.gold'), run('gold'));
  assert.equal(run('JSON.stringify(state.inventory)'), run('stock'));
  assert.match(run("$('checkoutMessage').textContent"), /nicht angebotene Items/);
  run("state.cart = {}; state.activeDiscount = 15; addToCart('dag'); addToCart('bandage');");
  assert.equal(run('cartSubtotal()'), 11);
  assert.equal(run('cartTotal()'), 10);
  run("checkout(); addToCart('dag'); addToCart('bandage'); checkout();");
  assert.equal(run('state.gold'), run('gold - 20'));
  assert.equal(run('state.activeDiscount'), 15);
});

test('purchases fill inventory without a customer or box; packing spends no gold', () => {
  const run = createShoppingGame();
  run("addToCart('pot1'); addToCart('pot1');");
  assert.equal(run('state.gold'), 500);
  assert.equal(run('state.cart.pot1'), 2);
  assert.equal(run('state.inventory.pot1'), undefined);
  run('checkout()');
  assert.equal(run('state.gold'), 486);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.box.length'), 0);
  run("packItem('pot1')");
  assert.equal(run('state.inventory.pot1'), 2);
  run("finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 1);
  assert.equal(run('state.gold'), 486);
  assert.match(run("$('preview').innerHTML"), /Shopwert: 7/);
  run('removeFromBox(0)');
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 486);
  assert.match(run("$('preview').innerHTML"), /Shopwert: 0/);
});

test('inventory and item-count capacity; merchant is unavailable during the round', () => {
  const run = createShoppingGame();
  run("for (let i = 0; i < 12; i++) addToCart('pot1'); checkout(); finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small');");
  run("for (let i = 0; i < 12; i++) packItem('pot1');");
  assert.equal(run('usedSlots()'), 3);
  assert.equal(run('state.inventory.pot1'), 9);
  run("addToCart('pot1'); checkout()");
  assert.equal(run('state.inventory.pot1'), 9);
  assert.equal(run('state.box.length'), 3);
  run("packItem('wand')");
  assert.equal(run('state.box.length'), 3);
  run("addToCart('pot3'); checkout()");
  assert.equal(run('state.gold'), 416);
});

test('box and customer switches return items; sending consumes only packed items', () => {
  const run = createShoppingGame();
  run("addToCart('pot1'); addToCart('pot1'); checkout(); finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  run("chooseBox('small')");
  assert.equal(run('state.box.length'), 1);
  run("state.exp = expForLevel(3); chooseBox('medium');");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  run("packItem('pot1'); selectCustomer(state.queue[0].id);");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 486);
  run("chooseBox('small'); packItem('pot1'); state.active.needs = [{attr:'magic', target:15, prio:1}]; globalThis.expectedGold = state.gold + rewardFor(quality(), state.active).gold; send();");
  assert.equal(run('state.gold'), run('expectedGold'));
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.active'), null);
  run('send()');
  assert.equal(run('state.gold'), run('expectedGold'));
});

test('each customer offers one fixed reward only at its tier threshold, with increasingly valuable items', () => {
  const run = createShoppingGame();
  let previousMaxCost = 0;
  for (const [tier, threshold] of [['wannabe', 0.5], ['adventurer', 0.7], ['hero', 0.85], ['demigod', 1]]) {
    run(`globalThis.rollMaterialReward = () => false; globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}'); globalThis.customer = generateCustomer();`);
    assert.equal(run('customer.itemReward.quality'), threshold);
    assert.equal(run('rewardFor(0, customer, true).item'), null);
    assert.equal(run(`rewardFor(${threshold - 0.000001}, customer, true).item`), null);
    assert.equal(run(`rewardFor(${threshold}, customer, true).item.id`), run('customer.itemReward.item.id'));
    assert.equal(run('rewardFor(1, customer, true).item.id'), run('customer.itemReward.item.id'));
    assert.equal(run('rewardFor(1, customer, false).item'), null);
    assert.ok(run('Math.min(...ITEMS.filter(item => CUSTOMER_TIERS.find(tier => tier.id === customer.tier).reward.ids.includes(item.id)).map(item => item.cost))') > previousMaxCost);
    previousMaxCost = run('Math.max(...ITEMS.filter(item => CUSTOMER_TIERS.find(tier => tier.id === customer.tier).reward.ids.includes(item.id)).map(item => item.cost))');
  }
});

test('sending at each tier threshold consumes the box and awards exactly one item', () => {
  for (const [tier, target, items, points] of [
    ['wannabe', 20, ['pot1'], 1],
    ['adventurer', 50, ['pot2', 'pot1'], 2],
    ['hero', 100, ['pot3', 'pot2', 'pot1'], 3],
    ['demigod', 50, ['pot3'], 4],
  ]) {
    const run = createShoppingGame();
    run(`globalThis.rollMaterialReward = () => false; globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}');
      state.queue = [generateCustomer()];
      for (const id of ${JSON.stringify(items)}) addToCart(id);
      checkout(); finishShopping(); selectCustomer(state.queue[0].id);
      state.active.needs = [{attr:'hp', target:${target}, prio:1}];
      chooseBox('small');
      for (const id of ${JSON.stringify(items)}) packItem(id);
      globalThis.rewardId = state.active.itemReward.item.id;`);
    assert.equal(run('quality()'), run('state.active.itemReward.quality'));
    run('send(); send();');
    assert.equal(run('state.inventory[rewardId]'), 1);
    assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 1);
    assert.equal(run('state.streak'), points);
    assert.match(run("$('result').innerHTML"), /✓ Reward/);
  }
});

test('advertised reward stays fixed and sending grants exactly one item once', () => {
  const run = createShoppingGame();
  run(`globalThis.rollMaterialReward = () => false; globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'demigod');
    state.queue = [generateCustomer()];
    addToCart('pot1'); checkout(); finishShopping();
    selectCustomer(state.queue[0].id);
    state.active.needs = [{ attr: 'hp', target: 10, prio: 3 }];
    chooseBox('small');
    packItem('pot1');
    globalThis.rewardId = rewardFor(quality(), state.active).item.id;
    globalThis.offer = JSON.stringify(state.active.itemReward);
    render(); render();`);
  assert.equal(run('JSON.stringify(state.active.itemReward)'), run('offer'));
  assert.match(run("$('preview').innerHTML"), /✓ Reward/);
  assert.match(run("$('preview').innerHTML"), /ab 100 %/);
  assert.doesNotMatch(run("$('preview').innerHTML"), /höchste erreichte Stufe|ab 30%/);
  run('send()');
  assert.equal(run('state.inventory[rewardId]'), 1);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 1);
  run('send()');
  assert.equal(run('state.inventory[rewardId]'), 1);
});

test('reward badges show the item icon and threshold and results explain the unmet tier requirement', () => {
  const run = createShoppingGame();
  run(`Math.random = () => 0; globalThis.rollMaterialReward = () => false;
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'hero');
    state.queue = [generateCustomer()]; finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small');`);
  assert.match(run("$('preview').innerHTML"), /class="reward-icon"[^>]*>🥋/);
  assert.match(run("$('preview').innerHTML"), /ab 85 %/);
  assert.match(run("$('preview').innerHTML"), /aria-label="1 Plattenrüstung ab 85 % Boxqualität · Gewöhnlich · 🛡️ Rüstung: \+30"/);
  assert.doesNotMatch(run("$('preview').innerHTML"), /✓ Reward|höchste erreichte Stufe/);
  run('send()');
  assert.match(run("$('result').innerHTML"), /Keine Itembelohnung – benötigt: 85 %/);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
  assert.equal(run('state.streak'), 0);
});

test('quality shown just below a reward threshold does not round up and promise an unearned item', () => {
  const run = createGame();
  run(`state.streak = 7; selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.itemReward = {quality: 0.5, item: ITEMS.find(item => item.id === 'pot1')};
    state.active.needs = [{attr:'hp', target:20.01, prio:1}];
    packItem('pot1');`);
  assert.match(run("$('preview').innerHTML"), /Aktuell: 49%/);
  assert.doesNotMatch(run("$('preview').innerHTML"), /✓ Reward/);
  run('send()');
  assert.match(run("$('result').innerHTML"), /Erfüllung: 49%/);
  assert.match(run("$('result').innerHTML"), /Keine Itembelohnung – benötigt: 50 %/);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 19);
  assert.equal(run('state.streak'), 7);
});

test('empty or irrelevant boxes grant no items', () => {
  const run = createShoppingGame();
  run(`addToCart('wand'); checkout(); finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small'); send();`);
  assert.equal(run('state.inventory.wand'), 1);
  run(`$('next').onclick(); selectCustomer(state.queue[0].id);
    state.active.needs = [{ attr: 'hp', target: 10, prio: 3 }];
    chooseBox('small'); packItem('wand'); send();`);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
});

test('customers are distributed across four tiers with easy wannabes and strongest demigods', () => {
  const run = createGame();
  run('state.exp = expForLevel(7)');
  assert.equal(run('CUSTOMER_TIERS.reduce((sum, tier) => sum + tier.weight, 0)'), 100);
  for (const [roll, expected] of [[0, 'wannabe'], [0.5, 'adventurer'], [0.82, 'hero'], [0.97, 'demigod']]) {
    run(`Math.random = () => ${roll}`);
    assert.equal(run('rollCustomerTier().id'), expected);
  }
  run(`Math.random = () => 0;
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'wannabe');
    globalThis.wannabe = generateCustomer();`);
  assert.ok(run('wannabe.needs.length <= 2'));
  assert.ok(run('wannabe.needs.every(need => need.prio <= 2)'));
  assert.ok(run('wannabe.needs.every(need => need.target <= 15)'));
  run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'hero');
    globalThis.hero = generateCustomer();
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'demigod');
    globalThis.demigod = generateCustomer();`);
  assert.equal(run('hero.tierLabel'), 'Held');
  assert.equal(run('demigod.tierLabel'), 'Demi-Gott');
  assert.ok(run('demigod.needs.every(need => need.target >= 70)'));
  assert.equal(run('state.gold'), 500);
});

test('boxes count each item as one slot and apply neutral or magical modifiers', () => {
  const run = createShoppingGame();
  assert.deepEqual(JSON.parse(run('JSON.stringify(BOXES.map(box => [box.id, box.slots, box.level]))')), [
    ['small', 3, 1],
    ['medium', 5, 3],
    ['magic', 3, 4],
  ]);
  assert.ok(run('ITEMS.every(item => item.weight === undefined)'));
  run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'wannabe');
    state.queue = [generateCustomer()];
    addToCart('dag'); addToCart('dag'); addToCart('sword'); checkout(); finishShopping();
    selectCustomer(state.queue[0].id); chooseBox('small');
    packItem('dag'); packItem('dag');`);
  assert.equal(run('usedSlots()'), 2);
  assert.equal(run('state.box.reduce((sum, item) => sum + (item.stats.melee || 0), 0)'), 16);
  assert.equal(run('state.box.reduce((sum, item) => sum + item.cost, 0)'), 12);
  assert.equal(run('state.inventory.sword'), 1);
  run("state.exp = expForLevel(4); chooseBox('magic');");
  assert.equal(run('usedSlots()'), 0);
  assert.equal(run('totals().magic'), 5);
  assert.equal(run('totals().melee'), -10);
  run("state.active.needs = [{attr:'magic', target:10, prio:1}, {attr:'melee', target:10, prio:1}];");
  assert.equal(run('quality()'), 0.25);
  assert.match(run("$('boxEffects').textContent"), /Magie: \+5/);
  assert.match(run("$('boxEffects').textContent"), /Nahkampf: -10/);
  assert.equal(run('rewardFor(1, state.active).item'), null);
});

test('merchant blocks selection and returns after exactly five deliveries each round', () => {
  const run = createShoppingGame();
  run('globalThis.customers = JSON.stringify(state.queue); tick(10); selectCustomer(state.queue[0].id);');
  assert.equal(run('JSON.stringify(state.queue)'), run('customers'));
  assert.equal(run('state.active'), null);
  run('finishShopping(); tick(1);');
  assert.equal(run('JSON.stringify(state.queue)'), run('customers'));
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 1; i <= 5; i++) {
      run("state.queue = [generateCustomer()]; selectCustomer(state.queue[0].id); chooseBox('small'); send();");
      assert.equal(run('state.shopping'), i === 5);
      assert.equal(run('state.completed'), i % 5);
      run("$('next').onclick()");
    }
    run('addToCart("dag"); checkout()');
    assert.equal(run('state.inventory.dag'), cycle + 1);
    run('finishShopping()');
  }
});

test('emergency package costs gold and contains three basic items across at least two attributes', () => {
  const run = createShoppingGame();
  run('emergencyRestock()');
  assert.equal(run('state.gold'), 500);
  run('finishShopping()');
  run('state.gold = 100');
  for (let i = 0; i < 5; i++) {
    run('state.inventory = {}; emergencyRestock();');
    assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 3);
    assert.equal(run('Object.keys(state.inventory).every(id => RESTOCK_IDS.includes(id))'), true);
    assert.ok(run('new Set(Object.keys(state.inventory).flatMap(id => Object.keys(ITEMS.find(it => it.id === id).stats))).size') >= 2);
  }
  assert.equal(run('state.gold'), 0);
  assert.equal(run('state.debt'), 0);
});

test('restock advances only missing gold and debt is deducted from rewards without repeat credit', () => {
  const run = createShoppingGame();
  run('finishShopping(); state.gold = 7; emergencyRestock();');
  assert.equal(run('state.gold'), 0);
  assert.equal(run('state.debt'), 13);
  run('emergencyRestock()');
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 3);
  run(`state.queue = [generateCustomer()]; state.queue[0].rarity = 'common';
    selectCustomer(state.queue[0].id); chooseBox('small'); send();`);
  assert.equal(run('state.debt'), 3);
  assert.equal(run('state.gold'), 0);
  assert.match(run("$('result').innerHTML"), /Ausgezahlt: 0 Gold/);
  run(`$('next').onclick(); state.queue = [generateCustomer()]; state.queue[0].rarity = 'common';
    selectCustomer(state.queue[0].id); chooseBox('small'); send();`);
  assert.equal(run('state.debt'), 0);
  assert.equal(run('state.gold'), 7);
  run("$('next').onclick(); emergencyRestock()");
  assert.equal(run('state.debt'), 13);
});

test('order flow supports back navigation, restores items and reserves a place for the active customer', () => {
  const run = createGame();
  run(`globalThis.id = state.queue[0].id; globalThis.customer = JSON.stringify(state.queue[0]);
    globalThis.offer = JSON.stringify(state.queue[0].itemReward); selectCustomer(id);`);
  assert.equal(run("$('orderDialog').open"), true);
  assert.equal(run("$('boxSelection').hidden"), false);
  assert.equal(run("$('packingView').hidden"), true);
  run(`tick(10); chooseBox('small'); packItem('pot1');`);
  assert.equal(run('JSON.stringify(state.active)'), run('customer'));
  assert.equal(run('state.queue.length'), 3);
  assert.equal(run("$('packingView').hidden"), false);
  assert.equal(run('state.inventory.pot1'), 4);
  run("$('backToBoxes').onclick()");
  assert.equal(run('state.inventory.pot1'), 5);
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.boxType'), null);
  assert.equal(run("$('boxSelection').hidden"), false);
  assert.equal(run('JSON.stringify(state.active.itemReward)'), run('offer'));
  run("$('backToCustomers').onclick()");
  assert.equal(run("$('orderDialog').open"), false);
  assert.equal(run('state.active'), null);
  assert.equal(run('state.queue.length'), 4);
  assert.equal(run('state.queue[0].id'), run('id'));
  assert.equal(run('JSON.stringify(state.queue[0])'), run('customer'));
  run('tick(1)');
  assert.equal(run('JSON.stringify(state.queue[0])'), run('customer'));
});

test('escape follows the same back steps and submitting closes the order overlay before showing the merchant', () => {
  const run = createGame();
  run(`state.completed = 4; selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');
    globalThis.event = { prevented: false, preventDefault() { this.prevented = true; } };
    $('orderDialog').listeners.cancel(event);`);
  assert.equal(run('event.prevented'), true);
  assert.equal(run('state.inventory.pot1'), 5);
  assert.equal(run('state.boxType'), null);
  run("$('orderDialog').listeners.cancel(event)");
  assert.equal(run('state.active'), null);
  assert.equal(run("$('orderDialog').open"), false);
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1'); send();");
  assert.equal(run("$('orderDialog').open"), false);
  assert.equal(run('state.showingResult'), true);
  assert.equal(run("$('shopDialog').open"), undefined);
  run("$('next').onclick()");
  assert.equal(run("$('shopDialog').open"), true);
  assert.equal(run("$('orderDialog').open"), false);
});

test('merchant dialog opens during shopping and after the fifth result, and closes when shopping ends', () => {
  const run = createShoppingGame();
  assert.equal(run("$('shopDialog').open"), true);
  run("addToCart('pot1'); checkout()");
  assert.equal(run("$('shopDialog').open"), true);
  assert.equal(run("$('shopGold').textContent"), 493);
  run('finishShopping()');
  assert.equal(run("$('shopDialog').open"), false);
  for (let i = 0; i < 5; i++) {
    run("state.queue = [generateCustomer()]; selectCustomer(state.queue[0].id); chooseBox('small'); send();");
    assert.equal(run("$('shopDialog').open"), false);
    run("$('next').onclick()");
  }
  assert.equal(run("$('shopDialog').open"), true);
  run('finishShopping()');
  assert.equal(run("$('shopDialog').open"), false);
});

test('cart quantities track stock, remain staged until checkout, and over-budget checkout changes nothing', () => {
  const run = createShoppingGame();
  run("state.inventory.pot1 = 2; addToCart('pot1'); addToCart('pot2');");
  assert.equal(run('state.gold'), 500);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.cart.pot1'), 1);
  assert.match(run("$('shop').innerHTML"), /Im Lager: 2 · Im Warenkorb: 1/);
  assert.match(run("$('cart').innerHTML"), /Im Lager: 2 · Im Warenkorb: 1/);
  assert.equal(run("$('checkoutTotal').textContent"), '30 Gold');
  run("removeFromCart('pot1')");
  assert.equal(run('state.cart.pot1'), undefined);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run("$('checkoutTotal').textContent"), '23 Gold');
  run("state.gold = 10; addToCart('pot1'); addToCart('pot2'); checkout();");
  assert.equal(run('state.gold'), 10);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.inventory.pot2'), undefined);
  assert.equal(run("$('checkout').disabled"), true);
  assert.match(run("$('checkoutMessage').textContent"), /Es fehlen 43 Gold/);
  run("removeFromCart('pot2'); removeFromCart('pot2'); checkout()");
  assert.equal(run('state.gold'), 3);
  assert.equal(run('state.inventory.pot1'), 3);
  assert.equal(run('state.cart.pot1'), undefined);
  assert.equal(run('state.cart.pot2'), undefined);
});

test('ending shopping with staged items asks before discarding them', () => {
  let confirmed = false;
  const run = createShoppingGame({ confirm: () => confirmed });
  run("addToCart('pot1'); finishShopping()");
  assert.equal(run('state.shopping'), true);
  assert.equal(run('state.cart.pot1'), 1);
  confirmed = true;
  run('finishShopping()');
  assert.equal(run('state.shopping'), false);
  assert.equal(run('state.cart.pot1'), undefined);
  assert.equal(run('state.gold'), 500);
});

test('new game starts with five of each base item and only wannabes; merchant arrives after five orders', () => {
  const run = createGame();
  assert.equal(run('state.shopping'), false);
  assert.equal(run("$('shopDialog').open"), undefined);
  assert.equal(run('state.gold'), 500);
  assert.equal(run('Object.keys(state.inventory).length'), run('RESTOCK_IDS.length'));
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === (RESTOCK_IDS.includes(item.id) ? 5 : undefined))'), true);
  assert.equal(run("state.queue.every(customer => customer.tier === 'wannabe')"), true);
  assert.match(run("$('merchantStatus').textContent"), /5 Aufträgen/);
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  assert.equal(run('state.inventory.pot1'), 4);
  assert.equal(run('state.box.length'), 1);
  assert.equal(run('state.gold'), 500);
  run('removeFromBox(0)');
  for (let i = 1; i <= 5; i++) {
    run('send()');
    assert.equal(run('state.shopping'), i === 5);
    run("$('next').onclick()");
    if (i < 5) run("state.queue = [generateCustomer()]; selectCustomer(state.queue[0].id); chooseBox('small');");
  }
  assert.equal(run("$('shopDialog').open"), true);
  assert.equal(run('state.shopOffers.length'), 4);
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === (RESTOCK_IDS.includes(item.id) ? 5 : undefined))'), true);
});

test('level thresholds carry overflow and level-ups unlock items and boxes without granting free stock', () => {
  const run = createGame();
  for (const [exp, level, current, required] of [[0, 1, 0, 100], [99, 1, 99, 100], [100, 2, 0, 200], [299, 2, 199, 200], [300, 3, 0, 300], [605, 4, 5, 400]]) {
    assert.deepEqual(JSON.parse(run(`JSON.stringify(progression(${exp}))`)), { level, current, required });
  }
  run(`state.exp = 95; selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.rarity = 'common'; state.active.needs = [{attr:'hp', target:10, prio:1}];
    packItem('pot1'); send();`);
  assert.equal(run('state.exp'), 115);
  assert.equal(run('progression().level'), 2);
  assert.equal(run('progression().current'), 15);
  assert.equal(run("isUnlocked(ITEMS.find(item => item.id === 'sword'))"), true);
  assert.equal(run('state.inventory.sword'), undefined);
  assert.match(run("$('result').innerHTML"), /Levelaufstieg: 1 → 2/);
  assert.match(run("$('result').innerHTML"), /Abenteurer/);
});

test('level gates hold for shop, checkout and boxes and roadmap reflects the same unlocks', () => {
  const run = createGame();
  run("state.shopping = true; addToCart('sword');");
  assert.equal(run('state.cart.sword'), undefined);
  run("state.cart.sword = 1; checkout();");
  assert.equal(run('state.gold'), 500);
  assert.equal(run('state.inventory.sword'), undefined);
  assert.match(run("$('checkoutMessage').textContent"), /gesperrte oder bei diesem Besuch nicht angebotene Items/);
  run("state.cart = {}; finishShopping(); selectCustomer(state.queue[0].id); chooseBox('medium');");
  assert.equal(run('state.boxType'), null);
  run("state.exp = expForLevel(3); chooseBox('medium');");
  assert.equal(run('state.boxType.id'), 'medium');
  assert.equal(run('queueCapacity()'), 5);
  run("chooseBox('magic')");
  assert.equal(run('state.boxType.id'), 'medium');
  run("state.exp = expForLevel(4); chooseBox('magic'); renderRoadmap();");
  assert.equal(run('state.boxType.id'), 'magic');
  assert.match(run("$('roadmap').innerHTML"), /Level 4 · Freigeschaltet · Aktuell/);
  assert.match(run("$('roadmap').innerHTML"), /Level 5 · Gesperrt/);
  run('state.exp = expForLevel(6)');
  assert.equal(run('queueCapacity()'), 6);
});

test('generated customers and reward items obey level gates and increased queue capacity fills naturally', () => {
  const run = createGame();
  for (let level = 1; level <= 7; level++) {
    run(`state.exp = expForLevel(${level});`);
    assert.equal(run(`Array.from({length: 100}, () => generateCustomer()).every(customer =>
      CUSTOMER_TIERS.find(tier => tier.id === customer.tier).level <= progression().level &&
      (!customer.itemReward.item || isUnlocked(customer.itemReward.item)))`), true);
  }
  run('state.exp = expForLevel(3); openRoadmap(); tick(SPAWN_INTERVAL - 1);');
  assert.equal(run('state.queue.length'), 4);
  run("tick(1); $('closeRoadmap').onclick();");
  assert.equal(run('state.queue.length'), 5);
});

test('waiting and active customers never expire or cost streak points during long absences', () => {
  const run = createGame();
  run(`state.exp = expForLevel(7); state.streak = 5;
    selectCustomer(state.queue[0].id);
    state.queue = ['hero', 'demigod'].map(id => {
      globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === id);
      return generateCustomer();
    });
    globalThis.active = JSON.stringify(state.active);
    globalThis.waiting = JSON.stringify(state.queue);
    tick(7 * 24 * 60 * 60);`);
  assert.equal(run('state.streak'), 5);
  assert.equal(run('JSON.stringify(state.active)'), run('active'));
  assert.equal(run('JSON.stringify(state.queue.slice(0, 2))'), run('waiting'));
  assert.equal(run('state.queue.length + 1'), run('queueCapacity()'));
});

test('a delivery earns its checkpoint package automatically and falling below then regaining it cannot farm rewards', () => {
  const run = createGame();
  run(`state.streak = 9; selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.itemReward = {quality: 0.5, item: ITEMS.find(item => item.id === 'pot1')};
    state.active.needs = [{attr:'hp', target:10, prio:1}];
    packItem('pot1'); send();`);
  assert.equal(run('state.streak'), 10);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 23);
  assert.match(run("$('result').innerHTML"), /Checkpunkt 10:/);
  run('changeStreak(-1); changeStreak(1); render();');
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 23);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.claimedCheckpoints)')), [10]);
  assert.match(run("$('streakNext').textContent"), /15: 10 % Rabatt/);
});

test('crossing several checkpoints grants each once, queues separate discounts, and packages obey item unlocks', () => {
  const run = createGame();
  run('state.inventory = {}; changeStreak(27); render();');
  assert.equal(run('state.streak'), 27);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 6);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.pendingDiscounts)')), [15, 25]);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.claimedCheckpoints)')), [10, 15, 20, 25]);
  assert.match(run("$('streakNext').textContent"), /Alle Checkpunkte/);
  run('changeStreak(-27); changeStreak(25)');
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 6);
  assert.equal(run('state.pendingDiscounts.length'), 2);
  run(`state.completed = 4; selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();`);
  assert.equal(run('discountPercent()'), 10);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.pendingDiscounts)')), [25]);
  run(`finishShopping(); state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();`);
  assert.equal(run('discountPercent()'), 15);
  assert.equal(run('state.pendingDiscounts.length'), 0);

  for (const level of [1, 2, 3, 4, 5]) {
    const game = createGame();
    game(`state.exp = expForLevel(${level}); changeStreak(19); state.inventory = {}; changeStreak(1);`);
    assert.equal(game('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 3);
    assert.equal(game(`Object.keys(state.inventory).every(id =>
      ITEMS.find(item => item.id === id).level === Math.max(...ITEMS.filter(isUnlocked).map(item => item.level)))`), true);
  }
});

test('earned discounts apply immediately to the next merchant, cover multiple checkouts, and queue for separate visits', () => {
  const run = createGame();
  run(`state.exp = expForLevel(2); changeStreak(14); state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}]; packItem('pot1'); send();`);
  assert.equal(run('state.streak'), 15);
  assert.equal(run('state.activeDiscount'), 15);
  assert.equal(run('state.pendingDiscounts.length'), 0);
  run("$('next').onclick(); state.gold = 13; addToCart('dag');");
  assert.equal(run('cartSubtotal()'), 8);
  assert.equal(run('cartTotal()'), 8);
  run('checkout();');
  assert.equal(run('state.gold'), 5);
  run("addToCart('dag'); checkout();");
  assert.equal(run('state.gold'), 5);
  assert.equal(run('cartQuantity()'), 1);
  assert.equal(run('state.activeDiscount'), 15);
  run('state.gold = 100; checkout();');
  assert.equal(run('state.gold'), 92);
  assert.equal(run('state.activeDiscount'), 15);
  assert.match(run("$('shopDiscount').textContent"), /10 % Serienrabatt/);
  run('finishShopping(); changeStreak(10);');
  assert.equal(run('state.activeDiscount'), null);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.pendingDiscounts)')), [25]);
  run(`state.completed = 4; state.queue = [generateCustomer()];
    selectCustomer(state.queue[0].id); chooseBox('small'); send(); $('next').onclick();
    addToCart('dag');`);
  assert.equal(run('state.activeDiscount'), 25);
  assert.equal(run('cartTotal()'), 7);
  assert.match(run("$('shopDiscount').textContent"), /15 % Serienrabatt/);
  run('checkout(); finishShopping();');
  assert.equal(run('discountPercent()'), 0);
  assert.equal(run('state.pendingDiscounts.length'), 0);
});

test('checkpoint details distinguish pending and earned rewards without spending a bonus', () => {
  const run = createGame();
  run(`globalThis.customers = JSON.stringify(state.queue); openStreak(15); tick(20);`);
  assert.equal(run("$('streakDialog').open"), true);
  assert.equal(run('JSON.stringify(state.queue)'), run('customers'));
  assert.match(run("$('streakRewards').innerHTML"), /selected-checkpoint/);
  assert.match(run("$('streakRewards').innerHTML"), /10 % Rabatt während des gesamten nächsten Händlerbesuchs/);
  assert.equal(run('state.claimedCheckpoints.length'), 0);
  run("$('closeStreak').onclick(); changeStreak(15); render(); openStreak(15);");
  assert.match(run("$('streakRewards').innerHTML"), /Für kommenden Händlerbesuch vorgemerkt/);
  assert.match(run("$('streakCheckpoints').innerHTML"), /checkpoint claimed/);
  assert.equal(run('state.pendingDiscounts.length'), 1);
  run("$('closeStreak').onclick(); tick(1);");
  assert.equal(run('JSON.stringify(state.queue)'), run('customers'));
});

test('audio is lazy, reuses one context and creates short fading notes only after interaction', async () => {
  const audio = fakeAudio();
  const run = createGame(audio);
  run("sfx.play('arrival'); render();");
  assert.equal(audio.contexts.length, 0);
  await run('document.listeners.pointerup({target: null})');
  run("sfx.play('pack')");
  const context = audio.contexts[0];
  assert.equal(context.oscillators.length, 2);
  assert.ok(context.oscillators.every(note => note.stopTime > note.startTime && note.stopTime - note.startTime < 0.2));
  assert.ok(context.gains.slice(1).every(gain => gain.gain.events.at(-1)[0] === 'ramp' && gain.gain.events.at(-1)[1] === 0));
  await run('document.listeners.keydown({target: null})');
  assert.equal(audio.contexts.length, 1);
});

test('sound toggle stops current notes and remembers mute across reloads without creating an audio context', async () => {
  const audio = fakeAudio();
  const storage = new Map();
  const run = createGame({ ...audio, storage });
  await run('document.listeners.pointerup({target: null})');
  run("sfx.play('level')");
  const context = audio.contexts[0];
  await run("$('soundToggle').onclick()");
  assert.equal(storage.get('soundEnabled'), '0');
  assert.equal(run("$('soundToggle')['aria-pressed']"), 'false');
  assert.ok(context.oscillators.every(note => note.stopTime === context.currentTime + 0.03));
  run("sfx.play('checkout')");
  assert.equal(context.oscillators.length, 4);
  const reloaded = createGame({ ...audio, storage });
  await reloaded('document.listeners.pointerup({target: null})');
  assert.equal(audio.contexts.length, 1);
  assert.match(reloaded("$('soundToggle').textContent"), /Ton aus/);
  await reloaded("$('soundToggle').onclick()");
  assert.equal(audio.contexts.length, 2);
  assert.equal(storage.get('soundEnabled'), '1');
  assert.equal(audio.contexts[1].oscillators.length, 1);
});

test('hidden pages do not play sounds, silence current notes, and restore volume when visible', async () => {
  const audio = fakeAudio();
  const run = createGame(audio);
  await run('document.listeners.pointerup({target: null})');
  run("sfx.play('arrival'); document.hidden = true; document.listeners.visibilitychange(); sfx.play('checkout');");
  const context = audio.contexts[0];
  assert.equal(context.oscillators.length, 2);
  assert.ok(context.oscillators.every(note => note.stopTime === context.currentTime + 0.03));
  run("document.hidden = false; document.listeners.visibilitychange(); sfx.play('send');");
  assert.equal(context.gains[0].gain.events.at(-1)[1], 0.25);
  assert.equal(context.oscillators.length, 5);
});

test('audio failures are visible and retryable without blocking gameplay, and unsupported browsers remain playable', async () => {
  const unsupported = createGame();
  assert.equal(unsupported("$('soundToggle').disabled"), true);
  assert.match(unsupported("$('soundStatus').textContent"), /unterstützt keine Spielsounds/);
  const options = { failResume: true };
  const audio = fakeAudio(options);
  const warnings = [];
  const run = createGame({ ...audio, console: { warn: (...args) => warnings.push(args) } });
  await run('document.listeners.pointerup({target: null})');
  assert.equal(warnings.length, 1);
  assert.equal(run("$('soundStatus').hidden"), false);
  assert.match(run("$('soundToggle').textContent"), /Ton versuchen/);
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  assert.equal(run('state.box.length'), 1);
  options.failResume = false;
  await run("$('soundToggle').onclick()");
  assert.equal(run("$('soundStatus').hidden"), true);
  assert.equal(audio.contexts.length, 1);
  options.failOscillator = true;
  run("packItem('pot1')");
  assert.equal(run('state.box.length'), 2);
  assert.equal(warnings.length, 2);
  assert.equal(run("$('soundStatus').hidden"), false);
});

test('rapid sounds have bounded simultaneous notes and finished voices are released', async () => {
  const audio = fakeAudio();
  const run = createGame(audio);
  await run('document.listeners.pointerup({target: null})');
  run("for (let i=0; i<100; i++) sfx.play('cart')");
  const context = audio.contexts[0];
  assert.equal(context.oscillators.length, 16);
  for (const note of context.oscillators) note.onended();
  assert.ok(context.oscillators.every(note => note.disconnected));
  run("sfx.play('checkout')");
  assert.equal(context.oscillators.length, 19);
});

test('game sounds follow committed actions and customer changes, not rendering or rejected actions', () => {
  const run = createGame();
  run(`globalThis.sounds = []; sfx.play = name => sounds.push(name);
    state.queue = []; state.spawnT = 0; tick(1); render(); render(); tick(1);`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), ['arrival']);
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1'); packItem('sword');");
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds.slice(-3))')), ['select', 'box', 'pack']);
  run(`sounds.length = 0; state.queue = [generateCustomer()]; state.spawnT = SPAWN_INTERVAL; tick(1);`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), []);

  const shop = createShoppingGame();
  shop(`globalThis.sounds = []; sfx.play = name => sounds.push(name);
    addToCart('pot1'); state.gold = 0; checkout();`);
  assert.deepEqual(JSON.parse(shop('JSON.stringify(sounds)')), ['cart']);
  shop('state.gold = 500; checkout(); checkout();');
  assert.deepEqual(JSON.parse(shop('JSON.stringify(sounds)')), ['cart', 'checkout']);
});

test('checkpoint jingle takes precedence over level-up and send; merchant chime waits until the result is closed', () => {
  const run = createGame();
  run(`globalThis.sounds = []; sfx.play = name => sounds.push(name);
    state.exp = 95; state.streak = 9; state.completed = 4;
    selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}];
    packItem('pot1'); sounds.length = 0; send(); send();`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), ['checkpoint']);
  run("$('next').onclick()");
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), ['checkpoint', 'merchant']);
});

test('rare items unlock in the shop, transfer at checkout, and fulfill two needs with one slot', () => {
  for (const id of ['righteousShield', 'runeblade', 'guardianAmulet', 'lifebloomStaff', 'emberCharm', 'vampiricDagger']) {
    const run = createShoppingGame();
    run(`globalThis.item = ITEMS.find(item => item.id === '${id}');
      state.exp = expForLevel(item.level - 1); addToCart(item.id);`);
    assert.equal(run('cartQuantity()'), 0);
    run('state.exp = expForLevel(item.level); addToCart(item.id);');
    assert.equal(run('state.gold'), 500);
    assert.equal(run('state.inventory[item.id]'), undefined);
    assert.match(run("$('shop').innerHTML"), /shop-row item-rarity-rare/);
    assert.match(run("$('cart').innerHTML"), /cart-row item-rarity-rare/);
    assert.match(run("$('cart').innerHTML"), /Selten/);
    run(`checkout(); finishShopping(); selectCustomer(state.queue[0].id);
      state.active.needs = Object.entries(item.stats).map(([attr,target]) => ({attr,target,prio:2}));
      chooseBox('small'); packItem(item.id);`);
    assert.equal(run('state.gold'), run('500 - shopPrice(item)'));
    assert.equal(run('usedSlots()'), 1);
    assert.equal(run('state.inventory[item.id]'), 0);
    assert.equal(run('quality()'), 1);
    assert.equal(run('state.active.needs.length'), 2);
    assert.match(run("$('box').innerHTML"), /box-item icon-slot item-rarity-rare/);
    const attributes = JSON.parse(run('JSON.stringify(Object.entries(item.stats))'));
    for (const [attr, value] of attributes) {
      assert.equal(run(`totals()['${attr}']`), value);
      assert.match(run("$('packingNeedValues').innerHTML"), new RegExp(`${value}/${value}`));
    }
    run('removeFromBox(0)');
    assert.equal(run('quality()'), 0);
    assert.equal(run('state.inventory[item.id]'), 1);
    run('packItem(item.id); selectCustomer(state.queue[0].id);');
    assert.equal(run('state.inventory[item.id]'), 1);
    assert.equal(run('state.box.length'), 0);
  }
});

test('multi-attribute items combine with ordinary items and box modifiers without per-item clamping', () => {
  const run = createShoppingGame();
  run(`addToCart('runeblade'); addToCart('righteousShield'); addToCart('pot2'); checkout(); finishShopping();
    selectCustomer(state.queue[0].id); chooseBox('magic');
    state.active.needs = [{attr:'magic', target:25, prio:3}, {attr:'melee', target:2, prio:1}, {attr:'armor', target:20, prio:2}];
    packItem('runeblade'); packItem('righteousShield'); packItem('pot2');`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(totals())')), { magic: 25, melee: 2, armor: 20, hp: 25 });
  assert.equal(run('quality()'), 1);
  assert.equal(run('usedSlots()'), 3);
  assert.match(run("$('preview').innerHTML"), /Shopwert: 114/);
  run('removeFromBox(0)');
  assert.deepEqual(JSON.parse(run('JSON.stringify(totals())')), { magic: 15, melee: -10, armor: 20, hp: 25 });
  assert.ok(run('quality()') < 1);
  run("chooseBox('medium')");
  assert.deepEqual(JSON.parse(run('JSON.stringify(totals())')), {});
  assert.equal(run('state.inventory.runeblade'), 1);
  assert.equal(run('state.inventory.righteousShield'), 1);
  assert.equal(run('state.inventory.pot2'), 1);
});

test('roadmap and streak packages include unlocked rare items while starter stock and emergency restock stay basic', () => {
  const run = createGame();
  assert.equal(run("Object.keys(state.inventory).every(id => ITEMS.find(item => item.id === id).rarity === 'common')"), true);
  run(`state.exp = expForLevel(3); Math.random = () => 0;
    changeStreak(19); state.inventory = {}; changeStreak(1); render(); renderRoadmap();`);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b,0)'), 3);
  assert.equal(run("Object.keys(state.inventory).every(id => ITEMS.find(item => item.id === id).rarity === 'rare' && isUnlocked(ITEMS.find(item => item.id === id)))"), true);
  assert.match(run("$('inventory').innerHTML"), /icon-slot item-rarity-rare/);
  assert.match(run("$('roadmap').innerHTML"), /Schild der Rechtschaffenheit/);
  assert.match(run("$('roadmap').innerHTML"), /Selten · 🛡️ Rüstung: \+20 · 🔮 Magie: \+10/);
  run('state.inventory = {}; emergencyRestock();');
  assert.equal(run("Object.keys(state.inventory).every(id => ITEMS.find(item => item.id === id).rarity === 'common')"), true);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b,0)'), 3);
});

test('customers generate integer needs including 18 melee and 14 armor within their existing difficulty ranges', () => {
  const run = createGame();
  run(`state.exp = expForLevel(7);
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === 'adventurer');
    globalThis.rolls = [0, .25, .25, .25, 0, 0];
    Math.random = () => rolls.shift() ?? 0;
    globalThis.customer = generateCustomer();`);
  assert.equal(run("customer.needs.find(need => need.attr === 'melee').target"), 18);
  run(`rolls = [4 / CLASSES.length, .5, .5, .5, 0, 0]; customer = generateCustomer();`);
  assert.equal(run("customer.needs.find(need => need.attr === 'armor').target"), 14);
  for (const tier of ['wannabe', 'adventurer', 'hero', 'demigod']) {
    for (const roll of [0, .25, .5, .75, .99999]) {
      run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === '${tier}');
        Math.random = () => ${roll}; customer = generateCustomer();`);
      assert.equal(run(`customer.needs.every(need => {
        const base = [...WANNABE_CLASSES, ...CLASSES, ...HERO_CLASSES, ...DEMIGOD_CLASSES]
          .find(template => template.cls === customer.cls).needs.find(entry => entry.attr === need.attr);
        const scale = CUSTOMER_TIERS.find(tier => tier.id === customer.tier).scale;
        return Number.isInteger(need.target) &&
          need.target >= Math.max(5, Math.round(base.target * scale * .8)) &&
          need.target <= Math.max(5, Math.round(base.target * scale * 1.2));
      })`), true);
    }
  }
});

test('fine-grained item recipes trade gold against slots and overfilling a need is still allowed', () => {
  for (const [ids, needs, cost] of [
    [['ironSword', 'dag', 'shield', 'buckler'], {melee:18, armor:14}, 33],
    [['battleAxe', 'steelShield'], {melee:18, armor:14}, 48],
    [['buckler', 'buckler', 'leatherCap', 'leatherCap'], {armor:14}, 10],
    [['steelShield'], {armor:14}, 18],
    [['pot2', 'bandage', 'bandage'], {hp:37}, 29],
    [['restorationDraught'], {hp:37}, 37],
  ]) {
    const run = createShoppingGame();
    run(`state.exp = expForLevel(3);
      for (const id of ${JSON.stringify(ids)}) addToCart(id);
      checkout(); finishShopping(); selectCustomer(state.queue[0].id);
      state.active.needs = Object.entries(${JSON.stringify(needs)}).map(([attr,target]) => ({attr,target,prio:2}));
      chooseBox('medium');
      for (const id of ${JSON.stringify(ids)}) packItem(id);`);
    assert.equal(run('quality()'), 1);
    assert.equal(run('usedSlots()'), ids.length);
    assert.equal(run('state.gold'), 500 - cost);
    assert.deepEqual(JSON.parse(run('JSON.stringify(totals())')), needs);
    if (ids.length < 5) {
      const extra = { melee: 'dag', armor: 'leatherCap', hp: 'bandage' }[Object.keys(needs)[0]];
      run(`globalThis.goldReward = rewardFor(quality(), state.active).gold;
        state.inventory['${extra}'] = 1; packItem('${extra}');`);
      assert.equal(run('quality()'), 1);
      assert.equal(run('rewardFor(quality(), state.active).gold'), run('goldReward'));
    }
  }
});

test('the expanded catalog is staged independently of shop offers and customer rewards obey unlocks', () => {
  const run = createGame();
  assert.ok(run('ITEMS.length') >= 20 && run('ITEMS.length') <= 25);
  run('state.shopping = true; render();');
  assert.doesNotMatch(run("$('shop').innerHTML"), /locked-items/);
  assert.ok(run('ITEMS.filter(isUnlocked).length') > run('shopCapacity()'));
  run(`state.exp = expForLevel(2); render();
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === 'wannabe');
    Math.random = () => .99999;
    globalThis.customer = generateCustomer();`);
  assert.equal(run('customer.itemReward.item.id'), 'sparkStone');
  run(`state.exp = expForLevel(5);
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === 'adventurer');
    customer = generateCustomer();`);
  assert.equal(run('customer.itemReward.item.id'), 'vampiricDagger');
  assert.equal(run('isUnlocked(customer.itemReward.item)'), true);
  run('state.exp = expForLevel(2); customer = generateCustomer();');
  assert.equal(run('customer.itemReward.item.id'), 'sword');
});

test('fine-grained recipes at an exact weighted reward threshold are not rejected by floating-point noise', () => {
  const run = createShoppingGame();
  run(`globalThis.rollMaterialReward = () => false; globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === 'adventurer');
    state.queue = [generateCustomer()];
    addToCart('shield'); addToCart('buckler'); addToCart('sparkStone');
    checkout(); finishShopping(); selectCustomer(state.queue[0].id); chooseBox('medium');
    state.active.needs = [{attr:'armor', target:20, prio:3}, {attr:'magic', target:10, prio:1}];
    packItem('shield'); packItem('buckler'); packItem('sparkStone');`);
  assert.equal(run('quality()'), 0.7);
  assert.match(run("$('preview').innerHTML"), /Aktuell: 70%/);
  assert.ok(run('rewardFor(quality(), state.active).item'));
  run('send()');
  assert.equal(run('state.streak'), 2);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b,0)'), 1);
  run(`$('next').onclick(); state.queue = [generateCustomer()];
    state.inventory = {plate:1, steelShield:1, shield:1, buckler:1};
    selectCustomer(state.queue[0].id); chooseBox('medium');
    state.active.needs = [{attr:'armor', target:100, prio:1}];
    for (const id of ['plate','steelShield','shield','buckler']) packItem(id);`);
  assert.equal(run('quality()'), 0.58);
  assert.match(run("$('preview').innerHTML"), /Aktuell: 58%/);
});
