const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function createGame(options = {}) {
  const elements = new Map();
  const storage = options.storage || new Map();
  const context = vm.createContext({
    AudioContext: options.AudioContext,
    console: options.console || console,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    document: {
      hidden: false,
      listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      querySelector: () => null,
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            classList: { add() {}, remove() {}, toggle() {} },
            style: {},
            listeners: {},
            querySelectorAll: () => [],
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
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    confirm: options.confirm || (() => true),
    performance: { now: () => 0 },
    setInterval() {},
  });
  for (const file of ['sound.js', 'game.js']) {
    vm.runInContext(readFileSync(`${__dirname}/${file}`, 'utf8'), context);
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
    run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}'); globalThis.customer = generateCustomer();`);
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
    run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}');
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
  run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'demigod');
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
  run(`Math.random = () => 0;
    globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'hero');
    state.queue = [generateCustomer()]; finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small');`);
  assert.match(run("$('customer').innerHTML"), /class="reward-icon"[^>]*>🥋/);
  assert.match(run("$('customer').innerHTML"), /ab 85 %/);
  assert.match(run("$('customer').innerHTML"), /aria-label="1 Plattenrüstung ab 85 % Boxqualität · Gewöhnlich · 🛡️ Rüstung: \+30"/);
  assert.doesNotMatch(run("$('customer').innerHTML"), /✓ Reward|höchste erreichte Stufe/);
  run('send()');
  assert.match(run("$('result').innerHTML"), /Keine Itembelohnung – benötigt: 85 %/);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
  assert.equal(run('state.streak'), 0);
});

test('quality shown just below a reward threshold does not round up and promise an unearned item', () => {
  const run = createGame();
  run(`state.streak = 7; selectCustomer(state.queue[0].id); chooseBox('small');
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

test('merchant pauses customers, blocks selection, and returns after exactly five deliveries each round', () => {
  const run = createShoppingGame();
  run('globalThis.initialTime = state.queue[0].timeLeft; tick(10); selectCustomer(state.queue[0].id);');
  assert.equal(run('state.queue[0].timeLeft'), run('initialTime'));
  assert.equal(run('state.active'), null);
  run('finishShopping(); tick(1);');
  assert.equal(run('state.queue[0].timeLeft'), run('initialTime - 1'));
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
  run(`globalThis.id = state.queue[0].id; globalThis.time = state.queue[0].timeLeft;
    globalThis.offer = JSON.stringify(state.queue[0].itemReward); selectCustomer(id);`);
  assert.equal(run("$('orderDialog').open"), true);
  assert.equal(run("$('boxSelection').hidden"), false);
  assert.equal(run("$('packingView').hidden"), true);
  run(`tick(10); chooseBox('small'); packItem('pot1');`);
  assert.equal(run('state.active.timeLeft'), run('time'));
  assert.equal(run('state.queue.length'), 2);
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
  assert.equal(run('state.queue.length'), 3);
  assert.equal(run('state.queue[0].id'), run('id'));
  assert.equal(run('state.queue[0].timeLeft'), run('time'));
  run('tick(1)');
  assert.equal(run('state.queue[0].timeLeft'), run('time - 1'));
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
  assert.equal(run('queueCapacity()'), 4);
  run("chooseBox('magic')");
  assert.equal(run('state.boxType.id'), 'medium');
  run("state.exp = expForLevel(4); chooseBox('magic'); renderRoadmap();");
  assert.equal(run('state.boxType.id'), 'magic');
  assert.match(run("$('roadmap').innerHTML"), /Level 4 · Freigeschaltet · Aktuell/);
  assert.match(run("$('roadmap').innerHTML"), /Level 5 · Gesperrt/);
  run('state.exp = expForLevel(6)');
  assert.equal(run('queueCapacity()'), 5);
});

test('generated customers and reward items obey level gates and increased queue capacity fills naturally', () => {
  const run = createGame();
  for (let level = 1; level <= 7; level++) {
    run(`state.exp = expForLevel(${level});`);
    assert.equal(run(`Array.from({length: 100}, () => generateCustomer()).every(customer =>
      CUSTOMER_TIERS.find(tier => tier.id === customer.tier).level <= progression().level &&
      isUnlocked(customer.itemReward.item))`), true);
  }
  run('state.exp = 0; globalThis.beforeTime = state.queue[0].timeLeft; openRoadmap(); tick(1);');
  assert.equal(run('state.queue[0].timeLeft'), run('beforeTime'));
  run("$('closeRoadmap').onclick(); state.exp = expForLevel(3); tick(1);");
  assert.equal(run('state.queue.length'), 4);
});

test('departing customers each cost one point regardless of tier, active customers are protected, and points stop at zero', () => {
  const run = createGame();
  run(`state.exp = expForLevel(7); state.streak = 5;
    selectCustomer(state.queue[0].id); state.active.timeLeft = 0.1;
    state.queue = ['hero', 'demigod'].map(id => {
      globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === id);
      return {...generateCustomer(), timeLeft: 0.5};
    });
    tick(1);`);
  assert.equal(run('state.streak'), 3);
  assert.ok(run('state.active'));
  assert.equal(run('state.active.timeLeft'), 0.1);
  assert.equal(run("$('streakPoints').textContent"), 3);
  run(`state.queue = [{...generateCustomer(), timeLeft: 0.5}];
    state.spawnT = 100; tick(1); tick(1);`);
  assert.equal(run('state.streak'), 2);
  run(`state.queue = Array.from({length: 4}, () => ({...generateCustomer(), timeLeft: 0.1})); tick(1);`);
  assert.equal(run('state.streak'), 0);
});

test('a delivery earns its checkpoint package automatically and falling below then regaining it cannot farm rewards', () => {
  const run = createGame();
  run(`state.streak = 9; selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:10, prio:1}];
    packItem('pot1'); send();`);
  assert.equal(run('state.streak'), 10);
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 23);
  assert.match(run("$('result').innerHTML"), /Checkpunkt 10:/);
  run('changeStreak(-1); changeStreak(1); render();');
  assert.equal(run('Object.values(state.inventory).reduce((a,b) => a+b, 0)'), 23);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.claimedCheckpoints)')), [10]);
  assert.match(run("$('streakNext').textContent"), /15: 10 % Händlerrabatt/);
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

test('checkpoint details distinguish pending and earned rewards and pause timers without spending a bonus', () => {
  const run = createGame();
  run(`globalThis.beforeTime = state.queue[0].timeLeft; openStreak(15); tick(20);`);
  assert.equal(run("$('streakDialog').open"), true);
  assert.equal(run('state.queue[0].timeLeft'), run('beforeTime'));
  assert.match(run("$('streakRewards').innerHTML"), /selected-checkpoint/);
  assert.match(run("$('streakRewards').innerHTML"), /10 % Rabatt während des gesamten nächsten Händlerbesuchs/);
  assert.equal(run('state.claimedCheckpoints.length'), 0);
  run("$('closeStreak').onclick(); changeStreak(15); render(); openStreak(15);");
  assert.match(run("$('streakRewards').innerHTML"), /Für kommenden Händlerbesuch vorgemerkt/);
  assert.match(run("$('streakCheckpoints').innerHTML"), /checkpoint claimed/);
  assert.equal(run('state.pendingDiscounts.length'), 1);
  run("$('closeStreak').onclick(); tick(1);");
  assert.equal(run('state.queue[0].timeLeft'), run('beforeTime - 1'));
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
  run(`sounds.length = 0; state.queue = [{...generateCustomer(), timeLeft:0.1}]; state.spawnT = 0; tick(1);`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(sounds)')), ['leave']);

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
    assert.match(run("$('box').innerHTML"), /box-item item-rarity-rare/);
    assert.match(run("$('box').innerHTML"), /1 Slot/);
    const attributes = JSON.parse(run('JSON.stringify(Object.entries(item.stats))'));
    for (const [attr, value] of attributes) {
      assert.equal(run(`totals()['${attr}']`), value);
      assert.ok(run("$('box').innerHTML").includes(run(`statsText({${attr}:${value}})`)));
      assert.match(run("$('customer').innerHTML"), new RegExp(`${value}/${value}`));
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
  assert.match(run("$('inventory').innerHTML"), /shop-item item-rarity-rare/);
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
  run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(tier => tier.id === 'adventurer');
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
