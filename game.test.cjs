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
