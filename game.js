/**
 * 공포의 부엌 방탈출 메인 게임 컨트롤러
 */

class EscapeRoomGame {
  constructor() {
    this.sanity = 100;
    this.maxSanity = 100;
    this.totalTime = 60; // 1분 (60초 타임어택)
    this.timeLeft = this.totalTime;
    this.gameState = 'INIT'; // INIT, PLAYING, VICTORY, GAMEOVER
    this.solvedAreas = new Set();
    this.talismans = [];
    this.currentArea = null;

    this.notebook = window.NutritionNotebook ? new window.NutritionNotebook() : null;

    this.initDOMElements();
    this.initEventListeners();
    this.updateStatusUI();
  }

  initDOMElements() {
    this.sanityBarEl = document.getElementById('sanityBar');
    this.sanityTextEl = document.getElementById('sanityText');
    this.timerTextEl = document.getElementById('timerText');
    this.talismanSlotsEl = document.getElementById('talismanSlots');
    this.investigateModalEl = document.getElementById('investigateModal');
    this.investigateContentEl = document.getElementById('investigateContent');
    this.startModalEl = document.getElementById('introModal');
    this.victoryModalEl = document.getElementById('victoryModal');
    this.gameOverModalEl = document.getElementById('gameOverModal');
    this.vignetteOverlayEl = document.getElementById('vignetteOverlay');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.feedbackToastEl = document.getElementById('actionToast');

    // 탈출 명단 (랭킹) 요소
    this.leaderboardModalEl = document.getElementById('leaderboardModal');
    this.leaderboardContainerEl = document.getElementById('leaderboardTableContainer');
    this.playerNameInputEl = document.getElementById('playerNameInput');
    this.saveScoreBtnEl = document.getElementById('saveScoreBtn');
    this.registerSuccessMsgEl = document.getElementById('registerSuccessMsg');
    this.victoryTimeTakenEl = document.getElementById('victoryTimeTaken');
    this.victorySanityEl = document.getElementById('victorySanity');
    this.playerTimeBadgeEl = document.getElementById('playerTimeBadge');
    this.praiseQuoteTextEl = document.getElementById('praiseQuoteText');
  }

  initEventListeners() {
    // 게임 시작 버튼
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    // 재도전 버튼
    const restartBtns = document.querySelectorAll('.restart-game-btn');
    restartBtns.forEach(btn => {
      btn.addEventListener('click', () => this.startGame());
    });

    // 사운드 토글 버튼
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        if (window.horrorAudio) {
          const isMuted = window.horrorAudio.toggleMute();
          this.soundToggleBtn.innerHTML = isMuted 
            ? '🔇 <span class="btn-text">음소거</span>' 
            : '🔊 <span class="btn-text">소리 켬</span>';
        }
      });
    }

    // 부엌 단서 핫스팟 클릭 이벤트
    document.querySelectorAll('.kitchen-hotspot').forEach(spot => {
      spot.addEventListener('click', (e) => {
        const areaId = e.currentTarget.dataset.area;
        this.inspectArea(areaId);
      });
    });

    // 조사 모달 닫기
    document.querySelectorAll('.close-investigate-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeInvestigate());
    });

    if (this.investigateModalEl) {
      this.investigateModalEl.addEventListener('click', (e) => {
        if (e.target === this.investigateModalEl) this.closeInvestigate();
      });
    }

    // 탈출 명단 모달 열기/닫기
    const openLeaderboardBtn = document.getElementById('openLeaderboardBtn');
    if (openLeaderboardBtn) {
      openLeaderboardBtn.addEventListener('click', () => this.openLeaderboard());
    }

    const viewLeaderboardFromVictoryBtn = document.getElementById('viewLeaderboardFromVictoryBtn');
    if (viewLeaderboardFromVictoryBtn) {
      viewLeaderboardFromVictoryBtn.addEventListener('click', () => this.openLeaderboard());
    }

    document.querySelectorAll('.close-leaderboard-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeLeaderboard());
    });

    if (this.leaderboardModalEl) {
      this.leaderboardModalEl.addEventListener('click', (e) => {
        if (e.target === this.leaderboardModalEl) this.closeLeaderboard();
      });
    }

    // 이름 등록 버튼 및 엔터키 입력
    if (this.saveScoreBtnEl) {
      this.saveScoreBtnEl.addEventListener('click', () => this.handleScoreSubmit());
    }
    if (this.playerNameInputEl) {
      this.playerNameInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleScoreSubmit();
      });
    }

    // 교사용 명단 초기화
    const resetLeaderboardBtn = document.getElementById('resetLeaderboardBtn');
    if (resetLeaderboardBtn) {
      resetLeaderboardBtn.addEventListener('click', () => this.resetLeaderboard());
    }

    // 손전등 마우스 추적 (공포 분위기 라이팅)
    const flashlight = document.getElementById('flashlightBeam');
    if (flashlight) {
      window.addEventListener('pointermove', (e) => {
        flashlight.style.setProperty('--cursor-x', `${e.clientX}px`);
        flashlight.style.setProperty('--cursor-y', `${e.clientY}px`);
      });
    }
  }

  startGame() {
    this.sanity = 100;
    this.timeLeft = this.totalTime;
    this.solvedAreas.clear();
    this.talismans = [];
    this.gameState = 'PLAYING';

    if (this.startModalEl) this.startModalEl.classList.remove('show');
    if (this.victoryModalEl) this.victoryModalEl.classList.remove('show');
    if (this.gameOverModalEl) this.gameOverModalEl.classList.remove('show');

    // 핫스팟 정화 상태 초기화
    document.querySelectorAll('.kitchen-hotspot').forEach(spot => {
      spot.classList.remove('purified');
    });

    // 오디오 시작
    if (window.horrorAudio) {
      window.horrorAudio.startAmbient();
      window.horrorAudio.startHeartbeatLoop();
    }

    // 타이머 인터벌
    clearInterval(this.gameClockTimer);
    this.gameClockTimer = setInterval(() => {
      this.tick();
    }, 1000);

    this.updateStatusUI();
    this.showToast('🔦 손전등으로 부엌 구석구석의 단서를 조사하세요!', 'info');
  }

  tick() {
    if (this.gameState !== 'PLAYING') return;

    this.timeLeft--;
    this.updateTimerDisplay();

    if (this.timeLeft <= 0) {
      this.triggerGameOver('⏱️ 1분 시간 초과! 60초 안에 부엌의 저주를 풀지 못해 어둠에 갇혔습니다... 다시 도전해 보세요!');
    }
  }

  inspectArea(areaId) {
    if (this.gameState !== 'PLAYING') return;

    const areaData = window.ESCAPE_GAME_DATA.areas.find(a => a.id === areaId);
    if (!areaData) return;

    if (window.horrorAudio) {
      window.horrorAudio.playCreak();
    }

    // 탈출문(door)의 경우
    if (areaId === 'door') {
      if (this.solvedAreas.has('door') || this.solvedAreas.size === 5) {
        this.triggerVictory();
        return;
      }
      if (this.solvedAreas.size < 4) {
        this.showDoorLockedPrompt();
        return;
      }
    }

    this.currentArea = areaData;
    this.renderInvestigateModal(areaData);
    if (this.investigateModalEl) {
      this.investigateModalEl.classList.add('show');
    }
  }

  showDoorLockedPrompt() {
    if (window.horrorAudio) window.horrorAudio.playChainRattle();
    this.showToast(`🔒 탈출문 봉인이 굳건합니다! 4개 구역 중 ${4 - this.solvedAreas.size}곳의 단서를 더 풀어야 합니다!`, 'warning');
    this.triggerScreenShake();
  }

  renderInvestigateModal(area) {
    if (!this.investigateContentEl) return;
    const isAlreadySolved = this.solvedAreas.has(area.id);

    this.investigateContentEl.innerHTML = `
      <div class="investigate-header">
        <span class="investigate-icon">${area.icon}</span>
        <div class="header-text-wrap">
          <span class="investigate-badge">${area.topic}</span>
          <h2 class="investigate-title">${area.name}</h2>
        </div>
      </div>

      <div class="investigate-story-box">
        <p class="story-speech">${area.storyText.replace(/\n/g, '<br>')}</p>
      </div>

      ${isAlreadySolved ? `
        <div class="already-solved-banner">
          <div style="font-size: 2rem;">✨</div>
          <h3>이미 정화된 구역입니다!</h3>
          <p>획득한 부적: <strong>${area.choices.find(c => c.isHealthy).talisman}</strong></p>
          <p class="solved-tip">💡 탐정 영양 수첩에서 이 구역의 [원인 - 영향 - 해결방안]을 복습할 수 있습니다.</p>
        </div>
      ` : `
        <div class="quiz-question-box">
          <span class="question-badge">생사의 갈림길 선택</span>
          <p class="question-text">${area.question}</p>
        </div>

        <div class="choices-list" id="choicesContainer">
          ${area.choices.map((choice, i) => `
            <button type="button" class="choice-card-btn" data-choice-id="${choice.id}">
              <span class="choice-num">${i + 1}</span>
              <span class="choice-name">${choice.name}</span>
            </button>
          `).join('')}
        </div>
        <div id="choiceFeedbackBox" class="choice-feedback-box hidden"></div>
      `}
    `;

    if (!isAlreadySolved) {
      document.querySelectorAll('.choice-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const choiceId = e.currentTarget.dataset.choiceId;
          this.handleChoice(choiceId);
        });
      });
    }
  }

  handleChoice(choiceId) {
    if (!this.currentArea) return;
    const choice = this.currentArea.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const feedbackBox = document.getElementById('choiceFeedbackBox');
    const choicesList = document.getElementById('choicesContainer');

    if (choice.isHealthy) {
      // ==========================================
      // [올바른 건강 식품 선택! 정화 성공]
      // ==========================================
      if (window.horrorAudio) window.horrorAudio.playPurificationChime();

      this.solvedAreas.add(this.currentArea.id);
      this.talismans.push(choice.talisman);
      if (this.notebook) this.notebook.unlock(this.currentArea.id);

      // 핫스팟 정화 비주얼
      const hotspotEl = document.querySelector(`.kitchen-hotspot[data-area="${this.currentArea.id}"]`);
      if (hotspotEl) hotspotEl.classList.add('purified');

      this.modifySanity(15);
      this.triggerFlashEffect('gold');
      const isDoor = this.currentArea.id === 'door';
      const allFiveSolved = this.solvedAreas.size === 5;

      if (feedbackBox) {
        feedbackBox.className = 'choice-feedback-box success-feedback';
        const buttonText = (isDoor || allFiveSolved) ? '🚪 탈출문 열고 대탈출하기!' : '다음 단서 찾으러 가기';
        feedbackBox.innerHTML = `
          <div class="feedback-heading">🎉 생명의 정화 성공!</div>
          <p class="feedback-desc">${choice.feedback}</p>
          <div class="obtained-item">
            <span>부적 획득:</span> <strong>${choice.talisman}</strong>
          </div>
          <button type="button" class="ctrl-btn btn-primary" id="confirmNextBtn" style="margin-top: 12px; width: 100%; font-size: 1.05rem; padding: 12px;">
            ${buttonText}
          </button>
        `;
        feedbackBox.classList.remove('hidden');
        if (choicesList) choicesList.classList.add('disabled-choices');

        document.getElementById('confirmNextBtn').addEventListener('click', () => {
          this.closeInvestigate();
          if (isDoor || this.solvedAreas.size === 5) {
            setTimeout(() => this.triggerVictory(), 200);
          }
        });
      }

    } else {
      // ==========================================
      // [나쁜 정크푸드 선택! 공포의 페널티]
      // ==========================================
      if (window.horrorAudio) window.horrorAudio.playJumpScareSting();

      this.modifySanity(-20);
      this.triggerScreenShake();
      this.triggerFlashEffect('red');
      this.showToast(`⚠️ 나쁜 식품 선택! 독소와 공포로 정신력이 20 깎였습니다!`, 'danger');

      if (feedbackBox) {
        feedbackBox.className = 'choice-feedback-box danger-feedback';
        feedbackBox.innerHTML = `
          <div class="feedback-heading">💀 저주받은 선택!</div>
          <p class="feedback-desc">${choice.feedback}</p>
          <p class="hint-text">💡 왜 이 음식이 청소년 몸에 치명적인지 고민해보고 다시 선택하세요!</p>
        `;
        feedbackBox.classList.remove('hidden');
      }
    }

    this.updateStatusUI();
  }

  modifySanity(amount, triggerPulse = true) {
    this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity + amount));
    if (window.horrorAudio) {
      window.horrorAudio.setSanityHeartbeatRate(this.sanity);
    }
    this.updateStatusUI();

    if (triggerPulse && this.sanity <= 40) {
      if (this.vignetteOverlayEl) {
        this.vignetteOverlayEl.classList.add('heartbeat-pulse');
        setTimeout(() => this.vignetteOverlayEl.classList.remove('heartbeat-pulse'), 800);
      }
    }

    if (this.sanity <= 0) {
      this.triggerGameOver('정신력이 바닥났습니다... 편의점 정크푸드의 저주가 당신을 지배했습니다.');
    }
  }

  closeInvestigate() {
    if (this.investigateModalEl) {
      this.investigateModalEl.classList.remove('show');
    }
    const wasDoor = this.currentArea && this.currentArea.id === 'door';
    this.currentArea = null;

    // 5개 구역이 모두 정화되었거나 탈출문이 정화된 경우 즉시 대탈출 승리 화면 출력
    if (this.solvedAreas.size === 5 || (wasDoor && this.solvedAreas.has('door'))) {
      setTimeout(() => this.triggerVictory(), 250);
    }
  }

  updateStatusUI() {
    if (this.sanityBarEl) {
      this.sanityBarEl.style.width = `${this.sanity}%`;
      if (this.sanity <= 30) {
        this.sanityBarEl.className = 'sanity-bar-fill critical';
      } else if (this.sanity <= 60) {
        this.sanityBarEl.className = 'sanity-bar-fill warning';
      } else {
        this.sanityBarEl.className = 'sanity-bar-fill normal';
      }
    }

    if (this.sanityTextEl) {
      this.sanityTextEl.textContent = `${this.sanity}%`;
    }

    if (this.talismanSlotsEl) {
      this.talismanSlotsEl.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const slot = document.createElement('span');
        slot.className = `talisman-icon ${i < this.solvedAreas.size ? 'active' : 'inactive'}`;
        slot.textContent = i < this.solvedAreas.size ? '✨' : '⚪';
        slot.title = i < this.talismans.length ? this.talismans[i] : '미획득 영양 부적';
        this.talismanSlotsEl.appendChild(slot);
      }
    }

    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    if (!this.timerTextEl) return;
    const clamped = Math.max(0, this.timeLeft);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    this.timerTextEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (this.timeLeft <= 15 && this.timeLeft > 0) {
      this.timerTextEl.classList.add('urgent');
    } else {
      this.timerTextEl.classList.remove('urgent');
    }
  }

  triggerVictory() {
    this.gameState = 'VICTORY';
    clearInterval(this.gameClockTimer);
    if (this.investigateModalEl) {
      this.investigateModalEl.classList.remove('show');
    }
    if (window.horrorAudio) window.horrorAudio.playVictoryFanfare();

    // 탈출 소요 시간 계산
    const secondsTaken = Math.max(1, this.totalTime - this.timeLeft);
    const mins = Math.floor(secondsTaken / 60);
    const secs = secondsTaken % 60;
    this.lastRecord = {
      secondsTaken,
      timeStr: `${mins.toString().padStart(2, '0')}분 ${secs.toString().padStart(2, '0')}초`,
      sanity: this.sanity
    };

    if (this.victoryTimeTakenEl) this.victoryTimeTakenEl.textContent = this.lastRecord.timeStr;
    if (this.victorySanityEl) this.victorySanityEl.textContent = `${this.sanity}%`;
    if (this.playerTimeBadgeEl) this.playerTimeBadgeEl.textContent = `${this.lastRecord.timeStr} 탈출`;

    if (this.praiseQuoteTextEl) {
      if (secondsTaken <= 45) {
        this.praiseQuoteTextEl.innerHTML = `⚡ <strong>초고속 탈출! (${this.lastRecord.timeStr})</strong> "건강한 식생활을 실천할 수 있게 되었군요 ~" 👏`;
      } else {
        this.praiseQuoteTextEl.innerHTML = `"건강한 식생활을 실천할 수 있게 되었군요 ~"`;
      }
    }

    if (this.playerNameInputEl) {
      this.playerNameInputEl.value = '';
      this.playerNameInputEl.disabled = false;
    }
    if (this.saveScoreBtnEl) this.saveScoreBtnEl.disabled = false;
    if (this.registerSuccessMsgEl) this.registerSuccessMsgEl.classList.add('hidden');

    if (this.victoryModalEl) {
      this.victoryModalEl.classList.add('show');
    }
  }

  handleScoreSubmit() {
    if (!this.lastRecord) return;
    const rawName = this.playerNameInputEl ? this.playerNameInputEl.value.trim() : '';
    const name = rawName || '이름 없는 탐정';

    const entry = {
      id: Date.now(),
      name,
      secondsTaken: this.lastRecord.secondsTaken,
      timeStr: this.lastRecord.timeStr,
      sanity: this.lastRecord.sanity,
      registeredAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    let list = this.getLeaderboardData();
    list.push(entry);
    // 빠른 탈출 시간 순(오름차순), 동점 시 잔여 정신력 높은 순(내림차순)
    list.sort((a, b) => a.secondsTaken !== b.secondsTaken ? a.secondsTaken - b.secondsTaken : b.sanity - a.sanity);

    localStorage.setItem('kitchen_escape_leaderboard', JSON.stringify(list));

    if (this.registerSuccessMsgEl) {
      this.registerSuccessMsgEl.classList.remove('hidden');
    }
    if (this.playerNameInputEl) this.playerNameInputEl.disabled = true;
    if (this.saveScoreBtnEl) this.saveScoreBtnEl.disabled = true;

    if (window.horrorAudio) window.horrorAudio.playPurificationChime();
    this.showToast(`🏆 [${name}] 등록 완료! "건강한 식생활을 실천할 수 있게 되었군요 ~"`, 'success');

    // 1초 후 탈출 명단 모달 자동 열기
    setTimeout(() => this.openLeaderboard(), 800);
  }

  getLeaderboardData() {
    try {
      const data = localStorage.getItem('kitchen_escape_leaderboard');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  openLeaderboard() {
    const list = this.getLeaderboardData();
    this.renderLeaderboardTable(list);
    if (this.leaderboardModalEl) {
      this.leaderboardModalEl.classList.add('show');
    }
  }

  closeLeaderboard() {
    if (this.leaderboardModalEl) {
      this.leaderboardModalEl.classList.remove('show');
    }
  }

  resetLeaderboard() {
    if (confirm('⚠️ 다음 수업 반을 위해 등록된 모든 탈출 순위 명단을 초기화하시겠습니까?')) {
      localStorage.removeItem('kitchen_escape_leaderboard');
      this.renderLeaderboardTable([]);
      this.showToast('🗑️ 탈출 명단이 깨끗하게 초기화되었습니다.', 'info');
    }
  }

  renderLeaderboardTable(list) {
    if (!this.leaderboardContainerEl) return;

    if (!list || list.length === 0) {
      this.leaderboardContainerEl.innerHTML = `
        <div class="empty-leaderboard">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📜</div>
          <p>아직 등록된 탈출자가 없습니다.<br>부엌의 저주를 풀고 첫 번째 탈출 명예의 주인공이 되어보세요!</p>
        </div>
      `;
      return;
    }

    const rows = list.map((item, index) => {
      let rankBadge = `${index + 1}등`;
      let rankClass = '';
      if (index === 0) { rankBadge = '🥇 1등'; rankClass = 'rank-top-1'; }
      else if (index === 1) { rankBadge = '🥈 2등'; rankClass = 'rank-top-2'; }
      else if (index === 2) { rankBadge = '🥉 3등'; rankClass = 'rank-top-3'; }

      return `
        <tr>
          <td class="rank-cell ${rankClass}">${rankBadge}</td>
          <td class="rank-name">${item.name}</td>
          <td class="rank-time">${item.timeStr}</td>
          <td><span class="rank-praise-pill">✨ 건강한 식생활을 실천할 수 있게 되었군요 ~</span></td>
          <td><span style="color: #34d399; font-weight: 700;">${item.sanity}%</span></td>
          <td style="color: #94a3b8; font-size: 0.8rem;">${item.registeredAt || '-'}</td>
        </tr>
      `;
    }).join('');

    this.leaderboardContainerEl.innerHTML = `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>탈출자 (학번/이름)</th>
            <th>탈출 소요 시간</th>
            <th>식생활 실천 인증</th>
            <th>잔여 정신력</th>
            <th>등록 시간</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  triggerGameOver(reason) {
    this.gameState = 'GAMEOVER';
    clearInterval(this.gameClockTimer);
    if (this.investigateModalEl) {
      this.investigateModalEl.classList.remove('show');
    }
    if (window.horrorAudio) window.horrorAudio.playGameOver();

    const reasonEl = document.getElementById('gameOverReason');
    if (reasonEl) reasonEl.textContent = reason;

    if (this.gameOverModalEl) {
      this.gameOverModalEl.classList.add('show');
    }
  }

  triggerScreenShake() {
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 400);
  }

  triggerFlashEffect(type = 'red') {
    const flashEl = document.createElement('div');
    flashEl.className = `screen-flash flash-${type}`;
    document.body.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 450);
  }

  showToast(msg, type = 'info') {
    if (!this.feedbackToastEl) return;
    this.feedbackToastEl.textContent = msg;
    this.feedbackToastEl.className = `action-toast show toast-${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.feedbackToastEl.classList.remove('show');
    }, 2500);
  }
}

// 안전한 실행 바인딩
if (typeof window !== 'undefined') {
  window.EscapeRoomGame = EscapeRoomGame;
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new EscapeRoomGame();
});
