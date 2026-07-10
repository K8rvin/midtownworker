import Phaser from 'phaser';
import { AudioSettings, type AudioSettingsData } from './AudioSettings';

export type SfxType =
  | 'shoot'
  | 'punch'
  | 'hit'
  | 'ui'
  | 'quest'
  | 'explode'
  | 'siren'
  | 'buy'
  | 'alert'
  | 'victory'
  | 'footstep'
  | 'gas'
  | 'shop_chime'
  | 'casino';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicLfo: OscillatorNode | null = null;
  private settings: AudioSettingsData = AudioSettings.load();
  private engineRunning = false;
  private musicRunning = false;

  getSettings(): AudioSettingsData {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettingsData>): void {
    this.settings = { ...this.settings, ...partial };
    AudioSettings.save(this.settings);
    this.applyGains();
  }

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playSfx(type: SfxType): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    const vol = 0.22 * this.settings.sfxVolume;

    switch (type) {
      case 'shoot':
        this.tone(ctx, 1200, 0.04, 'square', vol * 0.9, 320);
        this.tone(ctx, 280, 0.08, 'triangle', vol * 0.45, 120);
        this.noiseBurst(ctx, 0.05, vol * 0.55, 1200);
        break;
      case 'punch':
        this.tone(ctx, 120, 0.1, 'triangle', vol * 1.2, 60);
        break;
      case 'hit':
        this.tone(ctx, 200, 0.12, 'sawtooth', vol, 80);
        break;
      case 'ui':
        this.tone(ctx, 520, 0.05, 'sine', vol * 0.6, 680);
        break;
      case 'quest':
        this.tone(ctx, 440, 0.1, 'sine', vol, 0);
        this.tone(ctx, 660, 0.15, 'sine', vol, 0.12);
        break;
      case 'explode':
        this.noiseBurst(ctx, 0.35, vol * 1.5, 80);
        this.tone(ctx, 90, 0.3, 'sawtooth', vol, 40);
        break;
      case 'siren':
        this.sirenWail(ctx, 0.5, vol);
        break;
      case 'buy':
        this.tone(ctx, 330, 0.08, 'sine', vol, 495);
        this.tone(ctx, 495, 0.12, 'sine', vol * 0.8, 0.1);
        break;
      case 'alert':
        this.tone(ctx, 280, 0.15, 'square', vol * 0.7, 220);
        break;
      case 'victory':
        this.tone(ctx, 392, 0.12, 'sine', vol, 523);
        this.tone(ctx, 523, 0.12, 'sine', vol, 659);
        this.tone(ctx, 659, 0.25, 'sine', vol * 0.9, 784);
        break;
      case 'footstep':
        this.noiseBurst(ctx, 0.03, vol * 0.25, 200);
        break;
      case 'gas':
        this.noiseBurst(ctx, 0.18, vol * 0.35, 400);
        this.tone(ctx, 180, 0.2, 'triangle', vol * 0.4, 90);
        break;
      case 'shop_chime':
        this.tone(ctx, 880, 0.08, 'sine', vol * 0.55, 0);
        this.tone(ctx, 1175, 0.12, 'sine', vol * 0.45, 0.08);
        break;
      case 'casino':
        this.tone(ctx, 523, 0.06, 'square', vol * 0.4, 659);
        this.tone(ctx, 659, 0.06, 'square', vol * 0.35, 784);
        this.tone(ctx, 784, 0.1, 'square', vol * 0.3, 0.12);
        break;
    }
    void t;
  }

  startMusic(): void {
    if (this.musicRunning || this.settings.muted || this.settings.musicVolume <= 0) return;
    const ctx = this.ensureContext();
    this.stopMusic();

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = 55;
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 8;
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(this.musicGain!);

    osc.start();
    lfo.start();
    this.musicOsc = osc;
    this.musicLfo = lfo;
    this.musicRunning = true;
  }

  stopMusic(): void {
    this.musicOsc?.stop();
    this.musicOsc?.disconnect();
    this.musicLfo?.stop();
    this.musicLfo?.disconnect();
    this.musicOsc = null;
    this.musicLfo = null;
    this.musicRunning = false;
  }

  startEngine(): void {
    if (this.engineRunning) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
    this.engineRunning = true;
  }

  updateEngine(speed: number, maxSpeed: number): void {
    if (!this.engineOsc || !this.engineGain || !this.ctx) return;
    if (this.settings.muted || this.settings.sfxVolume <= 0) {
      this.engineGain.gain.value = 0;
      return;
    }
    const ratio = Phaser.Math.Clamp(Math.abs(speed) / maxSpeed, 0, 1);
    if (ratio < 0.05) {
      this.stopEngine();
      return;
    }
    if (!this.engineRunning) this.startEngine();
    const base = 55 + ratio * 120;
    this.engineOsc.frequency.setTargetAtTime(base, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.04 * ratio * this.settings.sfxVolume, this.ctx.currentTime, 0.05);
  }

  stopEngine(): void {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    this.engineGain = null;
    this.engineRunning = false;
  }

  shutdown(): void {
    this.stopEngine();
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private applyGains(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    const m = this.settings.muted ? 0 : 1;
    this.masterGain.gain.value = m;
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.musicGain.gain.value = this.settings.musicVolume * 0.35;
    if (this.settings.muted || this.settings.musicVolume <= 0) this.stopMusic();
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFreq = 0
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 40), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  private noiseBurst(ctx: AudioContext, duration: number, volume: number, lpFreq = 0): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    let node: AudioNode = source;
    if (lpFreq > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lpFreq;
      source.connect(filter);
      node = filter;
    }
    node.connect(gain);
    gain.connect(this.sfxGain!);
    source.start();
  }

  private sirenWail(ctx: AudioContext, duration: number, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + duration / 2);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + duration);
    gain.gain.value = volume * 0.5;
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export function getAudio(scene: Phaser.Scene): AudioManager {
  let audio = scene.registry.get('audio') as AudioManager | undefined;
  if (!audio) {
    audio = new AudioManager();
    scene.registry.set('audio', audio);
  }
  return audio;
}