/**
 * 탐정 영양 수첩 및 수업 내용 정리 (Detective Nutrition Notebook & Worksheet Guide) 모듈
 * 수업이 끝난 후 학생들이 학습지를 체계적으로 정리할 수 있는 마스터시트 시스템
 */

class NutritionNotebook {
  constructor() {
    this.modal = document.getElementById('notebookModal');
    this.container = document.getElementById('notebookContent');
    this.badgeCountEl = document.getElementById('unlockedCount');
    this.unlockedAreas = new Set();
    this.currentViewMode = 'table'; // 'table' (학습지 요약표) or 'cards' (구역별 카드)
    this.forceShowAll = false; // 학습지 정리용 전체 공개 모드

    this.initEvents();
  }

  initEvents() {
    const openBtn = document.getElementById('openNotebookBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.open(false));
    }

    const closeBtns = document.querySelectorAll('.close-notebook-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  }

  open(forceShowAll = false) {
    if (!this.modal) return;
    if (forceShowAll) {
      this.forceShowAll = true;
    }
    this.render();
    this.modal.classList.add('show');
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
  }

  unlock(areaId) {
    this.unlockedAreas.add(areaId);
    if (this.badgeCountEl) {
      this.badgeCountEl.textContent = `${this.unlockedAreas.size}/5`;
    }
  }

  toggleViewMode(mode) {
    this.currentViewMode = mode;
    this.render();
  }

  toggleForceShowAll() {
    this.forceShowAll = !this.forceShowAll;
    this.render();
    if (window.game) {
      window.game.showToast(
        this.forceShowAll ? '🔓 학습지 작성을 위해 전체 수업 내용이 공개되었습니다.' : '🔒 게임 진행도 모드로 전환되었습니다.',
        'info'
      );
    }
  }

  copyWorksheetText() {
    if (!window.ESCAPE_GAME_DATA) return;
    const areas = window.ESCAPE_GAME_DATA.areas;
    let text = `[중학교 1학년 기술·가정: 청소년기 식생활 문제 정리 학습지]\n\n`;
    areas.forEach((area, i) => {
      text += `■ ${i + 1}. ${area.topic} (${area.problemTitle})\n`;
      text += ` - [발생 원인]: ${area.curriculum.cause}\n`;
      text += ` - [미치는 영향]: ${area.curriculum.impact}\n`;
      text += ` - [해결 및 실천]: ${area.curriculum.solution}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      if (window.game) {
        window.game.showToast('📋 학습지 정리 내용이 클립보드에 복사되었습니다! (Ctrl+V로 붙여넣기 가능)', 'success');
      } else {
        alert('📋 학습지 내용이 복사되었습니다!');
      }
    }).catch(() => {
      alert('복사 권한이 없어 수동으로 내용을 확인해 주세요.');
    });
  }

  render() {
    if (!this.container || !window.ESCAPE_GAME_DATA) return;
    this.container.innerHTML = '';

    const areas = window.ESCAPE_GAME_DATA.areas;
    const isFullRevealed = this.forceShowAll || this.unlockedAreas.size === 5;

    // 상단 네비게이션 & 학습지 조작 툴바
    const toolbar = document.createElement('div');
    toolbar.className = 'worksheet-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-left">
        <button type="button" class="mode-tab-btn ${this.currentViewMode === 'table' ? 'active' : ''}" id="viewTableBtn">
          📋 학습지 요약표 보기
        </button>
        <button type="button" class="mode-tab-btn ${this.currentViewMode === 'cards' ? 'active' : ''}" id="viewCardsBtn">
          🗂️ 단서별 상세 카드 보기
        </button>
      </div>
      <div class="toolbar-right">
        <button type="button" class="action-subtle-btn" id="toggleAllBtn">
          ${isFullRevealed ? '🔒 게임 진행도 기준 보기' : '🔓 전체 정답 공개 (학습지 작성용)'}
        </button>
        <button type="button" class="action-subtle-btn btn-copy" id="copyWorksheetBtn" title="학습지 텍스트 전체 복사">
          📋 텍스트 복사
        </button>
      </div>
    `;
    this.container.appendChild(toolbar);

    // 이벤트 바인딩
    toolbar.querySelector('#viewTableBtn').addEventListener('click', () => this.toggleViewMode('table'));
    toolbar.querySelector('#viewCardsBtn').addEventListener('click', () => this.toggleViewMode('cards'));
    toolbar.querySelector('#toggleAllBtn').addEventListener('click', () => this.toggleForceShowAll());
    toolbar.querySelector('#copyWorksheetBtn').addEventListener('click', () => this.copyWorksheetText());

    // 상단 진행 배너
    const progressBanner = document.createElement('div');
    progressBanner.className = 'notebook-progress-banner';
    progressBanner.innerHTML = `
      <div class="progress-title">
        📝 중1 기술·가정: 청소년기 식생활 문제 핵심 정리 
        <span class="badge-solved">(${this.unlockedAreas.size} / 5개 구역 분석 완료)</span>
      </div>
      <p class="progress-sub">
        수업이 끝난 후 아래 정리된 내용을 바탕으로 <strong>개인 학습지</strong>를 작성하세요.
        ${!isFullRevealed ? ' (오른쪽 상단의 [🔓 전체 정답 공개]를 누르면 모든 구역의 해설을 볼 수 있습니다)' : ' <strong>[전체 내용 공개 모드]</strong>'}
      </p>
    `;
    this.container.appendChild(progressBanner);

    // 뷰 모드에 따른 렌더링
    if (this.currentViewMode === 'table') {
      this.renderTableView(areas, isFullRevealed);
    } else {
      this.renderCardsView(areas, isFullRevealed);
    }
  }

  renderTableView(areas, isFullRevealed) {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'worksheet-table-wrap';

    const rows = areas.map((area, idx) => {
      const isUnlocked = isFullRevealed || this.unlockedAreas.has(area.id);

      if (isUnlocked) {
        return `
          <tr>
            <td class="ws-topic-cell">
              <span class="ws-icon">${area.icon}</span>
              <strong>${idx + 1}. ${area.topic}</strong>
              <span class="ws-badge-ok">정화 완료</span>
            </td>
            <td class="ws-cause-cell">${area.curriculum.cause}</td>
            <td class="ws-impact-cell">${area.curriculum.impact}</td>
            <td class="ws-sol-cell">${area.curriculum.solution}</td>
          </tr>
        `;
      } else {
        return `
          <tr class="ws-row-locked">
            <td class="ws-topic-cell">
              <span class="ws-icon">🔒</span>
              <strong>${idx + 1}. ${area.topic}</strong>
              <span class="ws-badge-lock">미해결</span>
            </td>
            <td colspan="3" class="ws-locked-content">
              부엌의 <strong>[${area.name}]</strong> 단서를 풀거나, 상단의 <strong>[🔓 전체 정답 공개]</strong> 버튼을 누르면 학습지 정리 내용이 표시됩니다.
            </td>
          </tr>
        `;
      }
    }).join('');

    tableWrap.innerHTML = `
      <table class="worksheet-summary-table">
        <thead>
          <tr>
            <th style="width: 18%;">식생활 문제 영역</th>
            <th style="width: 26%;">🔴 발생 원인 (Cause)</th>
            <th style="width: 28%;">⚠️ 청소년 몸에 미치는 영향 (Impact)</th>
            <th style="width: 28%;">💚 올바른 건강 식품 및 실천 (Solution)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    this.container.appendChild(tableWrap);
  }

  renderCardsView(areas, isFullRevealed) {
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'notebook-cards-grid';

    areas.forEach((area, idx) => {
      const isUnlocked = isFullRevealed || this.unlockedAreas.has(area.id);
      const card = document.createElement('div');
      card.className = `notebook-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      if (isUnlocked) {
        card.innerHTML = `
          <div class="notebook-card-header">
            <div class="header-left">
              <span class="card-icon">${area.icon}</span>
              <div class="card-title-wrap">
                <span class="area-tag">[단서 #${idx + 1}] ${area.name}</span>
                <h3 class="card-problem-title">${area.problemTitle}</h3>
              </div>
            </div>
            <span class="status-cleared-badge">✅ 정리 완료</span>
          </div>
          
          <div class="notebook-card-body">
            <div class="notebook-section cause">
              <div class="section-label">🔴 발생 원인 (Cause)</div>
              <p class="section-text">${area.curriculum.cause}</p>
            </div>

            <div class="notebook-section impact">
              <div class="section-label">⚠️ 청소년 몸에 미치는 악영향 (Impact)</div>
              <p class="section-text">${area.curriculum.impact}</p>
            </div>

            <div class="notebook-section solution">
              <div class="section-label">💚 올바른 건강 식품 및 해결책 (Healthy Solution)</div>
              <p class="section-text">${area.curriculum.solution}</p>
            </div>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div class="notebook-card-header locked-header">
            <div class="header-left">
              <span class="card-icon">🔒</span>
              <div class="card-title-wrap">
                <span class="area-tag">[미해결 단서 #${idx + 1}]</span>
                <h3 class="card-problem-title">${area.topic}</h3>
              </div>
            </div>
            <span class="status-locked-badge">미해결</span>
          </div>
          <div class="locked-body">
            <p>부엌의 <strong>[${area.name}]</strong> 구역을 조사하거나, 상단의 <strong>[🔓 전체 정답 공개]</strong> 버튼을 누르면 학습지 정리 내용이 열립니다!</p>
          </div>
        `;
      }

      cardsContainer.appendChild(card);
    });

    this.container.appendChild(cardsContainer);
  }
}

if (typeof window !== 'undefined') {
  window.NutritionNotebook = NutritionNotebook;
}
