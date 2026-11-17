const sfx = (() => {
  const AudioContextType = globalThis.AudioContext || globalThis.webkitAudioContext;
  const controlIds = ['soundToggle', 'shopSoundToggle'];
  const cues = {
    toggle: [[660, 0, .08]],
    select: [[440, 0, .05], [554, .05, .07]],
    cart: [[660, 0, .045]],
    remove: [[330, 0, .06]],
    box: [[180, 0, .08]],
    pack: [[240, 0, .05], [360, .035, .07]],
    checkout: [[880, 0, .07], [1175, .075, .07], [1568, .15, .12]],
    send: [[220, 0, .06], [330, .06, .06], [440, .12, .12]],
    arrival: [[587, 0, .09], [784, .12, .11]],
    leave: [[330, 0, .09], [262, .1, .13]],
    merchant: [[523, 0, .09], [659, .1, .09], [784, .2, .15]],
    level: [[523, 0, .08], [659, .08, .08], [784, .16, .08], [1047, .24, .18]],
    checkpoint: [[659, 0, .09], [784, .1, .09], [988, .2, .09], [1319, .3, .22]],
  };
  let enabled = localStorage.getItem('soundEnabled') !== '0';
  let context = null;
  let master = null;
  let unlocking = null;
  let failed = false;
  const voices = new Set();

  function renderControl() {
    for (const id of controlIds) {
      const button = document.getElementById(id);
      button.disabled = !AudioContextType;
      button.textContent = !AudioContextType ? '🔇 Kein Audio' : failed ? '🔊 Ton versuchen' : enabled ? '🔊 Ton an' : '🔇 Ton aus';
      button.setAttribute('aria-pressed', String(enabled && !failed && !!AudioContextType));
      button.title = 'Kurze Spielsounds ein- oder ausschalten. Audio startet nach deiner ersten Interaktion.';
    }
    for (const id of ['soundStatus', 'shopSoundStatus']) {
      const status = document.getElementById(id);
      status.hidden = !failed && !!AudioContextType;
      status.textContent = !AudioContextType ? 'Dieser Browser unterstützt keine Spielsounds.'
        : failed ? 'Audio konnte nicht gestartet werden. Über „Ton versuchen“ kannst du es erneut aktivieren.' : '';
    }
  }

  function reportError(error) {
    failed = true;
    console.warn('Spielsounds konnten nicht abgespielt werden:', error);
    renderControl();
  }

  function silence() {
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0, context.currentTime, .01);
    for (const voice of voices) voice.stop(context.currentTime + .03);
  }

  function unlock() {
    if (!enabled || !AudioContextType || document.hidden) return Promise.resolve(false);
    if (unlocking) return unlocking;
    try {
      if (!context || context.state === 'closed') {
        context = new AudioContextType();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
      }
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      unlocking = resumed.then(() => {
        if (!enabled || document.hidden) return false;
        if (context.state !== 'running') throw new Error('Der AudioContext ist nicht aktiv.');
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(.25, context.currentTime);
        failed = false;
        renderControl();
        return true;
      }).catch(error => {
        reportError(error);
        return false;
      }).finally(() => { unlocking = null; });
      return unlocking;
    } catch (error) {
      reportError(error);
      return Promise.resolve(false);
    }
  }

  function play(name) {
    if (!enabled || failed || document.hidden || !context) return;
    if (context.state !== 'running') {
      if (unlocking) {
        const requestedAt = performance.now();
        unlocking.then(ready => {
          if (ready && performance.now() - requestedAt < 300) play(name);
        });
      }
      return;
    }
    // Keep rapid taps quiet and bounded; each voice releases itself after its short envelope.
    if (voices.size + cues[name].length > 16) return;
    try {
      for (const [frequency, offset, duration] of cues[name]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + .008 + offset;
        oscillator.type = name === 'pack' || name === 'box' || name === 'send' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.2, start + .008);
        gain.gain.linearRampToValueAtTime(0, start + duration);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.onended = () => {
          voices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + duration + .01);
        voices.add(oscillator);
      }
    } catch (error) {
      reportError(error);
    }
  }

  async function toggle() {
    enabled = failed || !enabled;
    localStorage.setItem('soundEnabled', enabled ? '1' : '0');
    failed = false;
    renderControl();
    if (enabled) {
      if (await unlock()) play('toggle');
    } else {
      silence();
    }
  }
  for (const id of controlIds) document.getElementById(id).onclick = toggle;
  for (const event of ['pointerup', 'keydown', 'click']) {
    document.addEventListener(event, e => {
      if (!failed && !e.target?.closest?.('.sound-toggle')) return unlock();
    }, { capture: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence();
    else if (enabled && !failed && context?.state === 'running') {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(.25, context.currentTime);
    }
  });
  renderControl();
  return { play };
})();
