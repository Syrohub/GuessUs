import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capgo/native-audio';
import type { SoundType } from '../types';

/**
 * Sound paths configuration
 */
const SOUNDS: Record<SoundType, string> = {
  correct: 'sounds/correct.wav',
  skip: 'sounds/skip.wav',
  tick: 'sounds/tick.wav',
  timeup: 'sounds/timeup.wav',
  win: 'sounds/win.wav',
  ready: 'sounds/ready.wav'
};

/**
 * Sound Manager Class
 * Handles audio playback with native support for iOS (works in silent mode)
 */
class SoundManager {
  private initialized: boolean = false;
  private isNative: boolean = false;
  private webAudioContext: AudioContext | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  public async unlock() {
    if (this.initialized) return;
    
    try {
      if (this.isNative) {
        // Preload all sounds with native audio - ignoreSilent is true by default
        await Promise.all(
          (Object.keys(SOUNDS) as SoundType[]).map(async (type) => {
            try {
              await NativeAudio.preload({
                assetId: type,
                assetPath: SOUNDS[type],
                audioChannelNum: 1,
                isUrl: false,
                volume: 1.0
              });
            } catch (e) {
              console.log(`Failed to preload ${type}:`, e);
            }
          })
        );
        console.log('Native audio initialized with silent mode support');
      } else {
        // Web fallback using Web Audio API
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.webAudioContext = new AudioContextClass();
          if (this.webAudioContext.state === 'suspended') {
            await this.webAudioContext.resume();
          }
        }
      }
      this.initialized = true;
    } catch (e) {
      console.error('Audio initialization failed:', e);
    }
  }

  public play(type: SoundType) {
    if (!this.initialized) {
      this.unlock().then(() => this.playSound(type));
    } else {
      this.playSound(type);
    }
  }

  private playSound(type: SoundType) {
    try {
      if (this.isNative) {
        // Native audio - works in silent mode!
        NativeAudio.play({ assetId: type }).catch(e => {
          console.log(`Play ${type} failed:`, e);
        });
      } else {
        // Web fallback - simple beep
        this.playWebSound(type);
      }
    } catch (e) {
      console.error('Sound play error:', e);
    }
  }

  private playWebSound(type: SoundType) {
    if (!this.webAudioContext) return;
    
    const now = this.webAudioContext.currentTime;
    const osc = this.webAudioContext.createOscillator();
    const gain = this.webAudioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.webAudioContext.destination);
    
    const frequencies: Record<SoundType, number> = {
      correct: 1200,
      skip: 300,
      tick: 800,
      timeup: 400,
      win: 600,
      ready: 880
    };
    
    osc.frequency.value = frequencies[type];
    osc.type = type === 'tick' ? 'square' : 'sine';
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// Singleton instance
export const soundManager = new SoundManager();
