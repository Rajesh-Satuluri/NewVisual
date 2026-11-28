/* store.js — a minimal reactive store + event emitter (the mitt role). */

export function emitter() {
  const map = new Map();
  return {
    on(type, fn) { (map.get(type) || map.set(type, new Set()).get(type)).add(fn); return () => map.get(type)?.delete(fn); },
    off(type, fn) { map.get(type)?.delete(fn); },
    emit(type, arg) { map.get(type)?.forEach(fn => fn(arg)); },
  };
}

export function createStore(initial) {
  let state = { ...initial };
  const bus = emitter();
  return {
    get: () => state,
    set(patch) { state = { ...state, ...patch }; bus.emit('change', state); },
    subscribe(fn) { return bus.on('change', fn); },
  };
}
