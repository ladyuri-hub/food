/**
 * 탐정 영양 수첩 (Detective Nutrition Notebook) 모듈
 * 단서를 해결할 때마다 자동으로 채워지는 수업 정리 및 복습 시스템
 */

class NutritionNotebook {
  constructor() {
    this.modal = document.getElementById('notebookModal');
    this.container = document.getElementById('notebookContent');
    this.tabContainer = document.getElementById('notebookTabs');
    this.badgeCountEl = document.getElementById('unlockedCount');
    this.unlockedAreas = new Set(); // 푼 영역 ID 집합

    this.initEvents();
  }

  initEvents() {
    const openBtn = document.getElementById('openNotebookBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.open());
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

  open() {
    if (!this.modal) return;
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

  render() {
    if (!this.container || !window.ESCAPE_GAME_DATA) return;
    this.container.innerHTML = '';

    const areas = window.ESCAPE_GAME_DATA.areas;
    
    // 상단 진행도 알림
    const progressBanner = document.createElement('div');
    progressBanner.className = 'notebook-progress-banner';
    progressBanner.innerHTML = `
      <div class="progress-title">🕵️‍♂️ 청소년 식생활 진실 수첩 (${this.unlockedAreas.size} / 5개 구역 분석 완료)</div>
      <p class="progress-sub">공포의 부엌에서 밝혀낸 청소년기 식생활 문제의 원인, 영향, 올바른 건강 식품 해결책입니다.</p>
    `;
    this.container.appendChild(progressBanner);

    // 각 구역 카드 렌더링
    areas.forEach((area, idx) => {
      const isUnlocked = this.unlockedAreas.has(area.id);
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
            <span class="status-cleared-badge">✅ 정화 완료</span>
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
            <span class="status-locked-badge">어둠에 잠김</span>
          </div>
          <div class="locked-body">
            <p>부엌의 <strong>[${area.name}]</strong> 구역을 조사하여 건강한 음식을 선택하면 이 페이지의 진실이 밝혀집니다!</p>
          </div>
        `;
      }

      this.container.appendChild(card);
    });
  }
}

if (typeof window !== 'undefined') {
  window.NutritionNotebook = NutritionNotebook;
}
