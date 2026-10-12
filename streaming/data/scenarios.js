// Business scenario models (I11)
// Two permanent scenarios threaded through every scenario-aware lesson.
// The switcher (I12) sets the ACTIVE scenario; lessons read getScenario()
// to swap REAL example data (events, keys, pipeline), not just a label.

export const SCENARIOS = {
  uber: {
    id: 'uber',
    icon: '🚗',
    name: 'Uber real-time mobility',
    short: 'Uber',
    domain: 'Ride-hailing / real-time mobility',
    entity: 'ride',
    canonicalId: 'R-4471',
    keyField: 'driver_id',
    tagline: '1M GPS pings/sec · sub-100ms fraud detection · surge pricing',
    // A representative event the curriculum reuses across engines.
    sampleEvent: {
      type: 'gps_ping',
      ride_id: 'R-4471',
      driver_id: 'D-88213',
      rider_id: 'U-33109',
      lat: 37.7749, lng: -122.4194,
      speed_kph: 42,
      ts: '2026-10-11T18:04:02.117Z',
    },
    lifecycle: ['requested', 'matched', 'en-route', 'picked-up', 'in-trip', 'completed', 'paid'],
    pipeline: ['Rider app', 'GPS ingest', 'Stream engine', 'Matching', 'Surge pricing', 'Fraud detection', 'Driver app', 'Warehouse'],
    partitioningKey: 'driver_id (keeps a driver\'s pings ordered on one partition)',
    whyOrdering: 'All pings for one driver must stay ordered so trip reconstruction and fraud scoring see events in sequence.',
  },
  ecommerce: {
    id: 'ecommerce',
    icon: '🛒',
    name: 'E-commerce order processing',
    short: 'E-commerce',
    domain: 'Retail / order fulfillment',
    entity: 'order',
    canonicalId: 'O-9001',
    keyField: 'order_id',
    tagline: 'Checkout → payment → inventory → fulfillment → notifications',
    sampleEvent: {
      type: 'order_placed',
      order_id: 'O-9001',
      customer_id: 'C-20571',
      items: 3,
      amount_usd: 128.40,
      warehouse: 'DFW-2',
      ts: '2026-10-11T18:04:02.117Z',
    },
    lifecycle: ['placed', 'payment-authorized', 'inventory-reserved', 'packed', 'shipped', 'delivered', 'settled'],
    pipeline: ['Storefront', 'Order ingest', 'Stream engine', 'Payment', 'Inventory', 'Fraud detection', 'Notifications', 'Warehouse'],
    partitioningKey: 'order_id (keeps an order\'s events ordered end-to-end)',
    whyOrdering: 'Payment, inventory, and fulfillment events for one order must process in order to avoid overselling or double-charging.',
  },
};

const STORE_KEY = 'sml-scenario';
let active = 'uber';
try { const s = localStorage.getItem(STORE_KEY); if (s && SCENARIOS[s]) active = s; } catch (e) {}

const listeners = new Set();

export function getScenarioId() { return active; }
export function getScenario() { return SCENARIOS[active]; }
export function setScenario(id) {
  if (!SCENARIOS[id] || id === active) return;
  active = id;
  try { localStorage.setItem(STORE_KEY, id); } catch (e) {}
  listeners.forEach(fn => { try { fn(SCENARIOS[id]); } catch (e) {} });
}
// Subscribe to scenario changes; returns an unsubscribe fn.
export function onScenarioChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
