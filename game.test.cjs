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
  run('state.inventory = {}; state.shopping = true; render();');
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
  run("state.exp = 60; chooseBox('medium');");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  run("packItem('pot1'); selectCustomer(state.queue[0].id);");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 490);
  run("chooseBox('small'); packItem('pot1'); state.active.itemRewards = []; globalThis.expectedGold = state.gold + rewardFor(quality(), state.active).gold; send();");
  assert.equal(run('state.gold'), run('expectedGold'));
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.active'), null);
  run('send()');
  assert.equal(run('state.gold'), run('expectedGold'));
});

test('item reward thresholds respect rarity and upgrade rather than accumulate', () => {
  const run = createShoppingGame();
  for (const [tier, rarity, levels] of [['wannabe', 'common', 1], ['adventurer', 'common', 1], ['hero', 'rare', 2], ['demigod', 'epic', 3]]) {
    run(`globalThis.rollCustomerTier = () => CUSTOMER_TIERS.find(t => t.id === '${tier}'); globalThis.customer = generateCustomer();`);
    assert.equal(run('customer.itemRewards.length'), levels);
    assert.equal(run('rewardFor(0, customer, true).item'), null);
    assert.equal(run('rewardFor(0.299999, customer, true).item'), null);
    for (let i = 0; i < levels; i++) {
    assert.equal(run(`rewardFor(customer.itemRewards[${i}].quality, customer, true).item.id`),
        run(`customer.itemRewards[${i}].item.id`));
    }
    assert.equal(run('rewardFor(1, customer, true).item.id'), run(`customer.itemRewards[${levels - 1}].item.id`));
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
    globalThis.offer = JSON.stringify(state.active.itemRewards);
    render(); render();`);
  assert.equal(run('JSON.stringify(state.active.itemRewards)'), run('offer'));
  assert.match(run("$('preview').innerHTML"), /Itembelohnung: \+1/);
  run('send()');
  assert.equal(run('state.inventory[rewardId]'), 1);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 1);
  run('send()');
  assert.equal(run('state.inventory[rewardId]'), 1);
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
  assert.deepEqual(JSON.parse(run('JSON.stringify(BOXES.map(box => [box.id, box.slots, box.exp]))')), [
    ['small', 3, 0],
    ['medium', 5, 60],
    ['magic', 3, 100],
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
  run("state.exp = 100; chooseBox('magic');");
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

test('new game starts with five of every item and customer selection; merchant arrives after five orders', () => {
  const run = createGame();
  assert.equal(run('state.shopping'), false);
  assert.equal(run("$('shopDialog').open"), undefined);
  assert.equal(run('state.gold'), 500);
  assert.equal(run('Object.keys(state.inventory).length'), run('ITEMS.length'));
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === 5)'), true);
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
  assert.equal(run('ITEMS.every(item => state.inventory[item.id] === 5)'), true);
});
