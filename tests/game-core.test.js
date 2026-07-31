import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, applyAction, getAvailableActions, applyStaticEnding } from '../src/game-core.js';

test('prelude clue is captured deterministically', () => {
  const state = createInitialState({ prelude: 'phone', name: 'Joe', background: 'prepared' });
  assert.equal(state.player.name, 'JOE');
  assert.ok(state.clues.includes('clock-347'));
});

test('searching the kitchen adds map and knife once', () => {
  let state = createInitialState();
  state = applyAction(state, 'go_kitchen').state;
  const result = applyAction(state, 'search_drawer');
  assert.deepEqual(result.event.addedItems, ['Paper Map', 'Swiss Army Knife']);
  assert.ok(result.state.inventory.includes('Paper Map'));
  assert.ok(!getAvailableActions(result.state).some(action => action.id === 'search_drawer'));
});

test('signal path requires clues, radio, and tuned flag', () => {
  let state = createInitialState({ prelude: 'phone' });
  state = applyAction(state, 'go_kitchen').state;
  state = applyAction(state, 'use_microwave').state;
  state = applyAction(state, 'go_hallway').state;
  state = applyAction(state, 'help_chen').state;
  state = applyAction(state, 'accept_radio').state;
  assert.ok(getAvailableActions(state).some(action => action.id === 'tune_347'));
  state = applyAction(state, 'tune_347').state;
  assert.equal(state.flags['signal-tuned'], true);
});

test('static ending produces a persistent story flag and score', () => {
  const state = createInitialState();
  const result = applyStaticEnding(state, 'fragment');
  assert.equal(result.state.flags['signal-fragment'], true);
  assert.ok(result.state.inventory.includes('Signal Fragment'));
  assert.equal(result.state.score, 90);
});
