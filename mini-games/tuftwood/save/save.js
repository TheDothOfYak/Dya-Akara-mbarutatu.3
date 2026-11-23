(function () {
  'use strict';
  window.V3 = window.V3 || {};
  var memory = Object.create(null), offline = false;
  var slot = 'fbw3:save:1', bad = slot + ':bad';

  // Mirror accessed values so blocked or missing storage can stay in memory.
  function storage(action, key, value) {
    if (!offline) {
      try {
        var store = window.localStorage;
        if (!store) throw new Error('Storage unavailable');
        if (action === 'get') {
          var result = store.getItem(key);
          if (result === null) delete memory[key];
          else memory[key] = result;
          return result;
        }
        if (action === 'set') store.setItem(key, value);
        else store.removeItem(key);
      } catch (_) { offline = true; }
    }
    if (action === 'set') memory[key] = value;
    else if (action === 'remove') delete memory[key];
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  window.V3.save = {
    load: function () {
      var raw = storage('get', slot);
      if (raw === null) return null;
      try {
        var data = JSON.parse(raw);
        if (!object(data) || data.v !== 1 || typeof data.at !== 'number' ||
            !Number.isFinite(data.at) || !object(data.state)) throw new Error('Bad save');
        return data.state;
      } catch (_) {
        // Preserve the first corrupt payload without deleting the original.
        if (storage('get', bad) === null) storage('set', bad, raw);
        return null;
      }
    },
    write: function (state) {
      try {
        if (!object(state)) return false;
        var raw = JSON.stringify({ v: 1, at: Date.now(), state: state });
        // A custom toJSON must not turn the state into a non-object.
        if (!object(JSON.parse(raw).state)) return false;
        storage('set', slot, raw);
        return true;
      } catch (_) { return false; }
    },
    clear: function () { storage('remove', slot); },
    has: function () { return this.load() !== null; },
    pref: function (key, value) {
      try {
        var name = 'fbw3:pref:' + String(key);
        if (arguments.length > 1) {
          var raw = JSON.stringify(value);
          if (raw === undefined) return false;
          storage('set', name, raw);
          return value;
        }
        var saved = storage('get', name);
        return saved === null ? null : JSON.parse(saved);
      } catch (_) { return null; }
    }
  };
}());
