/**
 * Firebase Analytics & Crashlytics integration for GuessUs
 * 
 * Events tracked:
 * - game_start: New game started
 * - game_end: Game completed
 * - word_guessed: Word was guessed correctly
 * - word_skipped: Word was skipped
 * - purchase_initiated: User started a purchase
 * - purchase_completed: Purchase successful
 * - category_selected: Category chosen for game
 * - settings_changed: Settings modified
 */

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { APP_VARIANT } from '../config';

// Track initialization state
let isInitialized = false;

/**
 * Initialize Firebase Analytics and Crashlytics
 */
export async function initializeAnalytics(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Analytics] Not native platform, skipping initialization');
    return;
  }

  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  try {
    // Enable analytics collection
    await FirebaseAnalytics.setEnabled({ enabled: true });
    
    // Enable crashlytics collection
    await FirebaseCrashlytics.setEnabled({ enabled: true });
    
    // Set user property for app variant (family/adult)
    await FirebaseAnalytics.setUserProperty({
      key: 'app_variant',
      value: APP_VARIANT
    });

    isInitialized = true;
    console.log('[Analytics] Firebase initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize Firebase:', error);
    logError(error as Error, { context: 'analytics_init' });
  }
}

// ============================================
// Analytics Events
// ============================================

interface GameStartParams {
  categories: string[];
  playersCount: number;
  teamCount: number;
  targetScore: number;
  roundDuration: number;
}

/**
 * Log game_start event
 */
export async function logGameStart(params: GameStartParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'game_start',
      params: {
        categories: params.categories.join(','),
        players_count: params.playersCount,
        team_count: params.teamCount,
        target_score: params.targetScore,
        round_duration: params.roundDuration
      }
    });
    console.log('[Analytics] game_start logged');
  } catch (error) {
    console.error('[Analytics] Failed to log game_start:', error);
  }
}

interface GameEndParams {
  winner: string;
  totalScore: number;
  durationSeconds: number;
  teamCount: number;
  mvp?: string;
}

/**
 * Log game_end event
 */
export async function logGameEnd(params: GameEndParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'game_end',
      params: {
        winner: params.winner,
        total_score: params.totalScore,
        duration_seconds: params.durationSeconds,
        team_count: params.teamCount,
        mvp: params.mvp || 'unknown'
      }
    });
    console.log('[Analytics] game_end logged');
  } catch (error) {
    console.error('[Analytics] Failed to log game_end:', error);
  }
}

interface WordEventParams {
  word: string;
  category: string;
  teamName: string;
  roundNumber: number;
}

/**
 * Log word_guessed event
 */
export async function logWordGuessed(params: WordEventParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'word_guessed',
      params: {
        word: params.word,
        category: params.category,
        team_name: params.teamName,
        round_number: params.roundNumber
      }
    });
  } catch (error) {
    console.error('[Analytics] Failed to log word_guessed:', error);
  }
}

/**
 * Log word_skipped event
 */
export async function logWordSkipped(params: WordEventParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'word_skipped',
      params: {
        word: params.word,
        category: params.category,
        team_name: params.teamName,
        round_number: params.roundNumber
      }
    });
  } catch (error) {
    console.error('[Analytics] Failed to log word_skipped:', error);
  }
}

interface PurchaseParams {
  productId: string;
  price?: string;
  currency?: string;
}

/**
 * Log purchase_initiated event
 */
export async function logPurchaseInitiated(params: PurchaseParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'purchase_initiated',
      params: {
        product_id: params.productId,
        price: params.price || 'unknown',
        currency: params.currency || 'USD'
      }
    });
    console.log('[Analytics] purchase_initiated logged:', params.productId);
  } catch (error) {
    console.error('[Analytics] Failed to log purchase_initiated:', error);
  }
}

/**
 * Log purchase_completed event
 */
export async function logPurchaseCompleted(params: PurchaseParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'purchase',
      params: {
        product_id: params.productId,
        price: params.price || 'unknown',
        currency: params.currency || 'USD',
        success: true
      }
    });
    console.log('[Analytics] purchase logged:', params.productId);
  } catch (error) {
    console.error('[Analytics] Failed to log purchase:', error);
  }
}

interface CategorySelectedParams {
  category: string;
  isPremium: boolean;
}

/**
 * Log category_selected event
 */
export async function logCategorySelected(params: CategorySelectedParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'category_selected',
      params: {
        category: params.category,
        is_premium: params.isPremium
      }
    });
  } catch (error) {
    console.error('[Analytics] Failed to log category_selected:', error);
  }
}

interface SettingsChangedParams {
  setting: 'theme' | 'language' | 'sound' | 'word_language' | 'round_duration' | 'target_score';
  value: string;
}

/**
 * Log settings_changed event
 */
export async function logSettingsChanged(params: SettingsChangedParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'settings_changed',
      params: {
        setting_name: params.setting,
        setting_value: params.value
      }
    });
  } catch (error) {
    console.error('[Analytics] Failed to log settings_changed:', error);
  }
}

/**
 * Log screen view
 */
export async function logScreenView(screenName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseAnalytics.setCurrentScreen({
      screenName,
      screenClassOverride: screenName
    });
  } catch (error) {
    console.error('[Analytics] Failed to log screen view:', error);
  }
}

// ============================================
// Crashlytics
// ============================================

/**
 * Log non-fatal error to Crashlytics
 */
export async function logError(error: Error, context?: Record<string, string>): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.error('[Crashlytics] Error:', error, context);
    return;
  }

  try {
    // Set custom keys for context
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        await FirebaseCrashlytics.setCustomKey({ key, value, type: 'string' });
      }
    }

    // Record exception
    await FirebaseCrashlytics.recordException({
      message: error.message,
      stacktrace: error.stack
    });
    console.log('[Crashlytics] Error logged:', error.message);
  } catch (e) {
    console.error('[Crashlytics] Failed to log error:', e);
  }
}

/**
 * Log custom message to Crashlytics
 */
export async function logMessage(message: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseCrashlytics.log({ message });
  } catch (error) {
    console.error('[Crashlytics] Failed to log message:', error);
  }
}

/**
 * Set user ID for Crashlytics (and Analytics)
 */
export async function setUserId(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseCrashlytics.setUserId({ userId });
    await FirebaseAnalytics.setUserId({ userId });
    console.log('[Analytics] User ID set:', userId);
  } catch (error) {
    console.error('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * Force crash for testing (DEBUG ONLY)
 */
export async function testCrash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('[Crashlytics] Test crash - not on native platform');
    return;
  }

  try {
    await FirebaseCrashlytics.crash({ message: 'Test crash from GuessUs' });
  } catch (error) {
    console.error('[Crashlytics] Crash test failed:', error);
  }
}
