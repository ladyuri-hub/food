/**
 * Web Audio API 기반 공포 방탈출 오디오 시스템
 * 별도의 외부 음원 파일 없이 브라우저 자체 음파 합성으로 동작
 * (학교 교실 환경에서도 100% 지연 및 방화벽 차단 없이 재생)
 */

class HorrorAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.heartbeatTimer = null;
    this.heartbeatInterval = 1200; // ms
    this.initAudioUnlock();
  }

  initAudioUnlock() {
    const unlock = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAmbient();
      this.stopHeartbeat();
    }
    return this.isMuted;
  }

  /**
   * 스산한 부엌 배경 앰비언스 드론음 시작
   */
  startAmbient() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || this.ambientOsc) return;

    try {
      const now = ctx.currentTime;
      this.ambientOsc = ctx.createOscillator();
      this.ambientGain = ctx.createGain();

      // 저음의 으스스한 톱니파 + 로우패스 필터
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 140;

      this.ambientOsc.type = 'sawtooth';
      this.ambientOsc.frequency.setValueAtTime(55, now); // A1 note

      // 서서히 페이드인
      this.ambientGain.gain.setValueAtTime(0.001, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.08, now + 3);

      this.ambientOsc.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);

      this.ambientOsc.start(now);
    } catch (e) {
      console.warn('Ambient audio start prevented', e);
    }
  }

  stopAmbient() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch (e) {}
      this.ambientOsc = null;
    }
  }

  /**
   * 심장 박동음 (정신력이 낮을수록 빠르게 뜀)
   */
  playHeartbeat() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 쿵 (제1 심음)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // 쾅 (제2 심음)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(70, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.3);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.32);
  }

  setSanityHeartbeatRate(sanity) {
    if (sanity <= 35) {
      this.heartbeatInterval = 650; // 매우 빠름 (위험)
    } else if (sanity <= 60) {
      this.heartbeatInterval = 950;
    } else {
      this.heartbeatInterval = 1400; // 안정
    }
  }

  startHeartbeatLoop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.playHeartbeat();
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 단서 클릭 시 삐걱거리는 문 / 금속 상호작용음
   */
  playCreak() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.08);
    osc.frequency.linearRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * 정크푸드/나쁜 선택 시: 불협화음 공포 점프스케어 찌르는 음
   */
  playJumpScareSting() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 불협화음 삼음 (C#4, D4, G#4)
    const freqs = [277.18, 293.66, 415.30];

    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  /**
   * 건강 식품/올바른 선택 시: 성스러운 정화의 종소리 (Sanctuary Chime)
   */
  playPurificationChime() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 맑은 펜타토닉 아르페지오 (C5, E5, G5, B5, C6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.07;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * 탈출문 사슬 풀리는 소리
   */
  playChainRattle() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, now + i * 0.08);

      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.12);
    }
  }

  /**
   * 최종 탈출 성공 승리 팡파르
   */
  playVictoryFanfare() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopAmbient();
    this.stopHeartbeat();

    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.15 }, // E5
      { f: 783.99, d: 0.15 }, // G5
      { f: 1046.50, d: 0.45 } // C6
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.f;

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.d);

      t += note.d * 0.95;
    });
  }

  /**
   * 게임 오버 사운드
   */
  playGameOver() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopAmbient();
    this.stopHeartbeat();

    const now = ctx.currentTime;
    const notes = [220, 207.65, 196, 174.61]; // A3, G#3, G3, F3

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.25;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

if (typeof window !== 'undefined') {
  window.horrorAudio = new HorrorAudioEngine();
}
