import { DEFAULT_WORD_DATABASE, Category, Language } from '../words';

// GitHub Raw URLs for remote dictionary
const GITHUB_USER = 'Syrohub';
const GITHUB_REPO = 'guessus-dictionary';
const BRANCH = 'main';

const VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/remote-data/version.json`;
const WORDS_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/remote-data/words.json`;

// localStorage keys
const STORAGE_KEY_WORDS = 'guessus_remote_words';
const STORAGE_KEY_VERSION = 'guessus_words_version';

// Timeouts
const VERSION_CHECK_TIMEOUT = 3000; // 3 seconds
const WORDS_DOWNLOAD_TIMEOUT = 10000; // 10 seconds

type WordDatabase = Record<Language, Record<Category, string[]>>;

interface VersionInfo {
  version: string;
  updatedAt: string;
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      cache: 'no-store' // Always check for fresh version
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get cached word database from localStorage
 */
function getCachedWords(): WordDatabase | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_WORDS);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to read cached words:', e);
  }
  return null;
}

/**
 * Get cached version from localStorage
 */
function getCachedVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_VERSION);
  } catch (e) {
    console.warn('Failed to read cached version:', e);
  }
  return null;
}

/**
 * Save words and version to localStorage
 */
function saveToCache(words: WordDatabase, version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
    localStorage.setItem(STORAGE_KEY_VERSION, version);
    console.log(`Dictionary cached (version ${version})`);
  } catch (e) {
    console.warn('Failed to cache dictionary:', e);
  }
}

/**
 * Check for updates and download new dictionary if available
 * This should be called on app startup (non-blocking)
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    // 1. Fetch version info
    const versionResponse = await fetchWithTimeout(VERSION_URL, VERSION_CHECK_TIMEOUT);
    
    if (!versionResponse.ok) {
      console.log('Version check failed:', versionResponse.status);
      return false;
    }
    
    const versionInfo: VersionInfo = await versionResponse.json();
    const cachedVersion = getCachedVersion();
    
    console.log(`Remote version: ${versionInfo.version}, Cached: ${cachedVersion || 'none'}`);
    
    // 2. Compare versions
    if (versionInfo.version === cachedVersion) {
      console.log('Dictionary is up to date');
      return false;
    }
    
    // 3. Download new dictionary
    console.log('Downloading new dictionary...');
    const wordsResponse = await fetchWithTimeout(WORDS_URL, WORDS_DOWNLOAD_TIMEOUT);
    
    if (!wordsResponse.ok) {
      console.log('Words download failed:', wordsResponse.status);
      return false;
    }
    
    const newWords: WordDatabase = await wordsResponse.json();
    
    // 4. Validate the downloaded data has expected structure
    if (!newWords.en || !newWords.ru || !newWords.es || !newWords.ua) {
      console.warn('Downloaded dictionary has invalid structure');
      return false;
    }
    
    // 5. Save to cache
    saveToCache(newWords, versionInfo.version);
    console.log('Dictionary updated successfully');
    return true;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Version check timed out');
    } else {
      console.log('Update check failed:', error);
    }
    return false;
  }
}

/**
 * Get the word database to use in the game
 * Returns cached remote dictionary if available, otherwise falls back to default
 */
export function getWordDatabase(): WordDatabase {
  const cached = getCachedWords();
  
  if (cached) {
    console.log('Using cached remote dictionary');
    return cached;
  }
  
  console.log('Using default built-in dictionary');
  return DEFAULT_WORD_DATABASE;
}

/**
 * Initialize dictionary system
 * Call this on app startup to begin background update check
 */
export function initializeDictionary(): void {
  // Start update check in background (non-blocking)
  checkForUpdates().then(updated => {
    if (updated) {
      console.log('Dictionary was updated. New words will be used in next game.');
    }
  }).catch(err => {
    console.log('Dictionary initialization error:', err);
  });
}

/**
 * Force refresh the dictionary (for manual refresh button if needed)
 */
export async function forceRefreshDictionary(): Promise<boolean> {
  // Clear cached version to force re-download
  try {
    localStorage.removeItem(STORAGE_KEY_VERSION);
  } catch (e) {
    console.warn('Failed to clear version cache:', e);
  }
  
  return checkForUpdates();
}

/**
 * Get current dictionary version
 */
export function getDictionaryVersion(): string {
  return getCachedVersion() || 'built-in';
}
