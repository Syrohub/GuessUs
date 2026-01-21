import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic Feedback Utility
 * Provides tactile feedback for game actions on supported devices
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

class HapticManager {
  private isNative: boolean;
  private isSupported: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isSupported = this.isNative || ('vibrate' in navigator);
  }

  /**
   * Trigger haptic feedback
   * @param type - Type of haptic feedback
   */
  async trigger(type: HapticType = 'light'): Promise<void> {
    if (!this.isSupported) return;

    try {
      if (this.isNative) {
        await this.triggerNative(type);
      } else {
        this.triggerWeb(type);
      }
    } catch (e) {
      // Silently fail - haptics are not critical
      console.debug('Haptic feedback failed:', e);
    }
  }

  private async triggerNative(type: HapticType): Promise<void> {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
    }
  }

  private triggerWeb(type: HapticType): void {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      success: [10, 50, 30],
      warning: [30, 30, 30],
      error: [50, 50, 50, 50, 50],
      selection: 5
    };

    navigator.vibrate(patterns[type]);
  }

  /**
   * Quick action feedback - for button presses
   */
  tap(): void {
    this.trigger('light');
  }

  /**
   * Success feedback - for correct answers
   */
  success(): void {
    this.trigger('success');
  }

  /**
   * Error/Skip feedback - for skipped words
   */
  error(): void {
    this.trigger('error');
  }

  /**
   * Warning feedback - for time running low
   */
  warning(): void {
    this.trigger('warning');
  }

  /**
   * Heavy impact - for game end, victory
   */
  victory(): void {
    this.trigger('heavy');
  }
}

// Singleton instance
export const haptics = new HapticManager();

// Convenience exports
export const triggerHaptic = (type: HapticType) => haptics.trigger(type);
export const hapticTap = () => haptics.tap();
export const hapticSuccess = () => haptics.success();
export const hapticError = () => haptics.error();
export const hapticWarning = () => haptics.warning();
export const hapticVictory = () => haptics.victory();
