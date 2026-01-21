/**
 * Utility helper functions
 */

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Debounce function - limits how often a function can fire
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 */
export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

/**
 * Throttle function - ensures function fires at most once per interval
 * @param fn Function to throttle
 * @param limit Time limit in milliseconds
 */
export const throttle = <T extends (...args: any[]) => void>(fn: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

/**
 * Safe localStorage get with fallback
 */
export const getFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to get ${key} from localStorage:`, e);
    return fallback;
  }
};

/**
 * Safe localStorage set with error handling
 */
export const saveToStorage = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
};

/**
 * Debounced localStorage save (300ms delay)
 */
export const debouncedSaveToStorage = debounce((key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}, 300);

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Clamp number between min and max
 */
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Format number with + sign for positive
 */
export const formatScore = (score: number): string => {
  return score > 0 ? `+${score}` : String(score);
};
