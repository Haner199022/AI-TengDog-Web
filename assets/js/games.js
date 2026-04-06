// ===== AI TengDog Workshop — Interactive Games Engine =====
// Each game type has an init function that renders into #gameModalBody
// Call completeGame(gameId) when player wins

// ===== Game Router =====
function initGame(game, day) {
  const body = document.getElementById('gameModalBody');
  body.innerHTML = '';

  const handler = GAME_HANDLERS[game.type];
  if (handler) {
    handler(body, game, day);
  } else {
    body.innerHTML = `<p style="color:var(--text-muted);">游戏类型 "${game.type}" 暂未实现</p>`;
  }
}

// ===== Game Type Handlers =====
const GAME_HANDLERS = {
  match: initMatchGame,
  sorting: initSortingGame,
  protocol_builder: initProtocolBuilder,
  wiring_check: initWiringCheck,
  sensor_reading: initSensorReading,
  adc_calc: initADCCalc,
  architecture_choice: initArchitectureChoice,
  api_builder: initAPIBuilder,
};

// ===== 1. Match Game — 配对连线 =====
// Pairs of items: match left to right
function initMatchGame(body, game) {
  const pairs = shuffle([...game.data.pairs]);
  const rights = shuffle(pairs.map(p => ({ id: p.id, text: p.right })));

  let selected = null;
  let matched = new Set();

  const container = document.createElement('div');
  container.className = 'match-game';
  container.innerHTML = `
    <p class="game-instruction">${game.data.instruction || '将左边的项目与右边的描述配对'}</p>
    <div class="match-columns">
      <div class="match-col match-left">
        ${pairs.map(p => `<div class="match-item match-left-item" data-id="${p.id}">${p.left}</div>`).join('')}
      </div>
      <div class="match-col match-right">
        ${rights.map(r => `<div class="match-item match-right-item" data-id="${r.id}">${r.text}</div>`).join('')}
      </div>
    </div>
    <div class="match-feedback"></div>
  `;
  body.appendChild(container);

  const feedback = container.querySelector('.match-feedback');

  container.querySelectorAll('.match-left-item').forEach(el => {
    el.addEventListener('click', () => {
      if (matched.has(el.dataset.id)) return;
      container.querySelectorAll('.match-left-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selected = { side: 'left', id: el.dataset.id, el };
    });
  });

  container.querySelectorAll('.match-right-item').forEach(el => {
    el.addEventListener('click', () => {
      if (matched.has(el.dataset.id)) return;
      if (!selected || selected.side !== 'left') {
        container.querySelectorAll('.match-right-item').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        selected = { side: 'right', id: el.dataset.id, el };
        return;
      }
      // Check match
      if (selected.id === el.dataset.id) {
        matched.add(el.dataset.id);
        selected.el.classList.add('matched');
        el.classList.add('matched');
        selected.el.classList.remove('selected');
        playSFX('correct');
        feedback.textContent = '✓ 正确！';
        feedback.className = 'match-feedback correct';

        if (matched.size === pairs.length) {
          setTimeout(() => {
            feedback.innerHTML = '🎉 全部配对完成！';
            feedback.className = 'match-feedback complete';
            completeGame(game.id);
          }, 500);
        }
      } else {
        selected.el.classList.add('wrong');
        el.classList.add('wrong');
        playSFX('wrong');
        feedback.textContent = '✗ 再想想！';
        feedback.className = 'match-feedback wrong';
        setTimeout(() => {
          selected.el.classList.remove('wrong', 'selected');
          el.classList.remove('wrong');
          selected = null;
        }, 600);
      }
      selected = null;
    });
  });
}

// ===== 2. Sorting Game — 流程排序 =====
// Drag/click to reorder steps
function initSortingGame(body, game) {
  const steps = shuffle([...game.data.steps]);
  const correctOrder = game.data.steps.map(s => s.id);

  const container = document.createElement('div');
  container.className = 'sorting-game';
  container.innerHTML = `
    <p class="game-instruction">${game.data.instruction || '将步骤拖拽到正确的顺序'}</p>
    <div class="sorting-list" id="sortingList"></div>
    <button class="btn btn-primary" id="checkSortBtn">检查顺序</button>
    <div class="sorting-feedback"></div>
  `;
  body.appendChild(container);

  const list = container.querySelector('#sortingList');
  renderSortList(list, steps);

  // Click-to-swap mechanism
  let swapFirst = null;

  function renderSortList(listEl, items) {
    listEl.innerHTML = items.map((s, i) => `
      <div class="sort-item" data-idx="${i}" data-id="${s.id}">
        <span class="sort-num">${i + 1}</span>
        <span class="sort-text">${s.text}</span>
        <span class="sort-handle">⇅</span>
      </div>
    `).join('');

    listEl.querySelectorAll('.sort-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        if (swapFirst === null) {
          swapFirst = idx;
          el.classList.add('selected');
        } else {
          // Swap
          const temp = items[swapFirst];
          items[swapFirst] = items[idx];
          items[idx] = temp;
          swapFirst = null;
          renderSortList(listEl, items);
        }
      });

      // Touch drag support
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', el.dataset.idx);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = parseInt(el.dataset.idx);
        const temp = items[fromIdx];
        items[fromIdx] = items[toIdx];
        items[toIdx] = temp;
        swapFirst = null;
        renderSortList(listEl, items);
      });
    });
  }

  container.querySelector('#checkSortBtn').addEventListener('click', () => {
    const currentOrder = items_order();
    const feedback = container.querySelector('.sorting-feedback');
    const allCorrect = currentOrder.every((id, i) => id === correctOrder[i]);

    if (allCorrect) {
      playSFX('correct');
      feedback.innerHTML = '🎉 顺序完全正确！';
      feedback.className = 'sorting-feedback correct';
      list.querySelectorAll('.sort-item').forEach(el => el.classList.add('correct'));
      completeGame(game.id);
    } else {
      playSFX('wrong');
      // Highlight correct/wrong positions
      const items = list.querySelectorAll('.sort-item');
      items.forEach((el, i) => {
        el.classList.remove('correct', 'wrong');
        el.classList.add(el.dataset.id === correctOrder[i] ? 'correct' : 'wrong');
      });
      const correctCount = currentOrder.filter((id, i) => id === correctOrder[i]).length;
      feedback.innerHTML = `${correctCount}/${correctOrder.length} 个位置正确，再试试！`;
      feedback.className = 'sorting-feedback wrong';
    }
  });

  function items_order() {
    return Array.from(list.querySelectorAll('.sort-item')).map(el => el.dataset.id);
  }
}

// ===== 3. Protocol Builder — 协议拼装 =====
// Build a command string by selecting parts
function initProtocolBuilder(body, game) {
  const rounds = game.data.rounds;
  let currentRound = 0;

  const container = document.createElement('div');
  container.className = 'protocol-game';
  body.appendChild(container);

  function renderRound() {
    if (currentRound >= rounds.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 全部协议拼装完成！</h3>
          <p>你已经掌握了 ${game.data.protocolName || '通信协议'} 的格式</p>
        </div>`;
      completeGame(game.id);
      return;
    }

    const round = rounds[currentRound];
    container.innerHTML = `
      <p class="game-instruction">${round.instruction}</p>
      <div class="protocol-display">
        <div class="protocol-slots" id="protocolSlots">
          ${round.slots.map((s, i) => `<div class="protocol-slot" data-idx="${i}" data-answer="${s.answer}">${s.placeholder || '?'}</div>`).join('')}
        </div>
      </div>
      <div class="protocol-options" id="protocolOptions">
        ${shuffle(round.options).map(opt => `<div class="protocol-option" data-value="${opt.value}">${opt.label}</div>`).join('')}
      </div>
      <div class="protocol-round-info">${currentRound + 1} / ${rounds.length}</div>
      <div class="protocol-feedback"></div>
    `;

    let selectedSlot = null;

    container.querySelectorAll('.protocol-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        container.querySelectorAll('.protocol-slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedSlot = slot;
      });
    });

    container.querySelectorAll('.protocol-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (!selectedSlot) {
          // Auto-select first empty slot
          selectedSlot = container.querySelector('.protocol-slot:not(.filled)');
          if (!selectedSlot) return;
          selectedSlot.classList.add('selected');
        }

        selectedSlot.textContent = opt.textContent;
        selectedSlot.dataset.value = opt.dataset.value;
        selectedSlot.classList.add('filled');
        selectedSlot.classList.remove('selected');
        opt.classList.add('used');

        // Check if all slots filled
        const slots = container.querySelectorAll('.protocol-slot');
        const allFilled = Array.from(slots).every(s => s.classList.contains('filled'));
        if (allFilled) checkProtocol(slots);

        selectedSlot = null;
      });
    });

    function checkProtocol(slots) {
      const feedback = container.querySelector('.protocol-feedback');
      const allCorrect = Array.from(slots).every(s => s.dataset.value === s.dataset.answer);

      if (allCorrect) {
        playSFX('correct');
        slots.forEach(s => s.classList.add('correct'));
        feedback.innerHTML = '✓ 正确！';
        feedback.className = 'protocol-feedback correct';
        setTimeout(() => { currentRound++; renderRound(); }, 1000);
      } else {
        playSFX('wrong');
        slots.forEach(s => {
          s.classList.add(s.dataset.value === s.dataset.answer ? 'correct' : 'wrong');
        });
        feedback.innerHTML = '✗ 有错误，点击槽位重新选择';
        feedback.className = 'protocol-feedback wrong';

        // Reset wrong slots
        setTimeout(() => {
          slots.forEach(s => {
            if (s.classList.contains('wrong')) {
              s.textContent = s.dataset.placeholder || '?';
              s.classList.remove('filled', 'wrong', 'correct');
              delete s.dataset.value;
            }
          });
          container.querySelectorAll('.protocol-option').forEach(o => {
            if (!Array.from(slots).some(s => s.dataset.value === o.dataset.value)) {
              o.classList.remove('used');
            }
          });
          feedback.textContent = '';
        }, 1200);
      }
    }
  }

  renderRound();
}

// ===== 4. Wiring Check — 接线纠错 =====
// Show wiring diagrams, find the mistake
function initWiringCheck(body, game) {
  const scenarios = game.data.scenarios;
  let current = 0;
  let score = 0;

  const container = document.createElement('div');
  container.className = 'wiring-game';
  body.appendChild(container);

  function renderScenario() {
    if (current >= scenarios.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 接线纠错完成！</h3>
          <p>得分：${score} / ${scenarios.length}</p>
        </div>`;
      if (score >= Math.ceil(scenarios.length / 2)) completeGame(game.id);
      return;
    }

    const s = scenarios[current];
    container.innerHTML = `
      <p class="game-instruction">${s.instruction || '找出接线中的错误'}</p>
      <div class="wiring-diagram">
        <pre class="wiring-code">${s.diagram}</pre>
      </div>
      <div class="wiring-options">
        ${s.options.map((opt, i) => `<button class="btn btn-ghost wiring-option" data-idx="${i}">${opt.text}</button>`).join('')}
      </div>
      <div class="wiring-progress">${current + 1} / ${scenarios.length}</div>
      <div class="wiring-feedback"></div>
    `;

    container.querySelectorAll('.wiring-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const feedback = container.querySelector('.wiring-feedback');
        const isCorrect = s.options[idx].correct === true;

        container.querySelectorAll('.wiring-option').forEach(b => b.disabled = true);

        if (isCorrect) {
          score++;
          btn.classList.add('correct');
          playSFX('correct');
          feedback.innerHTML = `✓ 正确！${s.explanation || ''}`;
          feedback.className = 'wiring-feedback correct';
        } else {
          btn.classList.add('wrong');
          const correctBtn = container.querySelector(`.wiring-option[data-idx="${s.options.findIndex(o => o.correct)}"]`);
          if (correctBtn) correctBtn.classList.add('correct');
          playSFX('wrong');
          feedback.innerHTML = `✗ ${s.explanation || ''}`;
          feedback.className = 'wiring-feedback wrong';
        }

        setTimeout(() => { current++; renderScenario(); }, 2000);
      });
    });
  }

  renderScenario();
}

// ===== 5. Sensor Reading — 传感器数据解读 =====
// Given sensor readings, answer questions
function initSensorReading(body, game) {
  const questions = game.data.questions;
  let current = 0;
  let score = 0;

  const container = document.createElement('div');
  container.className = 'sensor-game';
  body.appendChild(container);

  function renderQuestion() {
    if (current >= questions.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 传感器数据解读完成！</h3>
          <p>正确：${score} / ${questions.length}</p>
        </div>`;
      if (score >= Math.ceil(questions.length / 2)) completeGame(game.id);
      return;
    }

    const q = questions[current];
    container.innerHTML = `
      <p class="game-instruction">${q.scenario}</p>
      <div class="sensor-display">
        ${q.readings.map(r => `<div class="sensor-value"><span class="sensor-label">${r.label}</span><span class="sensor-num">${r.value}</span></div>`).join('')}
      </div>
      <p class="sensor-question">${q.question}</p>
      <div class="sensor-options">
        ${q.options.map((opt, i) => `<button class="btn btn-ghost sensor-option" data-idx="${i}">${opt.text}</button>`).join('')}
      </div>
      <div class="sensor-progress">${current + 1} / ${questions.length}</div>
      <div class="sensor-feedback"></div>
    `;

    container.querySelectorAll('.sensor-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const feedback = container.querySelector('.sensor-feedback');
        const isCorrect = q.options[idx].correct === true;

        container.querySelectorAll('.sensor-option').forEach(b => b.disabled = true);

        if (isCorrect) {
          score++;
          btn.classList.add('correct');
          playSFX('correct');
          feedback.innerHTML = `✓ ${q.explanation || '正确！'}`;
          feedback.className = 'sensor-feedback correct';
        } else {
          btn.classList.add('wrong');
          const correctBtn = container.querySelector(`.sensor-option[data-idx="${q.options.findIndex(o => o.correct)}"]`);
          if (correctBtn) correctBtn.classList.add('correct');
          playSFX('wrong');
          feedback.innerHTML = `✗ ${q.explanation || ''}`;
          feedback.className = 'sensor-feedback wrong';
        }

        setTimeout(() => { current++; renderQuestion(); }, 2000);
      });
    });
  }

  renderQuestion();
}

// ===== 6. ADC Calculator — ADC转换计算 =====
function initADCCalc(body, game) {
  const challenges = game.data.challenges;
  let current = 0;
  let score = 0;

  const container = document.createElement('div');
  container.className = 'adc-game';
  body.appendChild(container);

  function renderChallenge() {
    if (current >= challenges.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 ADC转换练习完成！</h3>
          <p>正确：${score} / ${challenges.length}</p>
        </div>`;
      if (score >= Math.ceil(challenges.length / 2)) completeGame(game.id);
      return;
    }

    const c = challenges[current];
    container.innerHTML = `
      <p class="game-instruction">${c.question}</p>
      <div class="adc-formula">满量程：3.3V = 4095，0V = 0</div>
      <div class="adc-input">
        <input type="number" id="adcAnswer" placeholder="输入答案" class="adc-input-field">
        <span class="adc-unit">${c.unit || ''}</span>
      </div>
      <button class="btn btn-primary" id="adcCheckBtn">确认</button>
      <div class="adc-progress">${current + 1} / ${challenges.length}</div>
      <div class="adc-feedback"></div>
    `;

    container.querySelector('#adcCheckBtn').addEventListener('click', () => {
      const input = container.querySelector('#adcAnswer');
      const val = parseFloat(input.value);
      const feedback = container.querySelector('.adc-feedback');

      if (isNaN(val)) {
        feedback.textContent = '请输入数字';
        feedback.className = 'adc-feedback wrong';
        return;
      }

      const tolerance = c.tolerance || 0.05;
      const isCorrect = Math.abs(val - c.answer) <= tolerance * Math.abs(c.answer || 1);

      if (isCorrect) {
        score++;
        playSFX('correct');
        feedback.innerHTML = `✓ 正确！答案是 ${c.answer}${c.unit || ''}。${c.explanation || ''}`;
        feedback.className = 'adc-feedback correct';
      } else {
        playSFX('wrong');
        feedback.innerHTML = `✗ 答案是 ${c.answer}${c.unit || ''}。${c.explanation || ''}`;
        feedback.className = 'adc-feedback wrong';
      }

      container.querySelector('#adcCheckBtn').disabled = true;
      setTimeout(() => { current++; renderChallenge(); }, 2500);
    });

    // Enter key support
    container.querySelector('#adcAnswer').addEventListener('keydown', e => {
      if (e.key === 'Enter') container.querySelector('#adcCheckBtn').click();
    });
  }

  renderChallenge();
}

// ===== 7. Architecture Choice — 架构选择 =====
// Scenario-based: which AI should handle this task?
function initArchitectureChoice(body, game) {
  const scenarios = game.data.scenarios;
  let current = 0;
  let score = 0;

  const container = document.createElement('div');
  container.className = 'arch-game';
  body.appendChild(container);

  function renderScenario() {
    if (current >= scenarios.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 架构选择完成！</h3>
          <p>正确：${score} / ${scenarios.length}</p>
          <p>${score >= scenarios.length - 1 ? '你已掌握边缘AI vs 云端AI的分工！' : '再多想想什么任务该用哪种AI'}</p>
        </div>`;
      if (score >= Math.ceil(scenarios.length / 2)) completeGame(game.id);
      return;
    }

    const s = scenarios[current];
    container.innerHTML = `
      <p class="game-instruction">场景 ${current + 1}/${scenarios.length}</p>
      <div class="arch-scenario">
        <div class="arch-description">${s.description}</div>
      </div>
      <div class="arch-choices">
        ${s.choices.map((c, i) => `
          <button class="btn btn-ghost arch-choice" data-idx="${i}">
            <span class="arch-icon">${c.icon || ''}</span>
            <span>${c.label}</span>
          </button>`).join('')}
      </div>
      <div class="arch-progress">${current + 1} / ${scenarios.length}</div>
      <div class="arch-feedback"></div>
    `;

    container.querySelectorAll('.arch-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const feedback = container.querySelector('.arch-feedback');
        const isCorrect = s.choices[idx].correct === true;

        container.querySelectorAll('.arch-choice').forEach(b => b.disabled = true);

        if (isCorrect) {
          score++;
          btn.classList.add('correct');
          playSFX('correct');
          feedback.innerHTML = `✓ ${s.explanation || '正确！'}`;
          feedback.className = 'arch-feedback correct';
        } else {
          btn.classList.add('wrong');
          const correctBtn = container.querySelector(`.arch-choice[data-idx="${s.choices.findIndex(c => c.correct)}"]`);
          if (correctBtn) correctBtn.classList.add('correct');
          playSFX('wrong');
          feedback.innerHTML = `✗ ${s.explanation || ''}`;
          feedback.className = 'arch-feedback wrong';
        }

        setTimeout(() => { current++; renderScenario(); }, 2000);
      });
    });
  }

  renderScenario();
}

// ===== 8. API Builder — API请求拼装 =====
function initAPIBuilder(body, game) {
  const steps = game.data.steps;
  let current = 0;

  const container = document.createElement('div');
  container.className = 'api-game';
  body.appendChild(container);

  function renderStep() {
    if (current >= steps.length) {
      container.innerHTML = `
        <div class="game-complete">
          <h3>🎉 API请求拼装完成！</h3>
          <p>你已掌握HTTP请求的基本结构</p>
        </div>`;
      completeGame(game.id);
      return;
    }

    const step = steps[current];
    container.innerHTML = `
      <p class="game-instruction">${step.instruction}</p>
      <div class="api-preview">
        <code class="api-code" id="apiPreview">${step.preview || ''}</code>
      </div>
      <div class="api-options">
        ${shuffle(step.options).map((opt, i) => `
          <button class="btn btn-ghost api-option" data-value="${opt.value}" data-idx="${i}">${opt.label}</button>
        `).join('')}
      </div>
      <div class="api-step-info">步骤 ${current + 1} / ${steps.length}</div>
      <div class="api-feedback"></div>
    `;

    container.querySelectorAll('.api-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const feedback = container.querySelector('.api-feedback');
        const isCorrect = btn.dataset.value === step.correctValue;

        container.querySelectorAll('.api-option').forEach(b => b.disabled = true);

        if (isCorrect) {
          btn.classList.add('correct');
          playSFX('correct');
          feedback.innerHTML = `✓ ${step.explanation || '正确！'}`;
          feedback.className = 'api-feedback correct';
          setTimeout(() => { current++; renderStep(); }, 1200);
        } else {
          btn.classList.add('wrong');
          playSFX('wrong');
          feedback.innerHTML = `✗ ${step.explanation || '再想想'}`;
          feedback.className = 'api-feedback wrong';
          setTimeout(() => {
            btn.classList.remove('wrong');
            container.querySelectorAll('.api-option').forEach(b => b.disabled = false);
            feedback.textContent = '';
          }, 1200);
        }
      });
    });
  }

  renderStep();
}

// ===== Utility =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make initGame globally available
window.initGame = initGame;
