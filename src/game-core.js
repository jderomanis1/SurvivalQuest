import { BACKGROUNDS, PRELUDE_CHOICES, SCENES, STATIC_ENDINGS } from './game-data.js';

export const SAVE_KEY = 'dark_commute_release_v2';
export const MAX_INVENTORY = 8;

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const unique = values => [...new Set(values)];

function minutesToClock(totalMinutes) {
  const day = Math.floor(totalMinutes / 1440) + 1;
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return {
    day,
    clock: `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`
  };
}

function applyBackgroundModifier(backgroundId, action, effects) {
  const adjusted = { ...effects };
  if (backgroundId === 'prepared') {
    if (action.id.includes('search') || action.id.includes('inspect') || action.id.includes('map')) {
      if (adjusted.energy < 0) adjusted.energy += 1;
      if (adjusted.morale < 0) adjusted.morale += 1;
    }
  }
  if (backgroundId === 'resilient') {
    ['energy', 'hunger', 'thirst'].forEach(stat => {
      if (adjusted[stat] < 0) adjusted[stat] = Math.min(0, adjusted[stat] + 2);
      if (adjusted[stat] > 0) adjusted[stat] += 2;
    });
  }
  if (backgroundId === 'persuasive' && action.social) {
    adjusted.morale = (adjusted.morale || 0) + 4;
    if (adjusted.energy < 0) adjusted.energy += 1;
  }
  return adjusted;
}

export function createInitialState({ prelude = 'rise', name = 'SURVIVOR', background = 'prepared' } = {}) {
  const preludeData = PRELUDE_CHOICES[prelude] || PRELUDE_CHOICES.rise;
  const state = {
    version: 2,
    player: {
      name: String(name || 'SURVIVOR').trim().slice(0, 20).toUpperCase(),
      background: BACKGROUNDS[background] ? background : 'prepared'
    },
    stats: { morale: 75, hunger: 82, thirst: 86, energy: 72 },
    location: 'bedroom',
    totalMinutes: 9 * 60 + 14,
    day: 1,
    clock: '09:14 AM',
    milesRemaining: 15,
    inventory: [],
    clues: preludeData.clue ? [preludeData.clue] : [],
    flags: {},
    completedActions: [],
    visited: ['bedroom'],
    history: [{ type: 'system', text: preludeData.text }],
    score: 0,
    status: 'playing',
    cause: '',
    ending: '',
    freeformUsed: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  if (preludeData.stat) {
    Object.entries(preludeData.stat).forEach(([stat, delta]) => {
      state.stats[stat] = clamp(state.stats[stat] + delta);
    });
  }
  return state;
}

function hasItem(state, item) {
  return state.inventory.includes(item);
}

function requirementsMet(state, action) {
  if (action.requiresItems && !action.requiresItems.every(item => hasItem(state, item))) return false;
  if (action.requiresAnyItems && !action.requiresAnyItems.some(item => hasItem(state, item))) return false;
  if (action.requiresFlags && !action.requiresFlags.every(flag => state.flags[flag])) return false;
  if (action.requiresClues && !action.requiresClues.every(clue => state.clues.includes(clue))) return false;
  if (action.once && state.completedActions.includes(action.id)) return false;
  return true;
}

export function getUtilityActions(state) {
  const actions = [];
  if (hasItem(state, 'Water Bottle') && state.stats.thirst < 90) {
    actions.push({
      id: 'utility_drink', label: 'DRINK WATER', utility: true, time: 3,
      effects: { thirst: 24, morale: 2 }, removeItems: ['Water Bottle'],
      outcome: 'You drink slowly. The bottle empties faster than you want it to.'
    });
  }
  if ((hasItem(state, 'Granola Bar') || hasItem(state, 'Food Pack')) && state.stats.hunger < 90) {
    const item = hasItem(state, 'Food Pack') ? 'Food Pack' : 'Granola Bar';
    actions.push({
      id: `utility_eat_${item.toLowerCase().replace(/\s/g, '_')}`, label: `EAT ${item.toUpperCase()}`,
      utility: true, time: 8, effects: { hunger: item === 'Food Pack' ? 30 : 18, energy: 6, morale: 2 },
      removeItems: [item], outcome: `You eat the ${item.toLowerCase()}. It is not comfort, but it is fuel.`
    });
  }
  if (hasItem(state, 'First Aid Kit') && state.stats.energy < 65) {
    actions.push({
      id: 'utility_first_aid', label: 'USE FIRST AID KIT', utility: true, time: 12,
      effects: { energy: 18, morale: 5 }, removeItems: ['First Aid Kit'],
      outcome: 'You clean the cuts, wrap what hurts, and give your body a reason to continue.'
    });
  }
  return actions;
}

export function getAvailableActions(state) {
  if (state.status !== 'playing') return [];
  const scene = SCENES[state.location];
  if (!scene) return [];
  return [
    ...scene.actions.filter(action => requirementsMet(state, action)),
    ...getUtilityActions(state)
  ];
}

function addInventory(state, items = []) {
  const available = MAX_INVENTORY - state.inventory.length;
  const accepted = items.filter(item => !state.inventory.includes(item)).slice(0, Math.max(0, available));
  state.inventory = unique([...state.inventory, ...accepted]);
  return accepted;
}

function removeInventory(state, items = []) {
  state.inventory = state.inventory.filter(item => !items.includes(item));
}

function determineDeath(stats) {
  if (stats.thirst <= 0) return 'dehydration';
  if (stats.energy <= 0) return 'total exhaustion';
  if (stats.hunger <= 0) return 'starvation';
  if (stats.morale <= 0) return 'loss of hope';
  return '';
}

export function applyAction(currentState, actionId) {
  const state = structuredClone(currentState);
  const available = getAvailableActions(state);
  const action = available.find(candidate => candidate.id === actionId);
  if (!action) {
    return { state: currentState, event: { type: 'error', text: 'That action is not available right now.' } };
  }

  const originalStats = { ...state.stats };
  const effects = applyBackgroundModifier(state.player.background, action, action.effects || {});
  Object.entries(effects).forEach(([stat, delta]) => {
    if (stat in state.stats) state.stats[stat] = clamp(state.stats[stat] + delta);
  });

  state.totalMinutes += action.time || 5;
  const temporal = minutesToClock(state.totalMinutes);
  state.day = temporal.day;
  state.clock = temporal.clock;
  state.milesRemaining = Math.max(0, Number((state.milesRemaining + (action.miles || 0)).toFixed(1)));

  const addedItems = addInventory(state, action.addItems || []);
  removeInventory(state, action.removeItems || []);

  if (action.clue && !state.clues.includes(action.clue)) state.clues.push(action.clue);
  (action.setFlags || []).forEach(flag => { state.flags[flag] = true; });
  if (action.once && !state.completedActions.includes(action.id)) state.completedActions.push(action.id);
  if (action.next) {
    state.location = action.next;
    if (!state.visited.includes(action.next)) state.visited.push(action.next);
  }

  state.score = Math.min(999, state.score + (action.score || 0));
  state.updatedAt = Date.now();

  const deltas = {};
  Object.keys(state.stats).forEach(stat => {
    const delta = state.stats[stat] - originalStats[stat];
    if (delta) deltas[stat] = delta;
  });

  const event = {
    type: action.special || 'action',
    actionId: action.id,
    label: action.label,
    text: action.outcome || 'You act.',
    deltas,
    addedItems,
    removedItems: action.removeItems || [],
    clue: action.clue || '',
    score: action.score || 0
  };
  state.history.push({ type: 'player', text: action.label });
  state.history.push({ type: 'narrator', text: event.text });

  const cause = determineDeath(state.stats);
  if (cause) {
    state.status = 'dead';
    state.cause = cause;
    event.type = 'death';
  }
  if (action.special === 'victory') {
    state.status = 'won';
    state.milesRemaining = 0;
    state.ending = state.flags['signal-fragment'] ? 'fragment' : state.flags['signal-heard'] ? 'truth' : 'home';
    event.type = 'victory';
  }

  return { state, event };
}

export function applyStaticEnding(currentState, endingId) {
  const ending = STATIC_ENDINGS[endingId];
  if (!ending) return { state: currentState, event: null };
  const state = structuredClone(currentState);
  Object.entries(ending.effects || {}).forEach(([stat, delta]) => {
    state.stats[stat] = clamp(state.stats[stat] + delta);
  });
  state.flags[ending.flag] = true;
  state.flags['static-completed'] = true;
  if (ending.item) addInventory(state, [ending.item]);
  state.score = Math.min(999, state.score + ending.score);
  state.history.push({ type: 'system', text: ending.description });
  state.updatedAt = Date.now();
  return {
    state,
    event: {
      type: 'static-ending',
      text: ending.description,
      score: ending.score,
      addedItems: ending.item ? [ending.item] : [],
      deltas: ending.effects || {}
    }
  };
}

export function applyFreeformFlavor(currentState, command, narration) {
  const state = structuredClone(currentState);
  state.freeformUsed += 1;
  state.totalMinutes += 4;
  const temporal = minutesToClock(state.totalMinutes);
  state.day = temporal.day;
  state.clock = temporal.clock;
  state.history.push({ type: 'player', text: command });
  state.history.push({ type: 'narrator', text: narration });
  state.updatedAt = Date.now();
  return state;
}

export function getCriticalStat(state) {
  return Object.entries(state.stats).sort((a, b) => a[1] - b[1])[0];
}

export function getScene(state) {
  return SCENES[state.location] || SCENES.bedroom;
}

export function serializeSnapshot(state) {
  return {
    playerName: state.player.name,
    background: state.player.background,
    location: state.location,
    day: state.day,
    clock: state.clock,
    milesRemaining: state.milesRemaining,
    stats: state.stats,
    inventory: state.inventory,
    flags: Object.keys(state.flags).filter(key => state.flags[key]),
    recentHistory: state.history.slice(-6).map(entry => ({ type: entry.type, text: entry.text.slice(0, 240) }))
  };
}

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearState() {
  localStorage.removeItem(SAVE_KEY);
}
