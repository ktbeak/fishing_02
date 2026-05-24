(() => {
// ==========================================================================
// GAME STATE & CONSTANTS DEFINITION
// ==========================================================================
const questions = window.questions;

const state = {
  // Screen views
  currentScreen: 'lobby-screen',
  
  // Game metrics
  score: 0,
  caughtCount: 0,
  targetCount: 10,
  timeLimit: 120, // 2 minutes in seconds
  timeLeft: 120,
  totalAttempts: 0,
  correctAnswers: 0,
  
  // Quiz Pool Management
  shuffledQuestions: [],
  currentQuestionIndex: 0,
  activeQuestion: null,
  
  // Loops & Intervals
  gameInterval: null,
  animationFrameId: null,
  isPaused: false,
  
  // Audio Synthesis context
  audioCtx: null,
  hornTimeCounter: 0, // Periodical ship horn counter
  
  // Arcade Physics Entities
  canvas: null,
  ctx: null,
  
  boat: {
    x: 360,
    y: 20,
    width: 90,
    height: 48,
    speed: 6.5
  },
  
  hook: {
    x: 405, // Follows boat center
    y: 68,
    length: 0,
    maxLength: 375,
    speedDown: 7.5,
    speedUp: 10,
    state: 'IDLE', // IDLE, DESCENDING, RETRACTING, HOOKED
    size: 10 // Collision radius
  },
  
  hookedFish: null, // Holds reference to currently hooked fish pulling up
  fishList: [],
  maxFishCount: 6,
  
  keys: {
    left: false,
    right: false
  },
  
  caughtFishList: []
};

// Expanded Fish Colors Palettes (Neon Glows - 10 Diverse Colors)
const NEON_COLORS = [
  { outline: '#00f2fe', fill: 'rgba(0, 242, 254, 0.15)', shadow: 'rgba(0, 242, 254, 0.6)' }, // Neon Cyan
  { outline: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', shadow: 'rgba(16, 185, 129, 0.6)' }, // Neon Emerald
  { outline: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', shadow: 'rgba(245, 158, 11, 0.6)' }, // Neon Gold
  { outline: '#f43f5e', fill: 'rgba(244, 63, 94, 0.15)', shadow: 'rgba(244, 63, 94, 0.6)' }, // Neon Rose
  { outline: '#a855f7', fill: 'rgba(168, 85, 247, 0.15)', shadow: 'rgba(168, 85, 247, 0.6)' }, // Neon Purple
  { outline: '#ff007f', fill: 'rgba(255, 0, 127, 0.15)', shadow: 'rgba(255, 0, 127, 0.6)' },  // Neon Hot Pink
  { outline: '#ff5722', fill: 'rgba(255, 87, 34, 0.15)', shadow: 'rgba(255, 87, 34, 0.6)' },   // Neon Orange
  { outline: '#eaff00', fill: 'rgba(234, 255, 0, 0.15)', shadow: 'rgba(234, 255, 0, 0.6)' },   // Neon Lime/Yellow
  { outline: '#00ffcc', fill: 'rgba(0, 255, 204, 0.15)', shadow: 'rgba(0, 255, 204, 0.6)' },   // Neon Aqua
  { outline: '#bf55ec', fill: 'rgba(191, 85, 236, 0.15)', shadow: 'rgba(191, 85, 236, 0.6)' }   // Neon Violet
];

// ==========================================================================
// DOM ELEMENTS REFERENCE
// ==========================================================================
const DOM = {
  // Screens
  screens: {
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen'),
    success: document.getElementById('success-screen'),
    failed: document.getElementById('failed-screen')
  },
  
  // Lobby Elements
  btnStart: document.getElementById('btn-start'),
  btnShowRankings: document.getElementById('btn-show-rankings'),
  
  // Game Play Elements
  timerBar: document.getElementById('timer-bar'),
  timerText: document.getElementById('timer-text'),
  scoreText: document.getElementById('score-text'),
  caughtCount: document.getElementById('caught-count'),
  
  fishingStatus: document.getElementById('fishing-status'),
  oceanArea: document.getElementById('ocean-area'),
  hitAlert: document.getElementById('hit-alert'),
  
  fishTankCount: document.getElementById('fish-tank-count'),
  fishTankList: document.getElementById('fish-tank-list'),
  
  // Virtual Joystick Pad
  ctrlLeft: document.getElementById('ctrl-left'),
  ctrlDown: document.getElementById('ctrl-down'),
  ctrlRight: document.getElementById('ctrl-right'),
  
  // Quiz Modal Elements
  quizModal: document.getElementById('quiz-modal'),
  quizFishName: document.getElementById('quiz-fish-name'),
  quizQuestionText: document.getElementById('quiz-question-text'),
  quizOptionsContainer: document.getElementById('quiz-options-container'),
  quizFeedback: document.getElementById('quiz-feedback'),
  quizExplanation: document.getElementById('quiz-explanation'),
  btnNextFish: document.getElementById('btn-next-fish'),
  
  // Success Screen Elements
  finalTime: document.getElementById('final-time'),
  finalAccuracy: document.getElementById('final-accuracy'),
  finalScore: document.getElementById('final-score'),
  playerNameInput: document.getElementById('player-name'),
  btnSubmitScore: document.getElementById('btn-submit-score'),
  leaderboardSubmitForm: document.getElementById('leaderboard-submit-form'),
  
  // Failed Screen Elements
  failedCaughtCount: document.getElementById('failed-caught-count'),
  failedProgress: document.getElementById('failed-progress'),
  
  // Shared actions
  btnsRetry: document.querySelectorAll('.btn-retry'),
  btnsGoLobby: document.querySelectorAll('.btn-go-lobby'),
  
  // Ranking Dashboard Elements
  rankingModal: document.getElementById('ranking-modal'),
  btnCloseRankings: document.getElementById('btn-close-rankings'),
  btnCloseRankingsBottom: document.getElementById('btn-close-rankings-bottom'),
  btnResetRankings: document.getElementById('btn-reset-rankings'),
  rankingTableBody: document.getElementById('ranking-table-body')
};

// ==========================================================================
// PROGRAMMATICAL WEB AUDIO SYNTHESIS ENGINE
// ==========================================================================
function getAudioContext() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

// Detuned Low Brassy Ship Horn (깊고 웅장한 뱃고동 소리)
function playShipHorn() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  
  // 3 detuned oscillators to make it sound massive and organic
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  
  const gainNode = ctx.createGain();
  
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(68.0, now); // Principal bass tone
  
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(70.5, now); // Detuned slightly for pitch beating
  
  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(137.5, now); // Harmonic overtone
  
  // Volume Envelope (fade in, hold, fade out)
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.35, now + 0.35); // Slow majestic fade in
  gainNode.gain.setValueAtTime(0.35, now + 1.25);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.9); // Gentle echo fade out
  
  // Lowpass filter to mimic sound propagation through dense air and water
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, now);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  osc3.connect(gainNode);
  
  gainNode.connect(filter);
  filter.connect(ctx.destination);
  
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  
  osc1.stop(now + 2.0);
  osc2.stop(now + 2.0);
  osc3.stop(now + 2.0);
}

// Bright sparkling chime chord (맑고 경쾌한 정답 차임)
function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.16); // Sliding sweep arpeggio to A5
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now); // E5
  osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.16); // Sweep to C6
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc1.start(now);
  osc2.start(now);
  
  osc1.stop(now + 0.6);
  osc2.stop(now + 0.6);
}

// Low descending buzzing failure wave (무겁게 미끄러져 떨어지는 오답 버저)
function playWrongSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.24, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200.0, now); // G3
  osc.frequency.linearRampToValueAtTime(85.0, now + 0.45); // Heavy descending pitch slide to F2
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.7);
}

// ==========================================================================
// BACKGROUND CANVAS BUBBLE GENERATOR (LOBBY ONLY)
// ==========================================================================
let bubbleCanvasAnimationId = null;
function initBubbleCanvas() {
  const canvas = document.getElementById('bubble-canvas');
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
  
  const bubbles = [];
  
  class Bubble {
    constructor() {
      this.reset();
      this.y = Math.random() * height;
    }
    
    reset() {
      this.x = Math.random() * width;
      this.y = height + 20;
      this.radius = Math.random() * 4 + 1;
      this.speed = Math.random() * 1.5 + 0.5;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.wobble = Math.random() * 2;
      this.wobbleSpeed = Math.random() * 0.02 + 0.005;
    }
    
    update() {
      this.y -= this.speed;
      this.x += Math.sin(this.wobble) * 0.5;
      this.wobble += this.wobbleSpeed;
      if (this.y < -20) this.reset();
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 242, 254, ${this.opacity})`;
      ctx.fill();
    }
  }
  
  for (let i = 0; i < 35; i++) {
    bubbles.push(new Bubble());
  }
  
  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(2, 12, 27, 0.25)');
    gradient.addColorStop(1, 'rgba(2, 12, 27, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    bubbles.forEach(bubble => {
      bubble.update();
      bubble.draw();
    });
    
    bubbleCanvasAnimationId = requestAnimationFrame(animate);
  }
  
  if (bubbleCanvasAnimationId) cancelAnimationFrame(bubbleCanvasAnimationId);
  animate();
}

// ==========================================================================
// SCENE & NAVIGATION ROUTER
// ==========================================================================
function showScreen(screenId) {
  Object.keys(DOM.screens).forEach(key => {
    DOM.screens[key].classList.remove('active');
  });
  
  const target = document.getElementById(screenId);
  target.classList.add('active');
  state.currentScreen = screenId;
  
  if (screenId === 'lobby-screen') {
    initBubbleCanvas();
  } else {
    if (bubbleCanvasAnimationId) cancelAnimationFrame(bubbleCanvasAnimationId);
  }
}

// ==========================================================================
// LEADERBOARD FUNCTIONALITY
// ==========================================================================
function getRankings() {
  const data = localStorage.getItem('music_quiz_fishing_rankings');
  return data ? JSON.parse(data) : [];
}

function saveRanking(name, score, timeLeft, accuracy) {
  const rankings = getRankings();
  const newRecord = {
    name: name || '무명 어부',
    score: score,
    timeLeft: timeLeft,
    accuracy: accuracy,
    date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  };
  
  rankings.push(newRecord);
  rankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timeLeft - a.timeLeft;
  });
  
  localStorage.setItem('music_quiz_fishing_rankings', JSON.stringify(rankings.slice(0, 10)));
}

function renderRankings() {
  const rankings = getRankings();
  DOM.rankingTableBody.innerHTML = '';
  
  if (rankings.length === 0) {
    DOM.rankingTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-records">아직 등록된 기록이 없습니다. 첫 기록의 주인공이 되어보세요!</td>
      </tr>
    `;
    return;
  }
  
  rankings.forEach((record, index) => {
    const medalIcons = ['🥇', '🥈', '🥉'];
    const rankDisplay = index < 3 ? `${medalIcons[index]} ${index + 1}` : index + 1;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="number">${rankDisplay}</td>
      <td style="font-weight: 700;">${escapeHTML(record.name)}</td>
      <td class="number neon-text-blue" style="font-weight: 900;">${record.score.toLocaleString()}</td>
      <td class="number">${record.timeLeft.toFixed(1)}초</td>
      <td class="number">${record.accuracy}%</td>
      <td style="color: var(--text-muted); font-size: 0.8rem;">${record.date}</td>
    `;
    DOM.rankingTableBody.appendChild(tr);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// ARCADE GAME PHYSICS LOOP & GRAPHICS ENGINE
// ==========================================================================
function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function initArcadeEngine() {
  state.canvas = document.getElementById('game-canvas');
  state.ctx = state.canvas.getContext('2d');
  
  state.canvas.width = 800;
  state.canvas.height = 480;
  
  state.boat.x = 360;
  state.boat.y = 22;
  
  state.hook.state = 'IDLE';
  state.hook.y = state.boat.y + state.boat.height - 5;
  state.hook.x = state.boat.x + state.boat.width / 2;
  state.hook.length = 0;
  state.hookedFish = null;
  
  state.shuffledQuestions = shuffleArray(questions);
  state.currentQuestionIndex = 0;
  
  // Spawn initial fishes
  state.fishList = [];
  for (let i = 0; i < state.maxFishCount; i++) {
    state.fishList.push(spawnFish(i));
  }
  
  state.isPaused = false;
  
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  state.animationFrameId = requestAnimationFrame(arcadeGameLoop);
}

function spawnFish(index, alignRight = null) {
  const minDepth = 140;
  const maxDepth = 420;
  const depthInterval = (maxDepth - minDepth) / state.maxFishCount;
  const depth = minDepth + (index * depthInterval) + Math.random() * 10;
  
  const swimRight = alignRight !== null ? alignRight : Math.random() > 0.5;
  const speed = (0.7 + Math.random() * 1.5) * (swimRight ? 1 : -1);
  const x = swimRight ? -60 : 860;
  
  if (state.currentQuestionIndex >= state.shuffledQuestions.length) {
    state.shuffledQuestions = shuffleArray(questions);
    state.currentQuestionIndex = 0;
  }
  const q = state.shuffledQuestions[state.currentQuestionIndex];
  state.currentQuestionIndex++;
  
  const color = NEON_COLORS[index % NEON_COLORS.length];
  
  return {
    id: q.id,
    x: x,
    y: depth,
    // MODIFIED: Slightly smaller fish size (48 x 26) as requested
    width: 48,
    height: 26,
    dx: speed,
    fishType: q.fishType,
    color: color,
    questionData: q,
    wiggleOffset: Math.random() * 100
  };
}

function arcadeGameLoop() {
  if (state.currentScreen !== 'game-screen') return;
  
  if (!state.isPaused) {
    updateArcadePhysics();
  }
  
  drawArcadeGraphics();
  
  state.animationFrameId = requestAnimationFrame(arcadeGameLoop);
}

// 60FPS Game Physics update
function updateArcadePhysics() {
  // 1. Move boat
  if (state.keys.left) {
    state.boat.x = Math.max(0, state.boat.x - state.boat.speed);
  }
  if (state.keys.right) {
    state.boat.x = Math.min(state.canvas.width - state.boat.width, state.boat.x + state.boat.speed);
  }
  
  // 2. Update Hook dynamics
  const hookOriginX = state.boat.x + state.boat.width / 2;
  const hookOriginY = state.boat.y + state.boat.height - 5;
  
  switch (state.hook.state) {
    case 'IDLE':
      state.hook.x = hookOriginX;
      state.hook.y = hookOriginY;
      state.hook.length = 0;
      DOM.fishingStatus.textContent = '조종 중';
      DOM.fishingStatus.className = 'status-badge';
      break;
      
    case 'DESCENDING':
      state.hook.length += state.hook.speedDown;
      state.hook.y = hookOriginY + state.hook.length;
      DOM.fishingStatus.textContent = '하강 중';
      DOM.fishingStatus.className = 'status-badge active-fishing';
      
      if (state.hook.y >= state.hook.maxLength) {
        state.hook.state = 'RETRACTING';
      }
      break;
      
    case 'RETRACTING':
      state.hook.length = Math.max(0, state.hook.length - state.hook.speedUp);
      state.hook.y = hookOriginY + state.hook.length;
      DOM.fishingStatus.textContent = '회수 중';
      DOM.fishingStatus.className = 'status-badge active-fishing';
      
      if (state.hook.length <= 0) {
        state.hook.state = 'IDLE';
      }
      break;

    // MODIFIED: Pulling caught fish up to the boat before triggering the quiz!
    case 'HOOKED':
      state.hook.length = Math.max(0, state.hook.length - state.hook.speedUp);
      state.hook.y = hookOriginY + state.hook.length;
      DOM.fishingStatus.textContent = '인양 중!';
      DOM.fishingStatus.className = 'status-badge active-hit';
      
      // Update attached fish coordinates to hang from hook
      if (state.hookedFish) {
        state.hookedFish.x = state.hook.x - state.hookedFish.width / 2;
        state.hookedFish.y = state.hook.y + 4; // hangs below the hook
      }
      
      // Once it arrives back at the boat, trigger the quiz!
      if (state.hook.length <= 0) {
        state.hook.state = 'IDLE';
        triggerQuizPopup();
      }
      break;
  }
  
  // 3. Move swimming fish
  state.fishList.forEach((fish, idx) => {
    fish.x += fish.dx;
    fish.wiggleOffset += 0.16;
    
    if (fish.dx > 0 && fish.x > state.canvas.width + 100) {
      state.fishList[idx] = spawnFish(idx, true);
    } else if (fish.dx < 0 && fish.x < -100) {
      state.fishList[idx] = spawnFish(idx, false);
    }
  });
  
  // 4. Hook Bounding Box Collision Check
  if (state.hook.state === 'DESCENDING') {
    for (let i = 0; i < state.fishList.length; i++) {
      const fish = state.fishList[i];
      const isCollided = (
        state.hook.x >= fish.x - 5 &&
        state.hook.x <= fish.x + fish.width + 5 &&
        state.hook.y >= fish.y - 5 &&
        state.hook.y <= fish.y + fish.height + 5
      );
      
      if (isCollided) {
        triggerArcadeHooked(fish, i);
        break;
      }
    }
  }
}

// Draw game elements on canvas
function drawArcadeGraphics() {
  const ctx = state.ctx;
  const width = state.canvas.width;
  const height = state.canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  // 1. Draw sky & sea gradient
  const skyHeight = 60;
  
  // Sky Sunset
  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyHeight);
  skyGrad.addColorStop(0, '#0f172a');
  skyGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, skyHeight);
  
  // Sea Deep Blue
  const seaGrad = ctx.createLinearGradient(0, skyHeight, 0, height);
  seaGrad.addColorStop(0, '#1e3a8a');
  seaGrad.addColorStop(0.2, '#0f172a');
  seaGrad.addColorStop(1, '#020617');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, skyHeight, width, height - skyHeight);
  
  // 2. Draw Moving Sea waves line at surface
  ctx.beginPath();
  ctx.moveTo(0, skyHeight);
  const waveAmp = 3;
  const waveFreq = 0.015;
  const waveTime = Date.now() * 0.003;
  for (let x = 0; x <= width; x += 10) {
    const y = skyHeight + Math.sin(x * waveFreq + waveTime) * waveAmp;
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0; // reset
  
  // 3. Draw bubbles drifting up in sea background
  ctx.fillStyle = 'rgba(0, 242, 254, 0.06)';
  const bubbleTime = Date.now() * 0.001;
  for (let i = 1; i <= 8; i++) {
    const bx = (i * 100 + Math.sin(bubbleTime + i) * 20) % width;
    const by = (skyHeight + 50 + (i * 50 - bubbleTime * 30) % (height - skyHeight - 80));
    ctx.beginPath();
    ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 4. Draw Fishing Line
  if (state.hook.state !== 'IDLE') {
    ctx.beginPath();
    ctx.moveTo(state.boat.x + state.boat.width / 2, state.boat.y + state.boat.height - 5);
    ctx.lineTo(state.hook.x, state.hook.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // 5. Draw the Boat
  drawBoat(ctx, state.boat.x, state.boat.y);
  
  // 6. Draw Hook
  if (state.hook.state !== 'IDLE') {
    drawHook(ctx, state.hook.x, state.hook.y);
  }
  
  // 7. Draw Hooked Fish if pulling up
  if (state.hook.state === 'HOOKED' && state.hookedFish) {
    drawFish(ctx, state.hookedFish, true); // draw fish hanging
  }
  
  // 8. Draw Swimming Fish
  state.fishList.forEach(fish => {
    drawFish(ctx, fish, false);
  });
}

function drawBoat(ctx, x, y) {
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(0, 242, 254, 0.3)';
  
  // Boat Cabin
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 25, y + 22);
  ctx.lineTo(x + 55, y + 22);
  ctx.lineTo(x + 50, y + 5);
  ctx.lineTo(x + 30, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Windshield
  ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
  ctx.beginPath();
  ctx.moveTo(x + 32, y + 17);
  ctx.lineTo(x + 48, y + 17);
  ctx.lineTo(x + 45, y + 8);
  ctx.lineTo(x + 34, y + 8);
  ctx.closePath();
  ctx.fill();
  
  // Boat Hull
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#4facfe';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 22);
  ctx.lineTo(x + 85, y + 22);
  ctx.lineTo(x + 72, y + 42);
  ctx.lineTo(x + 18, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 28);
  ctx.lineTo(x + 80, y + 28);
  ctx.stroke();
  
  // Flag pole
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 22);
  ctx.lineTo(x + 18, y + 0);
  ctx.stroke();
  
  // Flag
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 0);
  ctx.lineTo(x + 3, y + 6);
  ctx.lineTo(x + 18, y + 12);
  ctx.closePath();
  ctx.fill();
  
  ctx.shadowBlur = 0;
}

function drawHook(ctx, x, y) {
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI, false);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x - 8, y - 4);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 8, y - 4);
  ctx.stroke();
  
  ctx.shadowBlur = 0;
}

function drawFish(ctx, fish, isHanging = false) {
  const x = fish.x;
  const y = fish.y;
  const w = fish.width;
  const h = fish.height;
  const color = fish.color;
  const direction = fish.dx > 0 ? 1 : -1;
  const wiggle = isHanging ? Math.sin(Date.now() * 0.02) * 6 : Math.sin(fish.wiggleOffset) * 4;
  
  ctx.shadowColor = color.shadow;
  ctx.shadowBlur = 9;
  
  ctx.fillStyle = color.fill;
  ctx.strokeStyle = color.outline;
  ctx.lineWidth = 2;
  
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  
  // If hooked, rotate the fish 90 degrees to hang vertically!
  if (isHanging) {
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.scale(direction, 1);
  }
  
  // 1. Draw Tail Fin
  ctx.beginPath();
  ctx.moveTo(-w/2, 0);
  ctx.lineTo(-w/2 - 10, -h/2 + wiggle);
  ctx.lineTo(-w/2 - 5, 0);
  ctx.lineTo(-w/2 - 10, h/2 - wiggle);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 2. Draw Body
  ctx.beginPath();
  ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // 3. Draw Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(w/2 - 9, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(w/2 - 8.5, -3, 1.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // 4. Draw Label (Only if swimming in sea, or when hooked at top!)
  if (!isHanging) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
    ctx.font = 'bold 0.68rem "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fish.fishType, x + w/2, y + h + 10);
  }
}

// MODIFIED: Hook fish and pull it up to boat first
function triggerArcadeHooked(fish, fishIndex) {
  state.hookedFish = fish;
  state.hook.state = 'HOOKED';
  
  // Vibrate
  if (navigator.vibrate) {
    navigator.vibrate(80);
  }
  
  // Remove from fish list immediately so it doesn't render swimmingly
  state.fishList.splice(fishIndex, 1);
}

// MODIFIED: Triggered once fish arrives at boat, show HIT & Quiz!
function triggerQuizPopup() {
  state.isPaused = true;
  DOM.fishingStatus.textContent = 'HIT!';
  DOM.fishingStatus.className = 'status-badge active-hit';
  
  if (navigator.vibrate) {
    navigator.vibrate([150, 80, 150]);
  }
  
  // Flash overlay screen effect
  const flash = document.createElement('div');
  flash.className = 'ocean-flash';
  DOM.oceanArea.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
  
  // Set question
  state.activeQuestion = state.hookedFish.questionData;
  
  // Spawn replacement fish in background
  const index = Math.floor(Math.random() * state.maxFishCount);
  state.fishList.push(spawnFish(index));
  
  DOM.hitAlert.classList.remove('hidden');
  
  setTimeout(() => {
    DOM.hitAlert.classList.add('hidden');
    openQuiz();
  }, 1000);
}

function openQuiz() {
  DOM.quizFishName.textContent = `🐟 대물 낚시: ${state.activeQuestion.fishType}`;
  DOM.quizQuestionText.textContent = state.activeQuestion.question;
  
  DOM.quizOptionsContainer.innerHTML = '';
  state.activeQuestion.options.forEach((optionText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span style="font-family:'Outfit'; font-weight:700; color:var(--neon-cyan)">${idx + 1}.</span> ${optionText}`;
    btn.addEventListener('click', () => handleAnswerSelect(idx, btn));
    DOM.quizOptionsContainer.appendChild(btn);
  });
  
  DOM.quizFeedback.classList.add('hidden');
  DOM.quizFeedback.className = 'feedback-panel hidden';
  DOM.quizModal.classList.remove('hidden');
}

function handleAnswerSelect(selectedIdx, clickedBtn) {
  state.totalAttempts++;
  
  const optionButtons = DOM.quizOptionsContainer.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => btn.classList.add('disabled'));
  
  const correctIdx = state.activeQuestion.answer;
  const isCorrect = (selectedIdx === correctIdx);
  
  if (isCorrect) {
    state.correctAnswers++;
    state.caughtCount++;
    state.score += 500;
    
    // Play synthesized correct chime (Web Audio)
    playCorrectSound();
    
    clickedBtn.classList.add('correct');
    DOM.quizFeedback.className = 'feedback-panel correct-theme';
    
    addFishToTank(state.activeQuestion.fishType);
    
    if (state.caughtCount >= state.targetCount) {
      DOM.btnNextFish.innerHTML = `탈출하기! <i class="fa-solid fa-door-open"></i>`;
    } else {
      DOM.btnNextFish.innerHTML = `낚시 계속하기 <i class="fa-solid fa-arrow-right"></i>`;
    }
    
    DOM.quizFeedback.querySelector('.feedback-icon').className = 'fa-solid fa-circle-check feedback-icon';
    DOM.quizFeedback.querySelector('.feedback-msg').textContent = '정답입니다! 물고기를 수조에 넣었습니다!';
    
    DOM.scoreText.textContent = state.score.toLocaleString();
    DOM.caughtCount.textContent = `${state.caughtCount} / ${state.targetCount}`;
  } else {
    // Play synthesized wrong buzzer (Web Audio)
    playWrongSound();
    
    clickedBtn.classList.add('wrong');
    optionButtons[correctIdx].classList.add('correct');
    
    DOM.quizFeedback.className = 'feedback-panel wrong-theme';
    DOM.quizFeedback.querySelector('.feedback-icon').className = 'fa-solid fa-circle-xmark feedback-icon';
    DOM.quizFeedback.querySelector('.feedback-msg').textContent = '오답입니다... 물고기를 놓쳤습니다!';
    DOM.btnNextFish.innerHTML = `다시 낚싯줄 내리기 <i class="fa-solid fa-rotate-right"></i>`;
  }
  
  DOM.quizExplanation.textContent = state.activeQuestion.explanation;
  DOM.quizFeedback.classList.remove('hidden');
}

function addFishToTank(fishName) {
  if (state.caughtCount === 1) {
    DOM.fishTankList.innerHTML = '';
  }
  
  const timeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.caughtFishList.push({ name: fishName, time: timeStr });
  DOM.fishTankCount.textContent = `${state.caughtCount}마리`;
  
  const item = document.createElement('div');
  item.className = 'fish-item';
  item.innerHTML = `
    <div class="fish-info">
      <div class="fish-avatar"><i class="fa-solid fa-fish"></i></div>
      <div>
        <div class="fish-name">${fishName}</div>
        <div class="fish-time">잡은 시각 ${timeStr}</div>
      </div>
    </div>
    <div class="fish-tag">CATCH #${state.caughtCount}</div>
  `;
  
  DOM.fishTankList.insertBefore(item, DOM.fishTankList.firstChild);
}

function handleNextStepAfterQuiz() {
  DOM.quizModal.classList.add('hidden');
  
  // Clear hooked fish reference
  state.hookedFish = null;
  
  // Reset hook back to IDLE
  state.hook.state = 'IDLE';
  
  if (state.caughtCount >= state.targetCount) {
    handleGameSuccess();
  } else {
    state.isPaused = false;
  }
}

// Trigger hook drop (cast)
function triggerHookCasting() {
  if (state.hook.state !== 'IDLE' || state.isPaused) return;
  state.hook.state = 'DESCENDING';
}

// ==========================================================================
// GAME CORE CONTROLLERS (START / RESET / WIN / LOSE)
// ==========================================================================
function initGame() {
  // Reset loops
  clearInterval(state.gameInterval);
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  
  state.score = 0;
  state.caughtCount = 0;
  state.timeLeft = state.timeLimit;
  state.totalAttempts = 0;
  state.correctAnswers = 0;
  state.caughtFishList = [];
  state.keys.left = false;
  state.keys.right = false;
  
  // Audio state reset
  state.hornTimeCounter = 0;
  
  // Resume / Initialize Web Audio Context on user button click interaction!
  getAudioContext();
  
  // Play opening ship horn sound!
  playShipHorn();
  
  // Reset DOM
  DOM.scoreText.textContent = '0';
  DOM.caughtCount.textContent = `0 / ${state.targetCount}`;
  DOM.fishTankCount.textContent = '0마리';
  DOM.fishTankList.innerHTML = `
    <div class="empty-tank-msg">
      <i class="fa-solid fa-fish"></i>
      <p>아직 잡은 물고기가 없습니다.<br>헤엄치는 물고기를 갈고리로 맞춰 수조를 채우세요!</p>
    </div>
  `;
  
  DOM.leaderboardSubmitForm.classList.remove('hidden');
  DOM.playerNameInput.value = '';
  
  showScreen('game-screen');
  
  initArcadeEngine();
  
  startGameTimer();
}

function startGameTimer() {
  const startTime = Date.now();
  const maxTime = state.timeLimit * 1000;
  
  state.gameInterval = setInterval(() => {
    if (state.isPaused) return; // Freeze timer during the quiz
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, maxTime - elapsed);
    state.timeLeft = remaining / 1000;
    
    DOM.timerText.textContent = `${state.timeLeft.toFixed(1)}s`;
    
    const percentage = (state.timeLeft / state.timeLimit) * 100;
    DOM.timerBar.style.width = `${percentage}%`;
    
    if (state.timeLeft < 20) {
      DOM.timerBar.className = 'timer-progress danger';
    } else if (state.timeLeft < 60) {
      DOM.timerBar.className = 'timer-progress warning';
    } else {
      DOM.timerBar.className = 'timer-progress';
    }
    
    // Periodical ship horn counter - every 18 seconds (18000ms)
    state.hornTimeCounter += 100;
    if (state.hornTimeCounter >= 18000) {
      playShipHorn();
      state.hornTimeCounter = 0;
    }
    
    if (remaining <= 0) {
      handleGameOver();
    }
  }, 100);
}

function handleGameSuccess() {
  clearInterval(state.gameInterval);
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  
  const timeLeftBonus = Math.round(state.timeLeft * 100);
  const accuracy = Math.round((state.correctAnswers / state.totalAttempts) * 100) || 0;
  const accuracyBonus = Math.round(accuracy * 10);
  
  const totalScore = state.score + timeLeftBonus + accuracyBonus;
  state.score = totalScore;
  
  DOM.finalTime.textContent = `${state.timeLeft.toFixed(1)}초`;
  DOM.finalAccuracy.textContent = `${accuracy}%`;
  DOM.finalScore.textContent = totalScore.toLocaleString();
  
  showScreen('success-screen');
}

function handleGameOver() {
  clearInterval(state.gameInterval);
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  
  DOM.quizModal.classList.add('hidden');
  
  DOM.failedCaughtCount.textContent = `${state.caughtCount} / ${state.targetCount} 마리`;
  const percentage = (state.caughtCount / state.targetCount) * 100;
  DOM.failedProgress.style.width = `${percentage}%`;
  
  showScreen('failed-screen');
}

function handleSubmitLeaderboard() {
  const name = DOM.playerNameInput.value.trim();
  const accuracy = Math.round((state.correctAnswers / state.totalAttempts) * 100) || 0;
  
  saveRanking(name, state.score, state.timeLeft, accuracy);
  DOM.leaderboardSubmitForm.classList.add('hidden');
  
  openRankingDashboard();
}

function openRankingDashboard() {
  renderRankings();
  DOM.rankingModal.classList.remove('hidden');
}

function closeRankingDashboard() {
  DOM.rankingModal.classList.add('hidden');
}

// Reset Rankings
function handleResetRankings() {
  if (confirm('모든 랭킹 기록을 초기화하시겠습니까?')) {
    localStorage.removeItem('music_quiz_fishing_rankings');
    renderRankings();
  }
}

// ==========================================================================
// USER CONTROLS KEYBOARD & TOUCH MAPPINGS
// ==========================================================================
function setupControls() {
  // 1. Keyboard Controls
  window.addEventListener('keydown', (e) => {
    if (state.currentScreen !== 'game-screen' || state.isPaused) return;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        state.keys.left = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        state.keys.right = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
      case ' ': // Spacebar
        e.preventDefault();
        triggerHookCasting();
        break;
    }
  });
  
  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        state.keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        state.keys.right = false;
        break;
    }
  });
  
  // 2. Virtual Pad Screen controls
  const bindPress = (el, key) => {
    const press = (e) => {
      e.preventDefault();
      if (state.isPaused) return;
      state.keys[key] = true;
    };
    const release = (e) => {
      e.preventDefault();
      state.keys[key] = false;
    };
    
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
    
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
  };
  
  bindPress(DOM.ctrlLeft, 'left');
  bindPress(DOM.ctrlRight, 'right');
  
  DOM.ctrlDown.addEventListener('click', (e) => {
    e.preventDefault();
    triggerHookCasting();
  });
}

function setupEventListeners() {
  DOM.btnStart.addEventListener('click', initGame);
  DOM.btnShowRankings.addEventListener('click', openRankingDashboard);
  DOM.btnCloseRankings.addEventListener('click', closeRankingDashboard);
  DOM.btnCloseRankingsBottom.addEventListener('click', closeRankingDashboard);
  DOM.btnResetRankings.addEventListener('click', handleResetRankings);
  DOM.btnNextFish.addEventListener('click', handleNextStepAfterQuiz);
  DOM.btnSubmitScore.addEventListener('click', handleSubmitLeaderboard);
  
  DOM.btnsRetry.forEach(btn => {
    btn.addEventListener('click', initGame);
  });
  
  DOM.btnsGoLobby.forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen('lobby-screen');
    });
  });
  
  DOM.rankingModal.addEventListener('click', (e) => {
    if (e.target === DOM.rankingModal) closeRankingDashboard();
  });
  
  setupControls();
}

// ==========================================================================
// BULLETPROOF LAUNCH ON LOAD
// ==========================================================================
function startApp() {
  initBubbleCanvas();
  setupEventListeners();
  showScreen('lobby-screen');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

})();
