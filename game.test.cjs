const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function createGame() {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            classList: { add() {}, remove() {}, toggle() {} },
            style: {},
            querySelectorAll: () => [],
          });
        }
        return elements.get(id);
      },
    },
    localStorage: { getItem: () => null },
    performance: { now: () => 0 },
    setInterval() {},
  });
  vm.runInContext(readFileSync(`${__dirname}/game.js`, 'utf8'), context);
  return code => vm.runInContext(code, context);
}

test('purchases fill inventory without a customer or box; packing spends no gold', () => {
  const run = createGame();
  run("buy('pot1'); buy('pot1');");
  assert.equal(run('state.gold'), 90);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.box.length'), 0);
  run("packItem('pot1')");
  assert.equal(run('state.inventory.pot1'), 2);
  run("selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 1);
  assert.equal(run('state.gold'), 90);
  assert.match(run("$('preview').innerHTML"), /Itemkosten: 5/);
  run('removeFromBox(0)');
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 90);
  assert.match(run("$('preview').innerHTML"), /Itemkosten: 0/);
});

test('inventory and weight limit packing, not shopping', () => {
  const run = createGame();
  run("for (let i = 0; i < 12; i++) buy('pot1'); selectCustomer(state.queue[0].id); chooseBox('small');");
  run("for (let i = 0; i < 12; i++) packItem('pot1');");
  assert.equal(run('usedWeight()'), 10);
  assert.equal(run('state.inventory.pot1'), 2);
  run("buy('pot1')");
  assert.equal(run('state.inventory.pot1'), 3);
  assert.equal(run('state.box.length'), 10);
  run("packItem('wand')");
  assert.equal(run('state.box.length'), 10);
  run("buy('pot3')");
  assert.equal(run('state.gold'), 35);
});

test('box and customer switches return items; sending consumes only packed items', () => {
  const run = createGame();
  run("buy('pot1'); buy('pot1'); selectCustomer(state.queue[0].id); chooseBox('small'); packItem('pot1');");
  run("chooseBox('small')");
  assert.equal(run('state.box.length'), 1);
  run("state.exp = 60; chooseBox('medium');");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  run("packItem('pot1'); selectCustomer(state.queue[0].id);");
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.inventory.pot1'), 2);
  assert.equal(run('state.gold'), 90);
  run("chooseBox('small'); packItem('pot1'); globalThis.expectedGold = state.gold + rewardFor(quality(), state.active).gold; send();");
  assert.equal(run('state.gold'), run('expectedGold'));
  assert.equal(run('state.inventory.pot1'), 1);
  assert.equal(run('state.box.length'), 0);
  assert.equal(run('state.active'), null);
  run('send()');
  assert.equal(run('state.gold'), run('expectedGold'));
});

test('item reward thresholds respect rarity and upgrade rather than accumulate', () => {
  const run = createGame();
  for (const [rarity, levels] of [['common', 1], ['rare', 2], ['epic', 3]]) {
    run(`globalThis.rollRarity = () => '${rarity}'; globalThis.customer = generateCustomer();`);
    assert.equal(run('customer.itemRewards.length'), levels);
    assert.equal(run('rewardFor(0, customer).item'), null);
    assert.equal(run('rewardFor(0.299999, customer).item'), null);
    for (let i = 0; i < levels; i++) {
      assert.equal(run(`rewardFor(customer.itemRewards[${i}].quality, customer).item.id`),
        run(`customer.itemRewards[${i}].item.id`));
    }
    assert.equal(run('rewardFor(1, customer).item.id'), run(`customer.itemRewards[${levels - 1}].item.id`));
  }
});

test('advertised reward stays fixed and sending grants exactly one item once', () => {
  const run = createGame();
  run(`globalThis.rollRarity = () => 'epic';
    state.queue = [generateCustomer()];
    selectCustomer(state.queue[0].id);
    state.active.needs = [{ attr: 'hp', target: 10, prio: 3 }];
    chooseBox('small');
    buy('pot1'); packItem('pot1');
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
  const run = createGame();
  run(`selectCustomer(state.queue[0].id); chooseBox('small'); send();`);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
  run(`selectCustomer(state.queue[0].id);
    state.active.needs = [{ attr: 'hp', target: 10, prio: 3 }];
    chooseBox('small'); buy('wand'); packItem('wand'); send();`);
  assert.equal(run('Object.values(state.inventory).reduce((a, b) => a + b, 0)'), 0);
});
