const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function createGame(options = {}) {
  const elements = new Map();
  const context = vm.createContext({
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    document: {
      querySelector: () => null,
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            classList: { add() {}, remove() {}, toggle() {} },
            style: {},
            querySelectorAll: () => [],
            addEventListener() {},
            showModal() { this.open = true; },
            close() { this.open = false; },
            focus() {},
          });
        }
        return elements.get(id);
      },
    },
    localStorage: { getItem: () => null },
    confirm: options.confirm || (() => true),
    performance: { now: () => 0 },
    setInterval() {},
  });
  vm.runInContext(readFileSync(`${__dirname}/game.js`, 'utf8'), context);
  return code => vm.runInContext(code, context);
}

function createShoppingGame(options = {}) {
  const run = createGame(options);
  run('state.inventory = {}; state.exp = expForLevel(7); state.shopping = true; render();');
  return run;
}

test('purchases fill inventory without a customer or box; packing spends no gold', () => {
  const run = createShoppingGame();
  run("addToCart('pot1'); addToCart('pot1');");
  assert.equal(run('state.gold'), 500);
  assert.equal(run('state.cart.pot1'), 2);
  assert.equal(run('state.inventory.pot1'), undefined);
  run('checkout()');
  assert.equal(run('state.gold'), 490);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.box.length'), 0);
  run("packItem('pot1')");
  assert.equal(run('state.inventory.pot1'), 2);
  run("finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 1);
  assert.equal(run('state.gold'), 490);
  assert.match(run("$('preview').innerHTML"), /Itemkosten: 5/);
  run('removeFromBox(0)');
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 490);
  assert.match(run("$('preview').innerHTML"), /Itemkosten: 0/);
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
  assert.equal(run('state.gold'), 440);
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
  assert.equal(run('state.gold'), 490);
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
  for (const [tier, target, items] of [
    ['wannabe', 20, ['pot1']],
    ['adventurer', 50, ['pot2', 'pot1']],
    ['hero', 100, ['pot3', 'pot2', 'pot1']],
    ['demigod', 50, ['pot3']],
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
  run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === 'hero');
    state.queue = [generateCustomer()]; finishShopping(); selectCustomer(state.queue[0].id); chooseBox('small');`);
  assert.match(run("$('customer').innerHTML"), /class="reward-icon"[^>]*>🥋/);
  assert.match(run("$('customer').innerHTML"), /ab 85 %/);
  assert.match(run("$('customer').innerHTML"), /aria-label="1 Plattenrüstung ab 85 % Boxqualität"/);
  assert.doesNotMatch(run("$('customer').innerHTML"), /✓ Reward|höchste erreichte Stufe/);
  run('send()');
  assert.match(run("$('result').innerHTML"), /Keine Itembelohnung – benötigt: 85 %/);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
});

test('quality shown just below a reward threshold does not round up and promise an unearned item', () => {
  const run = createGame();
  run(`selectCustomer(state.queue[0].id); chooseBox('small');
    state.active.needs = [{attr:'hp', target:20.01, prio:1}];
    packItem('pot1');`);
  assert.match(run("$('preview').innerHTML"), /Aktuell: 49%/);
  assert.doesNotMatch(run("$('preview').innerHTML"), /✓ Reward/);
  run('send()');
  assert.match(run("$('result').innerHTML"), /Erfüllung: 49%/);
  assert.match(run("$('result').innerHTML"), /Keine Itembelohnung – benötigt: 50 %/);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 19);
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
  assert.equal(run('state.box.reduce((sum, item) => sum + item.value, 0)'), 16);
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
    run('addToCart("pot1"); checkout()');
    assert.equal(run('state.inventory.pot1'), cycle + 1);
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
    assert.ok(run('new Set(Object.keys(state.inventory).map(id => ITEMS.find(it => it.id === id).attr)).size') >= 2);
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

test('desktop selection keeps panels visible while mobile retains auto-collapse', () => {
  const run = createGame();
  run(`finishShopping(); selectCustomer(state.queue[0].id);`);
  assert.equal(run("$('queueCard').open"), false);
  run(`desktopLayout.matches = true; openDesktopPanels();`);
  assert.equal(run("$('queueCard').open"), true);
  run('selectCustomer(state.queue[0].id)');
  for (const id of ['queueCard', 'custCard', 'pickCard', 'boxCard', 'inventoryCard']) {
    assert.equal(run(`$('${id}').open`), true);
  }
});

test('merchant dialog opens during shopping and after the fifth result, and closes when shopping ends', () => {
  const run = createShoppingGame();
  assert.equal(run("$('shopDialog').open"), true);
  run("addToCart('pot1'); checkout()");
  assert.equal(run("$('shopDialog').open"), true);
  assert.equal(run("$('shopGold').textContent"), 495);
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
  assert.equal(run("$('checkoutTotal').textContent"), '23 Gold');
  run("removeFromCart('pot1')");
  assert.equal(run('state.cart.pot1'), undefined);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run("$('checkoutTotal').textContent"), '18 Gold');
  run("state.gold = 10; addToCart('pot1'); addToCart('pot2'); checkout();");
  assert.equal(run('state.gold'), 10);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.inventory.pot2'), undefined);
  assert.equal(run("$('checkout').disabled"), true);
  assert.match(run("$('checkoutMessage').textContent"), /Es fehlen 31 Gold/);
  run("removeFromCart('pot2'); removeFromCart('pot2'); checkout()");
  assert.equal(run('state.gold'), 5);
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
  assert.equal(run('Object.keys(state.inventory).length'), run('ITEMS.filter(isUnlocked).length'));
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === (item.level === 1 ? 5 : undefined))'), true);
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
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === (item.level === 1 ? 5 : undefined))'), true);
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
  assert.match(run("$('checkoutMessage').textContent"), /gesperrte Items/);
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
