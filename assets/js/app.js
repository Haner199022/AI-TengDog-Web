// ===== AI TengDog Workshop — Student App v2 =====

const STORAGE_KEY = 'tengdog_v2';
const DAYS = [0, 1, 2, 3, 4];

let state = { currentDay: 1, days: {} };
let progress = {};
let currentQuizIndex = 0;
let glossaryData = [];

// ===== Achievement Definitions =====
const ACHIEVEMENTS = [
  { id: 'first_card', icon: '📖', name: '初次翻牌', desc: '翻开第一张知识卡片' },
  { id: 'all_d1_cards', icon: '🔩', name: '硬件达人', desc: 'Day1 全部卡片查看' },
  { id: 'first_game', icon: '🎮', name: '游戏玩家', desc: '完成第一个互动游戏' },
  { id: 'first_quiz', icon: '✅', name: '答题新手', desc: '完成第一道问答' },
  { id: 'perfect_day', icon: '🏆', name: '完美一天', desc: '某天全部问答答对' },
  { id: 'all_games', icon: '🕹️', name: '全能玩家', desc: '完成所有互动游戏' },
  { id: 'day4_done', icon: '🤖', name: '毕业典礼', desc: '完成全部4天学习' },
  { id: 'speed_run', icon: '⚡', name: '闪电侠', desc: '10分钟内完成一天问答' },
];

// ===== Sound Effects =====
function playSFX(type) {
  const el = document.getElementById(type === 'correct' ? 'sfxCorrect' : 'sfxWrong');
  if (el) { el.currentTime = 0; el.play().catch(() => {}); }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  loadProgress();
  applyTheme();
  checkOnboarding();
  await loadGlossary();
  await switchDay(progress.lastDay || 1);
  bindEvents();
  renderAchievements();
});

// ===== Theme =====
function applyTheme() {
  const theme = progress.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  progress.theme = progress.theme === 'dark' ? 'light' : 'dark';
  saveProgress();
  applyTheme();
}

// ===== Onboarding =====
function checkOnboarding() {
  if (progress.studentName) {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('studentInfo').textContent =
      `${progress.studentName} · ${progress.studentGroup || ''}`;
  } else {
    document.getElementById('onboarding').classList.remove('hidden');
  }
}

// ===== Events =====
function bindEvents() {
  const nameInput = document.getElementById('studentName');
  const startBtn = document.getElementById('startBtn');

  nameInput.addEventListener('input', () => { startBtn.disabled = !nameInput.value.trim(); });
  startBtn.addEventListener('click', () => {
    progress.studentName = nameInput.value.trim();
    progress.studentGroup = document.getElementById('studentGroup').value.trim();
    saveProgress();
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('studentInfo').textContent =
      `${progress.studentName} · ${progress.studentGroup}`;
  });

  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', () => switchDay(parseInt(tab.dataset.day)));
  });

  document.querySelectorAll('.step').forEach(step => {
    step.addEventListener('click', () => {
      if (!step.classList.contains('locked')) showStep(step.dataset.step);
    });
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('glossaryToggle').addEventListener('click', () => {
    document.getElementById('glossary').classList.toggle('hidden');
  });
  document.getElementById('glossaryClose').addEventListener('click', () => {
    document.getElementById('glossary').classList.add('hidden');
  });
  document.getElementById('glossarySearch').addEventListener('input', e => {
    renderGlossary(e.target.value);
  });

  document.getElementById('showAnswerBtn').addEventListener('click', showAnswer);
  document.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => rateAnswer(btn.dataset.rate));
  });
  document.getElementById('generateCodeBtn').addEventListener('click', generateProgressCode);
  document.getElementById('copyCodeBtn').addEventListener('click', copyCode);

  document.getElementById('gameModalClose').addEventListener('click', closeGameModal);
  document.getElementById('gameModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeGameModal();
  });
}

// ===== Data Loading =====
async function loadDayData(day) {
  if (state.days[day]) return state.days[day];
  try {
    const resp = await fetch(`assets/data/day${day}.json`);
    const data = await resp.json();
    state.days[day] = data;
    return data;
  } catch (e) {
    console.warn(`Day ${day} data not found`);
    return null;
  }
}

async function loadGlossary() {
  try {
    const resp = await fetch('assets/data/glossary.json');
    glossaryData = await resp.json();
    renderGlossary();
  } catch (e) { console.warn('Glossary load failed'); }
}

// ===== Day Switching =====
async function switchDay(day) {
  state.currentDay = day;
  progress.lastDay = day;
  saveProgress();

  const data = await loadDayData(day);
  if (!data) return;

  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.day-tab[data-day="${day}"]`);
  if (activeTab) activeTab.classList.add('active');

  renderObjectives(data);
  renderCards(data);
  renderGames(data);
  renderQuiz(data);
  renderChecklist(data);
  renderSummary(data);
  renderTroubleshoot(data);
  updateStepStates();
  updateAllProgress();
}

// ===== Objectives =====
function renderObjectives(data) {
  document.getElementById('dayTitle').textContent = `Day ${data.day}：${data.title}`;
  document.getElementById('dayLayer').textContent = data.layer;
  document.getElementById('objectiveList').innerHTML =
    data.objectives.map(o => `<li>${o}</li>`).join('');
}

// ===== Knowledge Cards =====
function renderCards(data) {
  const grid = document.getElementById('cardsGrid');
  if (!data.cards || data.cards.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">本日无知识卡片</p>';
    return;
  }
  const dp = getDayProgress(data.day);

  grid.innerHTML = data.cards.map(card => {
    const viewed = dp.viewedCards?.includes(card.id);
    return `
      <div class="flip-card ${viewed ? 'viewed flipped' : ''}" data-card-id="${card.id}" onclick="flipCard(this,'${card.id}')">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            ${viewed ? '<span class="card-viewed-badge">✓ 已看</span>' : ''}
            <h4>${card.front}</h4>
            <div class="sub">${card.frontSub || ''}</div>
          </div>
          <div class="flip-card-back">${card.back}</div>
        </div>
      </div>`;
  }).join('');
  updateCardProgress(data);
}

function flipCard(el, cardId) {
  el.classList.toggle('flipped');
  const dp = getDayProgress(state.currentDay);
  if (!dp.viewedCards) dp.viewedCards = [];
  if (!dp.viewedCards.includes(cardId)) {
    dp.viewedCards.push(cardId);
    el.classList.add('viewed');
    const front = el.querySelector('.flip-card-front');
    if (!front.querySelector('.card-viewed-badge'))
      front.insertAdjacentHTML('afterbegin', '<span class="card-viewed-badge">✓ 已看</span>');
    saveProgress();
    checkAchievement('first_card');
    const data = state.days[state.currentDay];
    if (data && dp.viewedCards.length >= data.cards.length && data.day === 1)
      checkAchievement('all_d1_cards');
    updateCardProgress(data);
    updateStepStates();
    updateAllProgress();
  }
}

function updateCardProgress(data) {
  if (!data || !data.cards) return;
  const dp = getDayProgress(data.day);
  const v = dp.viewedCards?.length || 0;
  const t = data.cards.length;
  document.getElementById('cardProgress').textContent = `(${v}/${t})`;
  document.getElementById('allCardsViewed').classList.toggle('hidden', v < t);
}

// ===== Interactive Games =====
function renderGames(data) {
  const grid = document.getElementById('gamesGrid');
  if (!data.games || data.games.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">本日无互动游戏</p>';
    document.getElementById('gameProgress').textContent = '';
    return;
  }
  const dp = getDayProgress(data.day);
  if (!dp.completedGames) dp.completedGames = [];

  grid.innerHTML = data.games.map(g => {
    const done = dp.completedGames.includes(g.id);
    return `
      <div class="game-card ${done ? 'completed-game' : ''}" onclick="openGame('${g.id}')" data-game-id="${g.id}">
        <span class="game-icon">${g.icon}</span>
        <h4>${g.title}</h4>
        <p>${g.desc}</p>
        ${done ? '<span class="badge badge-green game-badge">✓ 完成</span>' : ''}
      </div>`;
  }).join('');

  const done = dp.completedGames.length;
  const total = data.games.length;
  document.getElementById('gameProgress').textContent = `(${done}/${total})`;
  document.getElementById('allGamesCompleted').classList.toggle('hidden', done < total);
}

function openGame(gameId) {
  const data = state.days[state.currentDay];
  if (!data || !data.games) return;
  const game = data.games.find(g => g.id === gameId);
  if (!game) return;

  document.getElementById('gameModalTitle').textContent = game.title;
  document.getElementById('gameModal').classList.remove('hidden');

  // Delegate to games.js
  if (typeof initGame === 'function') initGame(game, state.currentDay);
}

function closeGameModal() {
  document.getElementById('gameModal').classList.add('hidden');
  document.getElementById('gameModalBody').innerHTML = '';
}

function completeGame(gameId) {
  const dp = getDayProgress(state.currentDay);
  if (!dp.completedGames) dp.completedGames = [];
  if (!dp.completedGames.includes(gameId)) {
    dp.completedGames.push(gameId);
    saveProgress();
    playSFX('correct');
    checkAchievement('first_game');

    // Check all games done
    const data = state.days[state.currentDay];
    if (data?.games && dp.completedGames.length >= data.games.length) {
      // Check cross-day total
      let allDone = true;
      for (const d of [1, 2, 3, 4]) {
        const dd = state.days[d];
        const ddp = getDayProgress(d);
        if (dd?.games && (!ddp.completedGames || ddp.completedGames.length < dd.games.length))
          allDone = false;
      }
      if (allDone) checkAchievement('all_games');
    }

    renderGames(data);
    updateStepStates();
    updateAllProgress();
  }
}

// ===== Quiz =====
function renderQuiz(data) {
  if (!data.quiz || data.quiz.length === 0) return;
  currentQuizIndex = 0;
  const dp = getDayProgress(data.day);
  for (let i = 0; i < data.quiz.length; i++) {
    if (!dp.quizAnswers?.[data.quiz[i].id]) { currentQuizIndex = i; break; }
    if (i === data.quiz.length - 1) currentQuizIndex = data.quiz.length;
  }
  if (currentQuizIndex >= data.quiz.length) showQuizComplete(data);
  else showQuizQuestion(data, currentQuizIndex);
  updateQuizProgress(data);
}

function showQuizQuestion(data, index) {
  const q = data.quiz[index];
  document.getElementById('quizArea').classList.remove('hidden');
  document.getElementById('quizComplete').classList.add('hidden');
  document.getElementById('quizNum').textContent = index + 1;
  document.getElementById('quizTotal').textContent = data.quiz.length;
  document.getElementById('quizTags').innerHTML = q.tags.map(t => `<span>${t}</span>`).join('');
  document.getElementById('quizQuestion').textContent = q.question;
  document.getElementById('quizNote').value = '';
  document.getElementById('quizAnswer').classList.add('hidden');
  document.getElementById('showAnswerBtn').classList.remove('hidden');
  document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('selected'));
}

function showAnswer() {
  const data = state.days[state.currentDay];
  const q = data.quiz[currentQuizIndex];
  document.getElementById('answerText').textContent = q.answer;
  document.getElementById('quizAnswer').classList.remove('hidden');
  document.getElementById('showAnswerBtn').classList.add('hidden');
}

function rateAnswer(rating) {
  const data = state.days[state.currentDay];
  const q = data.quiz[currentQuizIndex];
  const dp = getDayProgress(state.currentDay);
  if (!dp.quizAnswers) dp.quizAnswers = {};
  dp.quizAnswers[q.id] = {
    selfRating: rating,
    note: document.getElementById('quizNote').value.trim(),
    timestamp: Date.now()
  };
  saveProgress();
  playSFX(rating === 'correct' ? 'correct' : 'wrong');
  checkAchievement('first_quiz');

  document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.rate-btn[data-rate="${rating}"]`).classList.add('selected');

  setTimeout(() => {
    currentQuizIndex++;
    if (currentQuizIndex >= data.quiz.length) {
      showQuizComplete(data);
      // Check perfect day
      const ans = dp.quizAnswers || {};
      const allCorrect = data.quiz.every(q => ans[q.id]?.selfRating === 'correct');
      if (allCorrect) checkAchievement('perfect_day');
    } else {
      showQuizQuestion(data, currentQuizIndex);
    }
    updateQuizProgress(data);
    updateStepStates();
    updateAllProgress();
  }, 400);
}

function showQuizComplete(data) {
  document.getElementById('quizArea').classList.add('hidden');
  document.getElementById('quizComplete').classList.remove('hidden');
  const dp = getDayProgress(data.day);
  const answers = dp.quizAnswers || {};
  let correct = 0, fuzzy = 0, wrong = 0;
  const reviewItems = [];

  data.quiz.forEach((q, i) => {
    const r = answers[q.id]?.selfRating || 'wrong';
    if (r === 'correct') correct++;
    else if (r === 'fuzzy') fuzzy++;
    else wrong++;
    reviewItems.push(`
      <div class="review-item">
        <div class="review-badge ${r}">${r === 'correct' ? '✓' : r === 'fuzzy' ? '!' : '✗'}</div>
        <span>Q${i + 1} ${q.question.substring(0, 50)}...</span>
      </div>`);
  });

  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statFuzzy').textContent = fuzzy;
  document.getElementById('statWrong').textContent = wrong;
  document.getElementById('reviewList').innerHTML = reviewItems.join('');
  document.getElementById('progressCode').classList.add('hidden');

  // Check day 4 completion
  if (data.day === 4) checkAchievement('day4_done');
}

function updateQuizProgress(data) {
  if (!data.quiz) return;
  const dp = getDayProgress(data.day);
  const a = Object.keys(dp.quizAnswers || {}).length;
  document.getElementById('quizProgress').textContent = `(${a}/${data.quiz.length})`;
}

// ===== Progress Code =====
function generateProgressCode() {
  const data = state.days[state.currentDay];
  const dp = getDayProgress(state.currentDay);
  const payload = {
    name: progress.studentName, group: progress.studentGroup,
    day: state.currentDay, timestamp: Date.now(),
    viewedCards: dp.viewedCards || [], quizAnswers: dp.quizAnswers || {},
    completedGames: dp.completedGames || [], checklist: dp.checklist || {}
  };
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  document.getElementById('codeText').value = code;
  document.getElementById('progressCode').classList.remove('hidden');
}

function copyCode() {
  const ta = document.getElementById('codeText');
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => {
    document.getElementById('copyCodeBtn').textContent = '已复制!';
    setTimeout(() => { document.getElementById('copyCodeBtn').textContent = '复制'; }, 2000);
  });
}

// ===== Checklist =====
function renderChecklist(data) {
  const area = document.getElementById('checklistArea');
  if (!data.checklist || data.checklist.length === 0) {
    area.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">本日无操作清单</p>';
    return;
  }
  const dp = getDayProgress(data.day);
  if (!dp.checklist) dp.checklist = {};

  area.innerHTML = data.checklist.map(phase => {
    const items = phase.items.map((item, i) => {
      const key = `${phase.id}_${i}`;
      const checked = dp.checklist[key] ? 'checked' : '';
      return `
        <div class="checklist-item ${checked ? 'checked' : ''}">
          <input type="checkbox" id="${key}" ${checked} onchange="toggleChecklist('${key}',this)">
          <label for="${key}">${item}</label>
        </div>`;
    }).join('');
    return `<div class="checklist-phase"><h4>Phase ${phase.phase}：${phase.title}</h4>${items}</div>`;
  }).join('');
  updateChecklistProgress(data);
}

function toggleChecklist(key, el) {
  const dp = getDayProgress(state.currentDay);
  if (!dp.checklist) dp.checklist = {};
  dp.checklist[key] = el.checked;
  el.closest('.checklist-item').classList.toggle('checked', el.checked);
  saveProgress();
  updateChecklistProgress(state.days[state.currentDay]);
  updateAllProgress();
}

function updateChecklistProgress(data) {
  if (!data?.checklist) return;
  const dp = getDayProgress(data.day);
  const cl = dp.checklist || {};
  let total = 0, done = 0;
  data.checklist.forEach(phase => {
    phase.items.forEach((_, i) => { total++; if (cl[`${phase.id}_${i}`]) done++; });
  });
  document.getElementById('checklistProgress').textContent = `(${done}/${total})`;
}

// ===== Summary =====
function renderSummary(data) {
  if (!data.summary) return;
  document.getElementById('summaryCards').innerHTML = data.summary.map(s => `
    <div class="summary-item">
      <span class="summary-keyword">${s.keyword}</span>
      <span class="summary-oneliner">${s.oneliner}</span>
    </div>`).join('');
}

// ===== Troubleshoot =====
function renderTroubleshoot(data) {
  const section = document.getElementById('troubleshootSection');
  if (!data.troubleshoot || data.troubleshoot.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  const tree = document.getElementById('troubleshootTree');
  startTroubleshoot(tree, data.troubleshoot, 0);
}

function startTroubleshoot(container, nodes, index) {
  if (index >= nodes.length) return;
  const node = nodes[index];
  container.innerHTML = '';

  const el = document.createElement('div');
  el.className = 'troubleshoot-node active-node animate-in';
  el.innerHTML = `
    <div class="troubleshoot-question">${node.question}</div>
    <div class="troubleshoot-options">
      ${node.options.map((opt, i) => `
        <button class="btn btn-ghost btn-sm" onclick="handleTroubleshoot(${index},${i})">${opt.label}</button>
      `).join('')}
    </div>`;
  container.appendChild(el);
}

function handleTroubleshoot(nodeIdx, optIdx) {
  const data = state.days[state.currentDay];
  if (!data?.troubleshoot) return;
  const node = data.troubleshoot[nodeIdx];
  const opt = node.options[optIdx];
  const container = document.getElementById('troubleshootTree');

  if (opt.next !== undefined) {
    startTroubleshoot(container, data.troubleshoot, opt.next);
  } else if (opt.result) {
    container.innerHTML = `
      <div class="troubleshoot-result ${opt.type || 'solution'} animate-in">
        ${opt.result}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="startTroubleshoot(document.getElementById('troubleshootTree'), state.days[state.currentDay].troubleshoot, 0)">重新排查</button>`;
  }
}

// ===== Glossary =====
function renderGlossary(filter = '') {
  const list = document.getElementById('glossaryList');
  const filtered = filter
    ? glossaryData.filter(g =>
        g.term.toLowerCase().includes(filter.toLowerCase()) ||
        g.chinese.includes(filter) ||
        g.fullName.toLowerCase().includes(filter.toLowerCase()))
    : glossaryData;

  list.innerHTML = filtered.map(g => `
    <div class="glossary-entry">
      <div class="glossary-term">${g.term} <span class="glossary-full">${g.fullName}</span></div>
      <div class="glossary-def">${g.chinese} — ${g.definition}</div>
      <div class="glossary-days">Used in: ${g.usedIn.join(', ')}</div>
    </div>`).join('');
}

// ===== Step States =====
function updateStepStates() {
  const data = state.days[state.currentDay];
  if (!data) return;
  const dp = getDayProgress(state.currentDay);

  const viewedAll = (dp.viewedCards?.length || 0) >= (data.cards?.length || 0);
  const hasGames = data.games && data.games.length > 0;
  const gamesAll = !hasGames || (dp.completedGames?.length || 0) >= data.games.length;
  const answeredAll = Object.keys(dp.quizAnswers || {}).length >= (data.quiz?.length || 0);

  const steps = document.querySelectorAll('.step');
  steps.forEach(s => {
    s.classList.remove('active', 'completed', 'locked');
    const lock = s.querySelector('.lock-icon');
    if (lock) lock.style.display = '';
  });

  // Step 1: Learn
  const learnStep = document.querySelector('[data-step="learn"]');
  learnStep.classList.add(viewedAll ? 'completed' : 'active');

  // Step 2: Games
  const gameStep = document.querySelector('[data-step="game"]');
  if (!viewedAll) gameStep.classList.add('locked');
  else if (gamesAll) gameStep.classList.add('completed');
  else gameStep.classList.add('active');

  // Step 3: Quiz
  const quizStep = document.querySelector('[data-step="quiz"]');
  if (!viewedAll || (hasGames && !gamesAll)) quizStep.classList.add('locked');
  else if (answeredAll) quizStep.classList.add('completed');
  else quizStep.classList.add('active');

  // Step 4: Checklist
  const clStep = document.querySelector('[data-step="checklist"]');
  if (!answeredAll) clStep.classList.add('locked');
  else clStep.classList.add('active');

  // Show/hide sections
  document.getElementById('gameSection').classList.toggle('hidden', !viewedAll);
  document.getElementById('quizSection').classList.toggle('hidden',
    !viewedAll || (hasGames && !gamesAll));
  document.getElementById('checklistSection').classList.toggle('hidden', !answeredAll);
  document.getElementById('summarySection').classList.toggle('hidden', !viewedAll);
}

function showStep(stepName) {
  const map = {
    learn: 'learnSection', game: 'gameSection',
    quiz: 'quizSection', checklist: 'checklistSection'
  };
  const id = map[stepName];
  if (id) document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Progress =====
function getDayProgress(day) {
  if (!progress.days) progress.days = {};
  if (!progress.days[day]) progress.days[day] = {};
  return progress.days[day];
}

function loadProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { try { progress = JSON.parse(saved); } catch (e) { progress = {}; } }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function updateAllProgress() {
  for (let d = 0; d <= 4; d++) {
    const data = state.days[d];
    const el = document.getElementById(`prog${d}`);
    if (!el) continue;
    if (!data) { el.textContent = ''; continue; }

    const dp = getDayProgress(d);
    const cards = dp.viewedCards?.length || 0;
    const quiz = Object.keys(dp.quizAnswers || {}).length;
    const tc = data.cards?.length || 0;
    const tq = data.quiz?.length || 0;

    if (tc > 0 && cards >= tc && tq > 0 && quiz >= tq) el.innerHTML = '✓ 完成';
    else if (cards > 0 || quiz > 0) el.textContent = '进行中...';
    else el.textContent = '';
  }

  const data = state.days[state.currentDay];
  if (!data) return;
  const dp = getDayProgress(state.currentDay);
  const cardsDone = dp.viewedCards?.length || 0;
  const gamesDone = dp.completedGames?.length || 0;
  const quizDone = Object.keys(dp.quizAnswers || {}).length;
  const totalItems = (data.cards?.length || 0) + (data.games?.length || 0) + (data.quiz?.length || 0);
  const doneItems = cardsDone + gamesDone + quizDone;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  document.getElementById('footerDay').textContent = `Day ${state.currentDay}`;
  document.getElementById('footerProgressBar').style.width = `${pct}%`;
  document.getElementById('footerPercent').textContent = `${pct}%`;
}

// ===== Achievements =====
function checkAchievement(id) {
  if (!progress.achievements) progress.achievements = [];
  if (progress.achievements.includes(id)) return;
  progress.achievements.push(id);
  saveProgress();
  renderAchievements();
  // Show toast
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (ach) showAchievementToast(ach);
}

function renderAchievements() {
  const bar = document.getElementById('achievementsBar');
  if (!bar) return;
  const earned = progress.achievements || [];
  bar.innerHTML = ACHIEVEMENTS.map(a => {
    const got = earned.includes(a.id);
    return `<div class="achievement ${got ? 'earned' : 'locked'}" title="${a.name}: ${a.desc}">${a.icon}</div>`;
  }).join('');
}

function showAchievementToast(ach) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:9999;
    background:var(--bg-secondary);border:1px solid var(--accent-orange);
    border-radius:var(--radius-md);padding:16px 20px;
    box-shadow:0 0 30px rgba(245,158,11,0.3);
    animation:slideUp 0.4s var(--ease);display:flex;align-items:center;gap:12px;
  `;
  toast.innerHTML = `
    <span style="font-size:1.5rem;">${ach.icon}</span>
    <div><strong style="color:var(--accent-orange);">成就解锁!</strong>
    <br><span style="font-size:0.85rem;color:var(--text-secondary);">${ach.name} — ${ach.desc}</span></div>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; }, 3000);
  setTimeout(() => toast.remove(), 3500);
}

// Global references
window.flipCard = flipCard;
window.toggleChecklist = toggleChecklist;
window.openGame = openGame;
window.completeGame = completeGame;
window.handleTroubleshoot = handleTroubleshoot;
window.startTroubleshoot = startTroubleshoot;
window.state = state;
