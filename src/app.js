import {
  createInitialState,
  applyAction,
  applyStaticEnding,
  applyFreeformFlavor,
  getAvailableActions,
  getCriticalStat,
  getScene,
  serializeSnapshot,
  saveState,
  loadState,
  clearState
} from './game-core.js';
import { BACKGROUNDS, PRELUDE_CHOICES, ITEM_ICONS, STATIC_ENDINGS } from './game-data.js';

let state = null;
let selectedPrelude = 'rise';
let typeTimer = null;
let settings = loadSettings();
let audioContext = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadSettings() {
  try {
    return {
      sound: true,
      haptics: true,
      reducedMotion: false,
      scanlines: true,
      largeText: false,
      ...JSON.parse(localStorage.getItem('dark_commute_settings') || '{}')
    };
  } catch {
    return { sound: true, haptics: true, reducedMotion: false, scanlines: true, largeText: false };
  }
}

function saveSettings() {
  localStorage.setItem('dark_commute_settings', JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  document.documentElement.classList.toggle('no-scanlines', !settings.scanlines);
  document.documentElement.classList.toggle('large-text', settings.largeText);
}

function vibrate(pattern = 12) {
  if (settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
}

function tone(frequency = 440, duration = 0.05, volume = 0.04, type = 'square') {
  if (!settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is enhancement only.
  }
}

function sfx(kind) {
  if (kind === 'select') tone(520, 0.05, 0.035);
  if (kind === 'good') {
    tone(660, 0.08, 0.04);
    setTimeout(() => tone(880, 0.12, 0.035), 70);
  }
  if (kind === 'bad') tone(140, 0.18, 0.05, 'sawtooth');
  if (kind === 'signal') {
    tone(347, 0.12, 0.04, 'sine');
    setTimeout(() => tone(694, 0.16, 0.035, 'sine'), 140);
  }
}

function showOnly(screenId) {
  $$('.screen').forEach(screen => screen.classList.toggle('is-active', screen.id === screenId));
  window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' });
}

function initializeStartScreen() {
  const saved = loadState();
  $('#continueBtn').hidden = !saved;
  $('#continueMeta').textContent = saved
    ? `DAY ${saved.day} · ${saved.milesRemaining.toFixed(1)} MILES LEFT · ${saved.player.name}`
    : '';
  showOnly('startScreen');
}

function playIntro() {
  showOnly('introScreen');
  const panels = $$('#introScreen .intro-panel');
  let index = 0;
  panels.forEach((panel, panelIndex) => panel.classList.toggle('is-visible', panelIndex === 0));
  const advance = () => {
    panels[index]?.classList.remove('is-visible');
    index += 1;
    if (index >= panels.length) {
      clearInterval(typeTimer);
      showPrelude();
      return;
    }
    panels[index].classList.add('is-visible');
    if (index === 1) sfx('signal');
    if (index === panels.length - 1) sfx('good');
  };
  typeTimer = setInterval(advance, settings.reducedMotion ? 650 : 1600);
}

function showPrelude() {
  clearInterval(typeTimer);
  showOnly('preludeScreen');
  $('#preludeResult').hidden = true;
  $('#preludeContinue').hidden = true;
  $$('#preludeChoices button').forEach(button => button.classList.remove('is-selected'));
}

function selectPrelude(id, button) {
  selectedPrelude = id;
  const choice = PRELUDE_CHOICES[id];
  $$('#preludeChoices button').forEach(item => item.classList.remove('is-selected'));
  button.classList.add('is-selected');
  $('#preludeResult').hidden = false;
  $('#preludeResult').textContent = choice.text;
  $('#preludeContinue').hidden = false;
  sfx(id === 'phone' ? 'signal' : 'select');
  vibrate(10);
}

function renderBackgrounds() {
  const container = $('#backgroundChoices');
  container.innerHTML = '';
  Object.values(BACKGROUNDS).forEach((background, index) => {
    const label = document.createElement('label');
    label.className = 'background-card';
    label.innerHTML = `
      <input type="radio" name="background" value="${background.id}" ${index === 0 ? 'checked' : ''}>
      <span class="background-mark">${background.accent}</span>
      <strong>${background.name}</strong>
      <small>${background.subtitle}</small>
      <p>${background.description}</p>
    `;
    container.appendChild(label);
  });
}

function beginGame(event) {
  event.preventDefault();
  const name = $('#playerName').value.trim();
  const background = $('input[name="background"]:checked')?.value || 'prepared';
  if (!name) {
    $('#setupError').textContent = 'ENTER A NAME TO CONTINUE.';
    return;
  }
  state = createInitialState({ prelude: selectedPrelude, name, background });
  saveState(state);
  sfx('good');
  renderGame({ text: state.history[0].text, type: 'system' });
}

function statClass(value) {
  if (value <= 25) return 'is-critical';
  if (value <= 50) return 'is-warning';
  return 'is-stable';
}

function renderTopBar() {
  const [criticalName, criticalValue] = getCriticalStat(state);
  $('#topDay').textContent = `DAY ${state.day}`;
  $('#topTime').textContent = state.clock;
  $('#topMiles').textContent = `${state.milesRemaining.toFixed(1)} MI`;
  $('#topCritical').textContent = `${criticalName.toUpperCase()} ${criticalValue}`;
  $('#topCritical').className = `top-critical ${statClass(criticalValue)}`;
  $('#scoreValue').textContent = state.score;
}

function renderScene() {
  const scene = getScene(state);
  $('#sceneArt').textContent = scene.art;
  $('#sceneTitle').textContent = scene.title;
  $('#sceneKicker').textContent = scene.kicker;
  $('#sceneCaption').textContent = scene.caption;
  $('#sceneDescription').textContent = scene.description;
  $('#objectiveText').textContent = scene.objective;
  $('#locationPill').textContent = scene.title;
  document.body.dataset.location = state.location;
  $('#signalIndicator').hidden = !state.flags['signal-tuned'];
  if (!$('#signalIndicator').hidden) {
    $('#signalIndicator').textContent = state.flags['signal-route-visible'] ? 'SIGNAL ROUTE VISIBLE' : 'SIGNAL DETECTED';
  }
}

function renderStats(event = null) {
  const container = $('#statsStrip');
  container.innerHTML = '';
  Object.entries(state.stats).forEach(([name, value]) => {
    const delta = event?.deltas?.[name];
    const item = document.createElement('div');
    item.className = `stat-chip ${statClass(value)}`;
    item.innerHTML = `
      <div class="stat-chip-head"><span>${name.toUpperCase()}</span><strong>${value}</strong></div>
      <div class="stat-track"><span style="width:${value}%"></span></div>
      ${delta ? `<em class="stat-delta ${delta > 0 ? 'is-positive' : 'is-negative'}">${delta > 0 ? '+' : ''}${delta}</em>` : ''}
    `;
    container.appendChild(item);
  });
}

function renderActions() {
  const actions = getAvailableActions(state);
  const container = $('#actionGrid');
  container.innerHTML = '';
  actions.forEach((action, index) => {
    const button = document.createElement('button');
    button.className = `action-card ${action.risk === 'HIGH' ? 'is-high-risk' : ''} ${action.risk === 'UNKNOWN' ? 'is-signal' : ''}`;
    button.dataset.action = action.id;
    button.innerHTML = `
      <span class="action-number">0${index + 1}</span>
      <span class="action-copy">
        <strong>${action.label}</strong>
        <small>${action.hint || [action.risk, action.time ? `${action.time} MIN` : ''].filter(Boolean).join(' · ') || 'AVAILABLE ACTION'}</small>
      </span>
      <span class="action-arrow">›</span>
    `;
    button.addEventListener('click', () => handleAction(action.id));
    container.appendChild(button);
  });
}

function typeNarration(text, element) {
  if (settings.reducedMotion) {
    element.textContent = text;
    return;
  }
  element.textContent = '';
  const words = text.split(/\s+/);
  let index = 0;
  const timer = setInterval(() => {
    element.textContent += `${index ? ' ' : ''}${words[index]}`;
    index += 1;
    if (index >= words.length) clearInterval(timer);
  }, 22);
}

function renderEvent(event) {
  const panel = $('#eventPanel');
  const text = $('#eventText');
  panel.className = `event-panel is-visible event-${event.type || 'action'}`;
  typeNarration(event.text, text);
  const metadata = [];
  if (event.score) metadata.push(`+${event.score} SCORE`);
  if (event.addedItems?.length) metadata.push(`ACQUIRED: ${event.addedItems.join(', ')}`);
  if (event.removedItems?.length) metadata.push(`USED: ${event.removedItems.join(', ')}`);
  if (event.clue) metadata.push('SIGNAL CLUE RECORDED');
  $('#eventMeta').textContent = metadata.join(' · ');
}

function renderGame(event = null) {
  if (!state) return;
  showOnly('gameScreen');
  renderTopBar();
  renderScene();
  renderStats(event);
  renderActions();
  if (event) renderEvent(event);
  $('#freeformCount').textContent = `${state.freeformUsed}/5 USED THIS RUN`;
}

function handleAction(actionId) {
  sfx('select');
  vibrate(12);
  const result = applyAction(state, actionId);
  state = result.state;
  saveState(state);
  const event = result.event;

  if (event.type === 'static') {
    renderGame(event);
    setTimeout(() => launchStaticBreach(), settings.reducedMotion ? 100 : 700);
    return;
  }
  if (event.type === 'death' || event.type === 'victory') {
    renderGame(event);
    setTimeout(() => renderEnding(event.type), settings.reducedMotion ? 100 : 900);
    return;
  }

  if (Object.values(event.deltas || {}).some(value => value < -7)) {
    sfx('bad');
    vibrate([30, 30, 50]);
  } else if (event.score || event.addedItems?.length) {
    sfx('good');
  }
  if (event.clue) sfx('signal');
  renderGame(event);
}

function renderEnding(type) {
  showOnly('endScreen');
  const won = type === 'victory';
  $('#endEyebrow').textContent = won ? 'COMMUTE COMPLETE' : 'SESSION TERMINATED';
  $('#endTitle').textContent = won ? 'YOU MADE IT HOME' : 'YOU DID NOT MAKE IT';
  $('#endTitle').className = won ? 'end-title is-victory' : 'end-title is-death';
  const endingCopy = won
    ? state.ending === 'fragment'
      ? 'Your family is safe. In your pocket, the violet fragment pulses once toward the river. The blackout is not finished with you.'
      : state.ending === 'truth'
        ? 'Your family is safe. You know the signal began beneath the river, and that knowledge has made home feel less certain.'
        : 'Your family is safe. The city remains dark, but the worst commute of your life is over.'
    : `The city claimed you through ${state.cause}. Every decision brought you here.`;
  $('#endCopy').textContent = endingCopy;
  $('#endStats').innerHTML = `
    <div><span>DAYS</span><strong>${state.day}</strong></div>
    <div><span>SCORE</span><strong>${state.score}</strong></div>
    <div><span>DISTANCE LEFT</span><strong>${state.milesRemaining.toFixed(1)}</strong></div>
    <div><span>SIGNAL</span><strong>${state.flags['static-completed'] ? 'FOUND' : 'MISSED'}</strong></div>
  `;
}

function openDrawer(tab = 'inventory') {
  $('#drawer').classList.add('is-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  renderDrawer(tab);
}

function closeDrawer() {
  $('#drawer').classList.remove('is-open');
  $('#drawer').setAttribute('aria-hidden', 'true');
}

function renderDrawer(tab) {
  $$('.drawer-tab').forEach(button => button.classList.toggle('is-active', button.dataset.tab === tab));
  const body = $('#drawerBody');
  if (tab === 'inventory') {
    body.innerHTML = state.inventory.length
      ? `<div class="inventory-list">${state.inventory.map(item => `<div class="inventory-item"><span>${ITEM_ICONS[item] || '□'}</span><strong>${item}</strong></div>`).join('')}</div>`
      : '<p class="empty-state">Your inventory is empty.</p>';
  }
  if (tab === 'map') {
    const nodes = [
      ['bedroom', 'APARTMENT'], ['street', 'STREET'], ['store', 'RESOURCE'], ['shelter', 'SOCIAL'],
      ['bridge', 'DIRECT'], ['rail', 'RAIL'], ['tunnel', 'TUNNEL'], ['highway', 'HIGHWAY'], ['suburbs', 'HOME']
    ];
    body.innerHTML = `
      <div class="route-map">
        ${nodes.map(([id, label]) => `<div class="route-node ${state.location === id ? 'is-current' : ''} ${state.visited.includes(id) ? 'is-visited' : ''}"><span>${state.visited.includes(id) || state.location === id ? label : 'UNKNOWN'}</span></div>`).join('<i>↓</i>')}
      </div>
      <p class="drawer-note">${state.flags['signal-route-visible'] ? 'An impossible maintenance route flickers beneath the known map.' : 'Visited locations are revealed as you travel.'}</p>
    `;
  }
  if (tab === 'log') {
    body.innerHTML = `<div class="history-log">${state.history.slice().reverse().map(entry => `<div class="history-entry history-${entry.type}"><span>${entry.type.toUpperCase()}</span><p>${escapeHtml(entry.text)}</p></div>`).join('')}</div>`;
  }
  if (tab === 'settings') {
    body.innerHTML = `
      <div class="settings-list">
        ${settingToggle('sound', 'SOUND', 'Procedural interface and encounter audio')}
        ${settingToggle('haptics', 'HAPTICS', 'Vibration feedback on supported devices')}
        ${settingToggle('reducedMotion', 'REDUCED MOTION', 'Disable typewriter and major motion effects')}
        ${settingToggle('scanlines', 'CRT SCANLINES', 'Retro display texture')}
        ${settingToggle('largeText', 'LARGE TEXT', 'Increase narrative and control size')}
      </div>
      <button class="danger-button" id="resetRunButton">RESET CURRENT RUN</button>
    `;
    $$('.setting-toggle input').forEach(input => {
      input.addEventListener('change', () => {
        settings[input.dataset.setting] = input.checked;
        saveSettings();
      });
    });
    $('#resetRunButton').addEventListener('click', () => {
      if (confirm('Reset this commute and erase the current save?')) {
        clearState();
        state = null;
        closeDrawer();
        initializeStartScreen();
      }
    });
  }
}

function settingToggle(key, label, description) {
  return `
    <label class="setting-toggle">
      <span><strong>${label}</strong><small>${description}</small></span>
      <input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}>
    </label>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function submitFreeform(event) {
  event.preventDefault();
  const input = $('#freeformInput');
  const command = input.value.trim();
  if (!command || !state || state.status !== 'playing') return;
  if (state.freeformUsed >= 5) {
    renderEvent({ type: 'error', text: 'Freeform interpretation is limited to five uses per run. Standard actions remain available.' });
    return;
  }
  input.value = '';
  input.disabled = true;
  $('#freeformSubmit').disabled = true;
  renderEvent({ type: 'system', text: 'The terminal interprets your improvised action…' });

  let narration = '';
  try {
    const response = await fetch('/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, snapshot: serializeSnapshot(state) })
    });
    if (!response.ok) throw new Error('Narrative service unavailable');
    const data = await response.json();
    narration = String(data.narration || '').trim();
    if (!narration) throw new Error('Empty narrative');
  } catch {
    narration = `You try to ${command.toLowerCase()}, but the city gives no reliable answer. Nothing decisive changes.`;
  }
  state = applyFreeformFlavor(state, command, narration);
  saveState(state);
  input.disabled = false;
  $('#freeformSubmit').disabled = false;
  renderGame({ type: 'freeform', text: narration });
}

function launchStaticBreach() {
  const overlay = $('#staticOverlay');
  const canvas = $('#staticCanvas');
  const ctx = canvas.getContext('2d');
  const status = $('#staticStatus');
  const controls = $('#staticControls');
  const choices = $('#staticChoices');
  overlay.classList.add('is-active');
  overlay.setAttribute('aria-hidden', 'false');
  controls.hidden = false;
  choices.hidden = true;
  canvas.width = 640;
  canvas.height = 400;

  const stages = [
    { name: 'THE HALLWAY', enemies: [0, 2] },
    { name: 'THE PLATFORM', enemies: [1, 0, 2] },
    { name: 'THE CORE', enemies: [1, 2, 0] }
  ];
  let stageIndex = 0;
  let enemyIndex = 0;
  let lane = 1;
  let health = 100;
  let enemyHealth = 1;
  let enemyDepth = 0.1;
  let lastFrame = performance.now();
  let running = true;
  let shotFlash = 0;
  let hitFlash = 0;
  let stageDelay = 0;

  const currentStage = () => stages[stageIndex];
  const currentEnemyLane = () => currentStage()?.enemies[enemyIndex];

  function move(direction) {
    if (!running) return;
    lane = Math.max(0, Math.min(2, lane + direction));
    sfx('select');
    vibrate(8);
  }

  function fire() {
    if (!running || stageDelay > 0) return;
    shotFlash = 0.12;
    tone(90, 0.08, 0.08, 'sawtooth');
    vibrate(20);
    if (lane === currentEnemyLane()) {
      enemyHealth -= 1;
      sfx('good');
      if (enemyHealth <= 0) {
        enemyIndex += 1;
        enemyDepth = 0.1;
        stageDelay = 0.45;
        if (enemyIndex >= currentStage().enemies.length) {
          stageIndex += 1;
          enemyIndex = 0;
          stageDelay = 1.0;
          if (stageIndex >= stages.length) {
            finishStaticCombat();
            return;
          }
        }
      }
    } else {
      tone(180, 0.05, 0.03);
    }
  }

  function finishStaticCombat() {
    running = false;
    controls.hidden = true;
    choices.hidden = false;
    status.textContent = `SIGNAL CORE EXPOSED · HEALTH ${Math.max(0, Math.round(health))}`;
    sfx('signal');
    $('#staticChoiceGrid').innerHTML = Object.values(STATIC_ENDINGS).map(ending => `
      <button data-ending="${ending.id}">
        <strong>${ending.title}</strong>
        <small>${ending.description}</small>
      </button>
    `).join('');
    $$('#staticChoiceGrid button').forEach(button => {
      button.addEventListener('click', () => completeStatic(button.dataset.ending));
    });
  }

  function completeStatic(endingId) {
    const result = applyStaticEnding(state, endingId);
    state = result.state;
    saveState(state);
    overlay.classList.remove('is-active');
    overlay.setAttribute('aria-hidden', 'true');
    sfx('signal');
    renderGame(result.event);
  }

  function drawCorridor(now) {
    const width = canvas.width;
    const height = canvas.height;
    const horizon = 180;
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    const pulse = 0.5 + Math.sin(now / 330) * 0.12;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#160018');
    gradient.addColorStop(0.48, '#090b12');
    gradient.addColorStop(1, '#020203');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = `rgba(143, 64, 255, ${pulse})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      const inset = i * 34;
      ctx.strokeRect(inset, inset * 0.48, width - inset * 2, height - inset * 0.7);
    }
    ctx.strokeStyle = 'rgba(0,255,145,.22)';
    for (let x = 0; x <= width; x += width / 6) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizon);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = horizon; y < height; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const laneCenters = [width * 0.25, width * 0.5, width * 0.75];
    const playerX = laneCenters[lane];
    ctx.fillStyle = '#00ff91';
    ctx.fillRect(playerX - 28, height - 30, 56, 6);
    ctx.fillStyle = 'rgba(0,255,145,.12)';
    ctx.fillRect(playerX - 44, height - 42, 88, 18);

    if (running && currentStage()) {
      const enemyLane = currentEnemyLane();
      const scale = 0.35 + enemyDepth * 1.15;
      const enemyX = laneCenters[enemyLane];
      const enemyY = horizon + enemyDepth * 125;
      const size = 34 * scale;
      ctx.fillStyle = hitFlash > 0 ? '#ffffff' : stageIndex === 2 ? '#b13cff' : '#ff334f';
      ctx.beginPath();
      ctx.moveTo(enemyX, enemyY - size);
      ctx.lineTo(enemyX + size * 0.75, enemyY);
      ctx.lineTo(enemyX, enemyY + size);
      ctx.lineTo(enemyX - size * 0.75, enemyY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#050608';
      ctx.fillRect(enemyX - size * 0.25, enemyY - 3, size * 0.5, 6);
    }

    if (shotFlash > 0) {
      ctx.fillStyle = `rgba(255,240,170,${Math.min(1, shotFlash * 6)})`;
      ctx.beginPath();
      ctx.moveTo(playerX, height - 35);
      ctx.lineTo(width / 2 - 22, horizon + 20);
      ctx.lineTo(width / 2 + 22, horizon + 20);
      ctx.closePath();
      ctx.fill();
    }

    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255,0,50,${Math.min(.35, hitFlash)})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = '#ffb000';
    ctx.font = '22px VT323, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(currentStage()?.name || 'SIGNAL CORE', 18, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`HEALTH ${Math.max(0, Math.round(health))}`, width - 18, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d7d9e0';
    ctx.font = '18px Share Tech Mono, monospace';
    ctx.fillText('MATCH THE LANE · FIRE BEFORE CONTACT', width / 2, height - 58);

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  }

  function frame(now) {
    if (!overlay.classList.contains('is-active')) return;
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (running) {
      if (stageDelay > 0) {
        stageDelay -= delta;
      } else {
        enemyDepth += delta * (0.28 + stageIndex * 0.06);
        if (enemyDepth >= 1) {
          if (lane === currentEnemyLane()) {
            health -= 18;
            hitFlash = 0.3;
            sfx('bad');
            vibrate([40, 30, 60]);
          }
          enemyDepth = 0.12;
          if (health <= 0) {
            running = false;
            controls.hidden = true;
            choices.hidden = false;
            $('#staticChoiceGrid').innerHTML = `<button data-ending="wake"><strong>FORCE YOURSELF AWAKE</strong><small>The breach overwhelms you. Escape with what remains.</small></button>`;
            $('#staticChoiceGrid button').addEventListener('click', () => completeStatic('wake'));
          }
        }
      }
      shotFlash = Math.max(0, shotFlash - delta);
      hitFlash = Math.max(0, hitFlash - delta);
      status.textContent = `${currentStage()?.name || 'CORE'} · TARGET ${enemyIndex + 1}/${currentStage()?.enemies.length || 0}`;
    }
    drawCorridor(now);
    requestAnimationFrame(frame);
  }

  $('#staticLeft').onclick = () => move(-1);
  $('#staticRight').onclick = () => move(1);
  $('#staticFire').onclick = fire;
  document.onkeydown = event => {
    if (!overlay.classList.contains('is-active')) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') move(-1);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') move(1);
    if (event.code === 'Space' || event.key === 'Enter') {
      event.preventDefault();
      fire();
    }
  };
  requestAnimationFrame(frame);
}

function bindEvents() {
  $('#newGameBtn').addEventListener('click', () => {
    clearState();
    selectedPrelude = 'rise';
    playIntro();
  });
  $('#continueBtn').addEventListener('click', () => {
    state = loadState();
    if (state?.status === 'playing') renderGame({ type: 'system', text: 'Session restored. The city did not wait for you.' });
    else if (state) renderEnding(state.status === 'won' ? 'victory' : 'death');
  });
  $('#skipIntro').addEventListener('click', showPrelude);
  $$('#preludeChoices button').forEach(button => button.addEventListener('click', () => selectPrelude(button.dataset.prelude, button)));
  $('#preludeContinue').addEventListener('click', () => {
    showOnly('setupScreen');
    $('#playerName').focus();
  });
  $('#setupForm').addEventListener('submit', beginGame);
  $('#freeformForm').addEventListener('submit', submitFreeform);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBackdrop').addEventListener('click', closeDrawer);
  $$('.drawer-tab').forEach(button => button.addEventListener('click', () => renderDrawer(button.dataset.tab)));
  $$('[data-open-drawer]').forEach(button => button.addEventListener('click', () => openDrawer(button.dataset.openDrawer)));
  $('#playAgainBtn').addEventListener('click', () => {
    clearState();
    state = null;
    initializeStartScreen();
  });
  $('#endHomeBtn').addEventListener('click', initializeStartScreen);
  document.addEventListener('click', () => {
    if (audioContext?.state === 'suspended') audioContext.resume();
  }, { once: true });
}

applySettings();
renderBackgrounds();
bindEvents();
initializeStartScreen();
