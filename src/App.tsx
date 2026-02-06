import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Play, BookOpen, ChevronLeft, Check, X, Trophy, Users, AlertCircle, Trash2, Calendar, Hand, Moon, Sun, LogOut, AlertTriangle, CheckCircle, Target, Volume2, Languages, UserPlus, User, Pause, Home, FastForward, GripVertical, Settings as SettingsIcon, Lock, ShoppingBag, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capgo/native-audio';
import { TRANSLATIONS } from './translations';
import { ErrorBoundary } from './components/ErrorBoundary';
import { haptics } from './utils/haptics';
import { initializeDictionary, getWordDatabase } from './utils/remoteDictionary';
import { CONFIG, APP_VARIANT } from './config';
import { Category } from './words';
import { 
  initializePurchases, 
  purchaseProduct, 
  restorePurchases, 
  getOwnedCategoriesFromPurchases,
  type ProductId as IAPProductId 
} from './utils/purchases';

// --- Types ---

const APP_VERSION = "1.9.0";
type GameScreenState = 'start' | 'settings' | 'game' | 'preRound' | 'lastWord' | 'verification' | 'roundResult' | 'winner' | 'history' | 'rules';
type Language = 'en' | 'es' | 'ua' | 'ru';
type Theme = 'dark' | 'light';

interface Player {
  id: string;
  name: string;
  score: number;
  guessedCount?: number;
  turnsPlayed?: number;
}

interface Team {
  id: string;
  name: string;
  score: number;
  players: Player[];
  nextPlayerIndex: number; 
}

interface GameSettings {
  teams: Team[];
  targetScore: number;
  roundDuration: number;
  lastWordDuration: number;
  categories: Category[]; 
  penaltyForSkip: boolean;
  soundEnabled: boolean;
  uiLanguage: Language;
  wordLanguage: Language;
  theme: Theme;
}

interface HistoryItem {
  id: string;
  date: string;
  winner: string;
  teamCount: number;
  score: number;
  mvp: string;
  teams?: Team[];
}

interface RoundWord {
  word: string;
  status: 'guessed' | 'skipped';
}

// --- Monetization Types ---
type AdultProductId = 'dirty' | 'extreme' | 'bundle';
type FamilyProductId = 'teens' | 'adults' | 'bundle';
type ProductId = AdultProductId | FamilyProductId;

interface Product {
    id: ProductId;
    price: string;
    unlocks: Category[];
}

// Adult version products
const ADULT_PRODUCTS: Record<AdultProductId, Product> = {
    dirty: { id: 'dirty', price: '$2.99', unlocks: ['dirty'] },
    extreme: { id: 'extreme', price: '$4.99', unlocks: ['extreme'] },
    bundle: { id: 'bundle', price: '$6.99', unlocks: ['dirty', 'extreme'] }
};

// Family version products
const FAMILY_PRODUCTS: Record<FamilyProductId, Product> = {
    teens: { id: 'teens', price: '$0.99', unlocks: ['movies', 'sports', 'music', 'videogames', 'superheroes'] },
    adults: { id: 'adults', price: '$1.99', unlocks: ['travel', 'professions', 'history', 'science', 'brands'] },
    bundle: { id: 'bundle', price: '$1.99', unlocks: ['movies', 'sports', 'music', 'videogames', 'superheroes', 'travel', 'professions', 'history', 'science', 'brands'] }
};

// Select products based on app variant
const PRODUCTS = APP_VARIANT === 'family' ? FAMILY_PRODUCTS : ADULT_PRODUCTS;

// Free categories by variant
const FREE_CATEGORIES: Category[] = APP_VARIANT === 'family' 
    ? ['animals', 'food', 'cartoons', 'toys', 'nature'] // Kids Pack FREE
    : ['party']; // Party FREE

// --- Constants & Defaults ---

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'ua', label: 'Українська' }
] as const;

const DEFAULT_TEAMS: Record<Language, { name: string, players: string[] }[]> = {
  en: [
    { name: 'Nymphomaniacs', players: ['Lili', 'Vika', 'Oksana'] },
    { name: 'Perverts', players: ['Serg', 'Yasha', 'Antonio'] }
  ],
  ru: [
    { name: 'Нимфоманки', players: ['Лили', 'Вика', 'Оксана'] },
    { name: 'Извращенцы', players: ['Серж', 'Яша', 'Антонио'] }
  ],
  ua: [
    { name: 'Німфоманки', players: ['Лілі', 'Віка', 'Оксана'] },
    { name: 'Збоченці', players: ['Серж', 'Яша', 'Антоніо'] }
  ],
  es: [
    { name: 'Ninfómanas', players: ['Lili', 'Vika', 'Oksana'] },
    { name: 'Pervertidos', players: ['Serg', 'Yasha', 'Antonio'] }
  ]
};

const GET_DEFAULT_SETTINGS = (lang: Language = 'en'): GameSettings => {
    const teamsData = DEFAULT_TEAMS[lang] || DEFAULT_TEAMS['en'];
    return {
        teams: teamsData.map((t, i) => ({
            id: `team_${i}_${Date.now()}`,
            name: t.name,
            score: 0,
            players: t.players.map((p, j) => ({
                id: `player_${i}_${j}_${Date.now()}`,
                name: p,
                score: 0,
                guessedCount: 0,
                turnsPlayed: 0
            })),
            nextPlayerIndex: 0
        })),
        targetScore: 30,
        roundDuration: 60,
        lastWordDuration: 10,
        categories: CONFIG.defaultCategories as Category[],
        penaltyForSkip: true,
        soundEnabled: true,
        uiLanguage: lang,
        wordLanguage: lang,
        theme: 'light',
    };
};

// --- Sound Manager with Native Audio (works in silent mode on iOS) ---

type SoundType = 'correct' | 'skip' | 'tick' | 'timeup' | 'win' | 'ready';

const SOUNDS: Record<SoundType, string> = {
  correct: 'sounds/correct.wav',
  skip: 'sounds/skip.wav',
  tick: 'sounds/tick.wav',
  timeup: 'sounds/timeup.wav',
  win: 'sounds/win.wav',
  ready: 'sounds/ready.wav'
};

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

const soundManager = new SoundManager();

// --- Helpers ---

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Debounce helper for localStorage operations
const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

// Variant-specific localStorage keys to prevent conflicts between Family and Adult versions
const STORAGE_PREFIX = APP_VARIANT === 'family' ? 'guessus_family_' : 'guessus_adult_';
const STORAGE_KEYS = {
  settings: `${STORAGE_PREFIX}settings`,
  history: `${STORAGE_PREFIX}history`,
  purchases: `${STORAGE_PREFIX}purchases`,
};

// Debounced localStorage save functions
const saveToStorage = debounce((key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}, 300);

// --- Custom Hooks ---

const useTheme = (theme: Theme) => {
    return useMemo(() => {
        const isDark = theme === 'dark';
        return {
            isDark,
            bg: isDark ? 'bg-neutral-900' : 'bg-gray-50',
            text: isDark ? 'text-white' : 'text-gray-900',
            textSub: isDark ? 'text-neutral-400' : 'text-gray-500',
            card: isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-xl',
            button: isDark ? 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600' : 'bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-200 shadow-sm',
            input: isDark ? 'bg-neutral-800 focus:ring-pink-500' : 'bg-white border-gray-300 focus:ring-pink-500',
            border: isDark ? 'border-neutral-700' : 'border-gray-200',
            hexBg: isDark ? '#171717' : '#f9fafb',
            dragHighlight: isDark ? 'bg-neutral-700' : 'bg-gray-200',
        };
    }, [theme]);
};

const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameScreenState>('start');
  const [settings, setSettings] = useState<GameSettings>(GET_DEFAULT_SETTINGS('en'));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Initialize with free categories based on app variant
  const [ownedCategories, setOwnedCategories] = useState<Category[]>(FREE_CATEGORIES);
  
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [gameWords, setGameWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentRoundWords, setCurrentRoundWords] = useState<RoundWord[]>([]);
  
  const t = TRANSLATIONS[settings.uiLanguage] || TRANSLATIONS['en'];
  const themeColors = useTheme(settings.theme);
  const activeTeam = settings.teams[currentTeamIndex];
  const currentWord = gameWords[wordIndex] || "";

  useEffect(() => {
    const handleInteraction = () => soundManager.unlock();
    const handleVisibilityChange = () => { if (!document.hidden) soundManager.unlock(); };
    const events = ['click', 'touchstart', 'pointerdown', 'keydown'];
    events.forEach(e => window.addEventListener(e, handleInteraction));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Initialize remote dictionary system (checks for updates in background)
    initializeDictionary();
    
    // Initialize In-App Purchases (only for Adult version)
    if (CONFIG.showPaywall) {
      initializePurchases().then(() => {
        // Sync owned categories from purchases
        const purchasedCategories = getOwnedCategoriesFromPurchases();
        if (purchasedCategories.length > 1) { // More than just 'party'
          setOwnedCategories(purchasedCategories as Category[]);
        }
      });
    }
    
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.history);
      const savedPurchases = localStorage.getItem(STORAGE_KEYS.purchases);

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.teams && Array.isArray(parsed.teams)) {
            if (!TRANSLATIONS[parsed.uiLanguage as Language]) parsed.uiLanguage = 'en';
            setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      // Load purchased categories from localStorage (both Adult and Family versions have IAP now)
      if (CONFIG.showPaywall && savedPurchases) {
        const savedCats = JSON.parse(savedPurchases);
        // Merge with free categories to ensure they're always included
        const merged = Array.from(new Set([...FREE_CATEGORIES, ...savedCats]));
        setOwnedCategories(merged as Category[]);
      }
    } catch (e) {
      console.error("Failed to load settings/history", e);
    }
    
    return () => {
        events.forEach(e => window.removeEventListener(e, handleInteraction));
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Debounced localStorage saves to prevent performance issues
  useEffect(() => { saveToStorage(STORAGE_KEYS.settings, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.history, JSON.stringify(history)); }, [history]);
  // Save purchases for both Adult and Family versions (both have IAP now)
  useEffect(() => { 
    if (CONFIG.showPaywall) {
      saveToStorage(STORAGE_KEYS.purchases, JSON.stringify(ownedCategories)); 
    }
  }, [ownedCategories]);

  const buyProduct = async (productId: ProductId): Promise<boolean> => {
      try {
        // Attempt real purchase (will simulate in dev mode)
        const success = await purchaseProduct(productId as IAPProductId);
        
        if (success) {
          const product = PRODUCTS[productId];
          const newOwned = [...ownedCategories, ...product.unlocks];
          const uniqueOwned = Array.from(new Set(newOwned));
          setOwnedCategories(uniqueOwned);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Purchase failed:', error);
        return false;
      }
  };
  
  const handleRestorePurchases = async (): Promise<void> => {
    try {
      const restored = await restorePurchases();
      if (restored.length > 0) {
        const newOwned = [...ownedCategories];
        restored.forEach(productId => {
          const product = PRODUCTS[productId as ProductId];
          if (product) {
            product.unlocks.forEach(cat => {
              if (!newOwned.includes(cat)) {
                newOwned.push(cat);
              }
            });
          }
        });
        setOwnedCategories(newOwned);
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const startGame = useCallback((newSettings?: GameSettings) => {
    try {
      soundManager.unlock();
      const activeSettings = newSettings || settings;
      
      const teamsWithPlayers = activeSettings.teams.map(team => {
        const resetPlayers = (team.players && team.players.length) 
           ? team.players.map(p => ({...p, score: 0, guessedCount: 0, turnsPlayed: 0})) 
           : [{ id: Date.now() + Math.random().toString(), name: 'Player 1', score: 0, guessedCount: 0, turnsPlayed: 0 }];
        return { ...team, score: 0, nextPlayerIndex: 0, players: resetPlayers };
      });

      if (activeSettings.categories.length === 0) {
        return; // Validation handled in UI
      }
      
      let pool: string[] = [];
      const wordDatabase = getWordDatabase();
      activeSettings.categories.forEach(cat => {
        if (!ownedCategories.includes(cat)) return;
        const langDB = wordDatabase[activeSettings.wordLanguage] || wordDatabase['en'];
        const words = langDB?.[cat] || wordDatabase['en']?.[cat] || [];
        pool.push(...words);
      });

      pool = Array.from(new Set(pool));

      if (pool.length === 0) {
          alert(TRANSLATIONS[activeSettings.uiLanguage].wordsRunOut);
          return;
      }

      setGameWords(shuffleArray(pool));
      setWordIndex(0);
      setSettings({ ...activeSettings, teams: teamsWithPlayers });
      setCurrentTeamIndex(0);
      setGameState('preRound');
    } catch (error) {
       console.error("Error starting game:", error);
       alert("Could not start game.");
    }
  }, [settings, ownedCategories]);

  const startRound = useCallback(() => {
    soundManager.unlock();
    if (wordIndex >= gameWords.length) {
        alert(TRANSLATIONS[settings.uiLanguage].wordsRunOut);
        return;
    }
    if (settings.soundEnabled) soundManager.play('ready');
    setCurrentRoundWords([]);
    setGameState('game');
  }, [wordIndex, gameWords.length, settings.uiLanguage, settings.soundEnabled]);

  const handleWordAction = useCallback((status: 'guessed' | 'skipped') => {
    // Haptic feedback for game actions
    if (status === 'guessed') {
      haptics.success();
    } else {
      haptics.error();
    }
    if (settings.soundEnabled) soundManager.play(status === 'guessed' ? 'correct' : 'skip');
    
    if (gameWords[wordIndex]) {
        setCurrentRoundWords(prev => [...prev, { word: gameWords[wordIndex], status }]);
    }
    
    const nextIndex = wordIndex + 1;
    setWordIndex(nextIndex);

    if (nextIndex >= gameWords.length) {
        setGameState('verification');
        return;
    }

    if (gameState === 'lastWord') {
      setGameState('verification');
    }
  }, [settings.soundEnabled, gameWords, wordIndex, gameState]);

  const handleTimeUp = useCallback(() => {
    if (settings.soundEnabled) soundManager.play('timeup');
    if (gameState === 'lastWord') {
      handleWordAction('skipped');
    } else {
      setGameState('lastWord');
    }
  }, [settings.soundEnabled, gameState, handleWordAction]);

  const endRoundImmediately = useCallback(() => {
     if (gameWords[wordIndex]) {
        setCurrentRoundWords(prev => [...prev, { word: gameWords[wordIndex], status: 'skipped' }]);
        setWordIndex(prev => prev + 1);
     }
     setGameState('verification');
  }, [gameWords, wordIndex]);

  const handleVerificationComplete = useCallback((finalWords: RoundWord[]) => {
    let roundScore = 0;
    const guessedCountInRound = finalWords.filter(w => w.status === 'guessed').length;

    finalWords.forEach(w => {
      if (w.status === 'guessed') roundScore++;
      else if (w.status === 'skipped' && settings.penaltyForSkip) roundScore--;
    });

    setSettings(prevSettings => {
      const updatedTeams = prevSettings.teams.map((team, index) => {
        if (index !== currentTeamIndex) return team;
        const activePlayerIndex = team.nextPlayerIndex;
        const updatedPlayers = team.players.map((p, pIndex) => {
             if (pIndex === activePlayerIndex) {
                 return { ...p, score: p.score + roundScore, guessedCount: (p.guessedCount || 0) + guessedCountInRound, turnsPlayed: (p.turnsPlayed || 0) + 1 };
             }
             return p;
        });
        return { ...team, score: team.score + roundScore, players: updatedPlayers, nextPlayerIndex: (activePlayerIndex + 1) % updatedPlayers.length };
      });
      return { ...prevSettings, teams: updatedTeams };
    });
    setGameState('roundResult');
  }, [settings.penaltyForSkip, currentTeamIndex]);

  const handleNextRound = useCallback(() => {
    const isLastTeam = currentTeamIndex === settings.teams.length - 1;
    if (isLastTeam) {
       const winners = settings.teams.filter(t => t.score >= settings.targetScore);
       if (winners.length > 0) {
         winners.sort((a, b) => b.score - a.score);
         const winner = winners[0];
         const allPlayers = settings.teams.flatMap(t => t.players);
         const getAvg = (p: Player) => (p.turnsPlayed ? (p.guessedCount || 0) / p.turnsPlayed : 0);
         allPlayers.sort((a, b) => getAvg(b) - getAvg(a));
         const bestPlayer = allPlayers.length > 0 ? allPlayers[0].name : "Unknown";

         const newHistory: HistoryItem = { 
           id: Date.now().toString(), 
           date: new Date().toLocaleDateString(), 
           winner: winner.name, 
           teamCount: settings.teams.length, 
           score: winner.score, 
           mvp: bestPlayer, 
           teams: structuredClone(settings.teams) 
         };
         setHistory(prev => [newHistory, ...prev]);
         if (settings.soundEnabled) soundManager.play('win');
         haptics.victory(); // Strong haptic for victory
         setGameState('winner');
         return;
       }
    }
    setCurrentTeamIndex(prev => (prev + 1) % settings.teams.length);
    setGameState('preRound');
  }, [currentTeamIndex, settings.teams, settings.targetScore, settings.soundEnabled]);

  // Memoize actions object to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    startGame, startRound, handleWordAction, handleTimeUp, endRoundImmediately, handleVerificationComplete, handleNextRound
  }), [startGame, startRound, handleWordAction, handleTimeUp, endRoundImmediately, handleVerificationComplete, handleNextRound]);

  return {
      gameState, setGameState, settings, setSettings, history, setHistory, activeTeam, currentWord, currentRoundWords, t, themeColors, ownedCategories, buyProduct, handleRestorePurchases, actions
  };
};

// --- Props Interfaces ---

interface CommonProps {
    t: any;
    themeColors: any;
    isDark: boolean;
}

interface PaywallProps extends CommonProps {
    onClose: () => void;
    onBuy: (id: ProductId) => Promise<boolean>;
    onRestore: () => Promise<void>;
    ownedCategories: Category[];
}

interface SettingsViewProps extends CommonProps {
    initialSettings: GameSettings;
    onBack: () => void;
    onSave: (s: GameSettings) => void;
    onImmediateChange: (u: Partial<GameSettings>) => void;
    ownedCategories: Category[];
    buyProduct: (id: ProductId) => Promise<boolean>;
    onRestore: () => Promise<void>;
}

interface PreRoundViewProps extends CommonProps {
    team: Team;
    allTeams: Team[];
    onStartRound: () => void;
    onExit: () => void;
}

interface GameViewProps extends CommonProps {
    team: Team;
    word: string;
    duration: number;
    isLastWord: boolean;
    onAction: (status: 'guessed' | 'skipped') => void;
    penaltyEnabled: boolean;
    soundEnabled: boolean;
    onTimeUp: () => void;
    onExitGame: () => void;
    onEndRoundImmediately: () => void;
}

interface VerificationViewProps extends CommonProps {
    words: RoundWord[];
    onComplete: (words: RoundWord[]) => void;
    penaltyEnabled: boolean;
    soundEnabled: boolean;
}

interface RoundResultViewProps extends CommonProps {
    team: Team;
    words: RoundWord[];
    penaltyEnabled: boolean;
    onNext: () => void;
}

interface WinnerViewProps extends CommonProps {
    history: HistoryItem[];
    teams: Team[];
    onPlayAgain: () => void;
}

interface HistoryViewProps extends CommonProps {
    history: HistoryItem[];
    onClear: () => void;
    onBack: () => void;
}

interface RulesViewProps {
    t: Record<string, string>;
    themeColors: ThemeColors;
    onBack: () => void;
}

interface ThemeColors {
    isDark: boolean;
    bg: string;
    text: string;
    textSub: string;
    card: string;
    button: string;
    input: string;
    border: string;
    hexBg: string;
    dragHighlight: string;
}

interface StatsRowProps {
    player: Player & { teamName: string };
    rank: number;
    t: Record<string, string>;
    isDark: boolean;
}

interface StartViewProps {
    t: Record<string, string>;
    themeColors: ThemeColors;
    onNavigate: (screen: GameScreenState) => void;
}

interface GameControlsProps {
    onAction: (status: 'guessed' | 'skipped') => void;
    penaltyEnabled: boolean;
    isDark: boolean;
    isLastWord: boolean;
    t: Record<string, string>;
}

interface WordCardProps {
    word: string;
    isLastWord: boolean;
    t: Record<string, string>;
}

// --- Components ---

const PaywallModal = memo(({ onClose, onBuy, onRestore, themeColors, t, isDark, ownedCategories }: PaywallProps) => {
    const [processing, setProcessing] = useState<string|null>(null);
    const [restoring, setRestoring] = useState(false);

    const handleBuy = async (id: ProductId) => {
        setProcessing(id);
        const success = await onBuy(id);
        setProcessing(null);
        if (success) {
            onClose();
        }
    };
    
    const handleRestore = async () => {
        setRestoring(true);
        await onRestore();
        setRestoring(false);
    };

    // Family version paywall
    if (APP_VARIANT === 'family') {
        const isTeensOwned = ownedCategories.includes('movies'); // Check one teens category
        const isAdultsOwned = ownedCategories.includes('travel'); // Check one adults category
        const showBundle = !isTeensOwned && !isAdultsOwned;
        
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${themeColors.card} relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 opacity-50 hover:opacity-100"><X size={24} /></button>
                    
                    <div className="text-center mb-6 mt-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg"><ShoppingBag size={32} className="text-white" /></div>
                        <h2 className="text-2xl font-black mb-1">{t.unlockTitle}</h2>
                        <p className={`text-sm ${themeColors.textSub}`}>{t.unlockDesc}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                        {/* Kids Pack - FREE */}
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
                            <div><div className="font-bold text-green-600">{t.packKids || 'Kids Pack'}</div><div className="text-xs opacity-60">{t.packKidsDesc || 'Animals, Food, Cartoons, Toys, Nature'}</div></div>
                            <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={14}/> {t.packFree || 'FREE'}</div>
                        </div>
                        
                        {/* Teens Pack - $0.99 */}
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div><div className="font-bold">{t.packTeens || 'Teens Pack'}</div><div className="text-xs opacity-60">{t.packTeensDesc || 'Movies, Sports, Music, Games, Heroes'}</div></div>
                            {isTeensOwned ? (
                                <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={14}/> Owned</div>
                            ) : (
                                <button onClick={() => handleBuy('teens' as ProductId)} disabled={!!processing} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm min-w-[80px]">{processing === 'teens' ? t.processing : '$0.99'}</button>
                            )}
                        </div>
                        
                        {/* Adults Pack - $1.99 */}
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div><div className="font-bold">{t.packAdults || 'Adults Pack'}</div><div className="text-xs opacity-60">{t.packAdultsDesc || 'Travel, Jobs, History, Science, Brands'}</div></div>
                            {isAdultsOwned ? (
                                <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={14}/> Owned</div>
                            ) : (
                                <button onClick={() => handleBuy('adults' as ProductId)} disabled={!!processing} className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm min-w-[80px]">{processing === 'adults' ? t.processing : '$1.99'}</button>
                            )}
                        </div>
                    </div>

                    {showBundle && (
                        <button onClick={() => handleBuy('bundle')} disabled={!!processing} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl relative overflow-hidden group touch-manipulation active:scale-[0.98] transition-transform">
                            <div className="relative z-10 flex items-center justify-center gap-2 px-8">
                                {processing === 'bundle' ? t.processing : (<><Sparkles size={20} className="text-yellow-200 shrink-0" /><span className="truncate">{t.unlockAll} $1.99</span></>)}
                            </div>
                            <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] uppercase font-black px-3 py-1.5 rounded-bl-2xl shadow-sm z-20 leading-none flex items-center justify-center">{t.bestValue}</div>
                        </button>
                    )}
                    
                    <button 
                        onClick={handleRestore} 
                        disabled={restoring || !!processing}
                        className={`w-full py-3 text-sm font-medium rounded-xl transition-all ${isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        {restoring ? t.processing : (t.restorePurchases || 'Restore Purchases')}
                    </button>
                </div>
            </div>
        );
    }

    // Adult version paywall (original)
    const isDirtyOwned = ownedCategories.includes('dirty');
    const isExtremeOwned = ownedCategories.includes('extreme');
    const showBundle = !isDirtyOwned && !isExtremeOwned;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${themeColors.card} relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
                <button onClick={onClose} className="absolute top-4 right-4 p-2 opacity-50 hover:opacity-100"><X size={24} /></button>
                
                <div className="text-center mb-6 mt-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg"><ShoppingBag size={32} className="text-white" /></div>
                    <h2 className="text-2xl font-black mb-1">{t.unlockTitle}</h2>
                    <p className={`text-sm ${themeColors.textSub}`}>{t.unlockDesc}</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div><div className="font-bold">{t.catDirty}</div><div className="text-xs opacity-60">{t.catDirtyDesc}</div></div>
                        {isDirtyOwned ? (
                            <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={14}/> Owned</div>
                        ) : (
                            <button onClick={() => handleBuy('dirty' as ProductId)} disabled={!!processing} className="bg-neutral-200 dark:bg-neutral-700 px-4 py-2 rounded-lg font-bold text-sm min-w-[80px]">{processing === 'dirty' ? t.processing : ADULT_PRODUCTS.dirty.price}</button>
                        )}
                    </div>
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div><div className="font-bold">{t.catExtreme}</div><div className="text-xs opacity-60">{t.catExtremeDesc}</div></div>
                        {isExtremeOwned ? (
                            <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={14}/> Owned</div>
                        ) : (
                            <button onClick={() => handleBuy('extreme' as ProductId)} disabled={!!processing} className="bg-neutral-200 dark:bg-neutral-700 px-4 py-2 rounded-lg font-bold text-sm min-w-[80px]">{processing === 'extreme' ? t.processing : ADULT_PRODUCTS.extreme.price}</button>
                        )}
                    </div>
                </div>

                {showBundle && (
                    <button onClick={() => handleBuy('bundle')} disabled={!!processing} className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl relative overflow-hidden group touch-manipulation active:scale-[0.98] transition-transform">
                        <div className="relative z-10 flex items-center justify-center gap-2 px-8">
                            {processing === 'bundle' ? t.processing : (<><Sparkles size={20} className="text-yellow-200 shrink-0" /><span className="truncate">{t.unlockAll} {ADULT_PRODUCTS.bundle.price}</span></>)}
                        </div>
                        <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] uppercase font-black px-3 py-1.5 rounded-bl-2xl shadow-sm z-20 leading-none flex items-center justify-center">{t.bestValue}</div>
                    </button>
                )}
                
                <button 
                    onClick={handleRestore} 
                    disabled={restoring || !!processing}
                    className={`w-full py-3 text-sm font-medium rounded-xl transition-all ${isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    {restoring ? t.processing : (t.restorePurchases || 'Restore Purchases')}
                </button>
            </div>
        </div>
    );
});
PaywallModal.displayName = 'PaywallModal';

const GameTimer = memo(({ duration, onTimeUp, soundEnabled, isActive, isLastWord, isPaused }: { duration: number, onTimeUp: () => void, soundEnabled: boolean, isActive: boolean, isLastWord?: boolean, isPaused: boolean }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const onTimeUpRef = useRef(onTimeUp);
  const soundEnabledRef = useRef(soundEnabled);
  const hasTriggeredTimeUp = useRef(false);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { 
    setTimeLeft(duration); 
    hasTriggeredTimeUp.current = false; // Reset when duration changes
  }, [duration]);

  // Separate effect to handle time up - NEVER call state-changing functions inside setState!
  useEffect(() => {
    if (timeLeft === 0 && !hasTriggeredTimeUp.current) {
      hasTriggeredTimeUp.current = true;
      // Use setTimeout to ensure we're outside of any React render cycle
      setTimeout(() => {
        onTimeUpRef.current();
      }, 0);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (!isActive || isPaused) return;
    const intervalId = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0; // Don't call onTimeUp here - let the effect above handle it
        }
        if (prev <= 6) {
          // Use setTimeout to avoid calling async functions inside setState
          setTimeout(() => {
            if (soundEnabledRef.current) soundManager.play('tick');
            haptics.warning();
          }, 0);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isActive, duration, isPaused]);

  const isLowTime = timeLeft < 10;
  const textColor = isLastWord ? 'text-white' : (isLowTime ? 'text-red-500' : 'text-current');
  
  return (
    <div className={`flex flex-col items-end transition-colors ${textColor}`}>
      <div className={`text-4xl font-black font-mono tracking-widest ${isLowTime && !isPaused ? 'animate-pulse' : ''}`}>{timeLeft}</div>
      <div className="text-xs font-bold opacity-60 uppercase">sec</div>
    </div>
  );
});
GameTimer.displayName = 'GameTimer';

// Light component - no memo needed (Dan Abramov best practice)
const WordCard = ({ word, isLastWord, t }: WordCardProps) => (
  <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px] w-full px-4">
    {isLastWord && <div className="absolute top-0 text-white font-black tracking-widest animate-pulse bg-red-600 px-6 py-2 rounded-full shadow-lg border-2 border-red-400 z-10">{t.lastWord}</div>}
    <div className="text-center w-full"><div className="text-5xl md:text-7xl font-black leading-tight break-words max-w-full select-none" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>{word}</div></div>
  </div>
);

// Light component - no memo needed
const GameControls = ({ onAction, penaltyEnabled, isDark, isLastWord, t }: GameControlsProps) => (
  <div className="grid grid-cols-2 gap-4 mt-6 h-32 w-full" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
    <button onClick={() => onAction('skipped')} className={`${isDark || isLastWord ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'} rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all border shadow-lg touch-manipulation`}><X size={40} className="text-red-500" /><span className="font-bold uppercase tracking-wider text-sm">{t.skip}</span>{penaltyEnabled && <span className="text-xs text-red-500 font-bold">-1</span>}</button>
    <button onClick={() => onAction('guessed')} className={`${isDark || isLastWord ? 'bg-white text-black' : 'bg-green-500 text-white'} rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg touch-manipulation`}><Check size={40} className={isDark || isLastWord ? "text-green-600" : "text-white"} /><span className="font-bold uppercase tracking-wider text-sm">{t.guessed}</span><span className={`text-xs font-bold ${isDark || isLastWord ? "text-green-600" : "text-white"}`}>+1</span></button>
  </div>
);

// Light component - no memo needed
const StartView = ({ t, themeColors, onNavigate }: StartViewProps) => {
  const handleNavigate = (screen: GameScreenState) => {
    haptics.tap(); // Haptic feedback on navigation
    onNavigate(screen);
  };
  
  return (
    <div className={`min-h-[100dvh] p-6 flex flex-col items-center justify-center font-sans ${themeColors.text} relative`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
      <div className="absolute right-6" style={{ top: 'calc(env(safe-area-inset-top) + 4rem)' }}><button onClick={() => handleNavigate('settings')} className={`p-3 rounded-xl transition-all ${themeColors.button}`}><SettingsIcon size={24} /></button></div>
      <h1 className="text-5xl md:text-6xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 pr-2">{t.startTitle}</h1>
      {CONFIG.showAdultBadge ? (
        <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest text-pink-500 mb-8 md:mb-12 border border-pink-500/30 ${themeColors.card}`}>{t.adultsOnly}</div>
      ) : (
        <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest text-blue-500 mb-8 md:mb-12 border border-blue-500/30 ${themeColors.card}`}>{CONFIG.tagline}</div>
      )}
      <div className="w-full max-w-xs space-y-4">
        <button onClick={() => handleNavigate('settings')} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-xl touch-manipulation"><Play size={24} /> {t.startGame}</button>
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => handleNavigate('history')} className={`py-4 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1 touch-manipulation ${themeColors.button}`}><Trophy size={20} className="text-yellow-500" /><span className="text-sm">{t.history}</span></button>
           <button onClick={() => handleNavigate('rules')} className={`py-4 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1 touch-manipulation ${themeColors.button}`}><BookOpen size={20} className="text-blue-500" /><span className="text-sm">{t.rules}</span></button>
        </div>
      </div>
      <div className="absolute text-[10px] opacity-30 font-mono" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>v{APP_VERSION}</div>
    </div>
  );
};

const PlayerRow = memo(({ player, teamIdx, playerIdx, themeColors, showRemove, onNameChange, onRemove, onDragStart, onDragEnd, onDragOver, onDragEnter, onDrop, draggingId }: any) => {
    const handleDragStart = (e: React.DragEvent) => { if ((e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); return; } onDragStart(e, teamIdx, playerIdx, player.id); };
    const isDragging = draggingId === player.id;
    return (
        <div className={`flex gap-2 items-center group transition-colors duration-200`} style={isDragging ? { background: themeColors.dragHighlight, opacity: 0.8 } : {}} draggable={true} onDragStart={handleDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragEnter={(e) => onDragEnter(e, teamIdx, playerIdx)} onDrop={(e) => onDrop(e, teamIdx, playerIdx)}>
            <div className="drag-handle p-4 -ml-4 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 select-none touch-none" style={{touchAction: 'none'}}><GripVertical size={20} /></div>
            <User size={16} className={themeColors.textSub} />
            <input value={player.name} onChange={(e) => onNameChange(teamIdx, playerIdx, e.target.value)} className={`flex-1 p-2 text-sm rounded-lg bg-transparent border-b ${themeColors.border} focus:outline-none focus:border-pink-500 min-w-0`} placeholder="Player Name" />
            {showRemove && <button onClick={() => onRemove(teamIdx, playerIdx)} className="text-red-400 p-1"><X size={14} /></button>}
        </div>
    );
});
PlayerRow.displayName = 'PlayerRow';

const TeamCard = memo(({ team, teamIdx, themeColors, isDark, t, showRemoveTeam, onNameChange, onRemoveTeam, onAddPlayer, onRemovePlayer, onPlayerNameChange, onDragStart, onDragEnd, onDragOver, onDragEnter, onDrop, draggingId }: any) => (
    <div className={`p-4 rounded-2xl border ${themeColors.border} ${isDark ? 'bg-neutral-800/30' : 'bg-white'}`}>
        <div className="flex gap-2 mb-3">
            <input value={team.name} onChange={(e) => onNameChange(teamIdx, e.target.value)} className={`w-full p-3 rounded-lg font-bold focus:outline-none focus:ring-2 ${themeColors.input}`} placeholder="Team Name" />
            {showRemoveTeam && <button onClick={() => onRemoveTeam(team.id)} className={`p-3 rounded-lg hover:text-red-500 touch-manipulation ${themeColors.button}`}><Trash2 size={20}/></button>}
        </div>
        <div className="pl-4 border-l-2 border-gray-200/20 space-y-2">
            {team.players.map((player: Player, playerIdx: number) => (
                <PlayerRow key={player.id} player={player} teamIdx={teamIdx} playerIdx={playerIdx} themeColors={themeColors} showRemove={team.players.length > 1} onNameChange={onPlayerNameChange} onRemove={onRemovePlayer} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={onDrop} draggingId={draggingId} />
            ))}
            <button onClick={() => onAddPlayer(teamIdx)} className="flex items-center gap-1 text-xs font-bold text-pink-500 mt-2 p-1"><UserPlus size={14} /> {t.addPlayer}</button>
        </div>
    </div>
));
TeamCard.displayName = 'TeamCard';

const SettingsView = memo(({ t, themeColors, isDark, initialSettings, onBack, onSave, onImmediateChange, ownedCategories, buyProduct, onRestore }: SettingsViewProps) => {
  const [localSettings, setLocalSettings] = useState<GameSettings>(initialSettings);
  const [showStore, setShowStore] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  
  const draggedItemRef = useRef<{tIdx: number, pIdx: number} | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const updateSettings = (key: keyof GameSettings, value: any) => {
    setLocalSettings(prev => {
        const next = { ...prev, [key]: value };
        if (key === 'categories' && value.length > 0) setCategoryError(false);
        if (key === 'uiLanguage') {
             const oldLang = prev.uiLanguage;
             const oldDefaults = DEFAULT_TEAMS[oldLang] || DEFAULT_TEAMS['en'];
             const newDefaults = DEFAULT_TEAMS[value as Language] || DEFAULT_TEAMS['en'];
             const newTeams = prev.teams.map((team) => {
                  const defaultTeamIndex = oldDefaults.findIndex(d => d.name === team.name);
                  if (defaultTeamIndex !== -1 && newDefaults[defaultTeamIndex]) return { ...team, name: newDefaults[defaultTeamIndex].name };
                  return team;
             });
             next.teams = newTeams;
             if (prev.wordLanguage === oldLang) next.wordLanguage = value;
        }
        if ((key === 'uiLanguage' || key === 'theme') && onImmediateChange) onImmediateChange({ [key]: value });
        return next;
    });
  };

  const onDragStart = useCallback((e: React.DragEvent, tIdx: number, pIdx: number, playerId: string) => {
    draggedItemRef.current = {tIdx, pIdx};
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', JSON.stringify({tIdx, pIdx})); } catch (err) {}
    setDraggingId(playerId);
  }, []);

  const movePlayer = useCallback((source: {tIdx: number, pIdx: number}, target: {tIdx: number, pIdx: number}) => {
    setLocalSettings(prev => {
        const newTeams = [...prev.teams];
        const sourcePlayers = [...newTeams[source.tIdx].players];
        const playerToMove = sourcePlayers[source.pIdx];
        if (source.tIdx === target.tIdx) {
            sourcePlayers.splice(source.pIdx, 1);
            sourcePlayers.splice(target.pIdx, 0, playerToMove);
            newTeams[source.tIdx] = { ...newTeams[source.tIdx], players: sourcePlayers };
        } else {
            const targetPlayers = [...newTeams[target.tIdx].players];
            sourcePlayers.splice(source.pIdx, 1);
            targetPlayers.splice(target.pIdx, 0, playerToMove);
            newTeams[source.tIdx] = { ...newTeams[source.tIdx], players: sourcePlayers };
            newTeams[target.tIdx] = { ...newTeams[target.tIdx], players: targetPlayers };
        }
        return { ...prev, teams: newTeams };
    });
    draggedItemRef.current = target;
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent, targetTIdx: number, targetPIdx: number) => {
      e.preventDefault();
      const source = draggedItemRef.current;
      if (!source || (source.tIdx === targetTIdx && source.pIdx === targetPIdx)) return;
      movePlayer(source, {tIdx: targetTIdx, pIdx: targetPIdx});
  }, [movePlayer]);

  const onDragEnd = useCallback(() => { setDraggingId(null); draggedItemRef.current = null; }, []);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDraggingId(null); draggedItemRef.current = null; }, []);

  const handleCategoryClick = (cat: Category) => {
      // Only check lock status if paywall is enabled (Adult version)
      const isLocked = CONFIG.showPaywall && !ownedCategories.includes(cat);
      if (isLocked) { setShowStore(true); return; }
      const has = localSettings.categories.includes(cat);
      updateSettings('categories', has ? localSettings.categories.filter(c => c !== cat) : [...localSettings.categories, cat]);
  };

  const handleSave = () => {
      if (localSettings.categories.length === 0) {
          setCategoryError(true);
          alert(t.selectCategoryAlert);
          return;
      }
      onSave(localSettings);
  };

  const updateTeamName = useCallback((idx: number, name: string) => { 
    setLocalSettings(prev => { 
      const newTeams = [...prev.teams]; 
      newTeams[idx] = {...newTeams[idx], name}; 
      return {...prev, teams: newTeams}; 
    }); 
  }, []);
  
  const addPlayer = useCallback((tIdx: number) => { 
    setLocalSettings(prev => { 
      const newTeams = [...prev.teams]; 
      newTeams[tIdx] = {
        ...newTeams[tIdx], 
        players: [...newTeams[tIdx].players, {
          id: Date.now() + Math.random().toString(), 
          name: `${t.player} ${newTeams[tIdx].players.length + 1}`, 
          score: 0, 
          guessedCount: 0, 
          turnsPlayed: 0
        }]
      }; 
      return {...prev, teams: newTeams}; 
    }); 
  }, [t.player]);
  
  const removePlayer = useCallback((tIdx: number, pIdx: number) => { 
    setLocalSettings(prev => { 
      const newTeams = [...prev.teams]; 
      const players = [...newTeams[tIdx].players]; 
      players.splice(pIdx, 1); 
      newTeams[tIdx] = {...newTeams[tIdx], players}; 
      return {...prev, teams: newTeams}; 
    }); 
  }, []);
  
  const updatePlayerName = useCallback((tIdx: number, pIdx: number, name: string) => { 
    setLocalSettings(prev => { 
      const newTeams = [...prev.teams]; 
      const players = [...newTeams[tIdx].players]; 
      players[pIdx] = {...players[pIdx], name}; 
      newTeams[tIdx] = {...newTeams[tIdx], players}; 
      return {...prev, teams: newTeams}; 
    }); 
  }, []);
  
  const addTeam = useCallback(() => { 
    setLocalSettings(prev => ({
      ...prev, 
      teams: [...prev.teams, {
        id: Date.now().toString(), 
        name: `Team ${prev.teams.length + 1}`, 
        score: 0, 
        players: [
          {id: 'n1' + Date.now(), name: 'P1', score: 0, guessedCount: 0, turnsPlayed: 0}, 
          {id: 'n2' + Date.now(), name: 'P2', score: 0, guessedCount: 0, turnsPlayed: 0}
        ], 
        nextPlayerIndex: 0
      }]
    })); 
  }, []);
  
  const removeTeam = useCallback((id: string) => { 
    setLocalSettings(prev => ({...prev, teams: prev.teams.filter(team => team.id !== id)})); 
  }, []);

  return (
    <div className={`min-h-[100dvh] p-6 font-sans ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8rem)' }}>
      {CONFIG.showPaywall && showStore && <PaywallModal onClose={() => setShowStore(false)} onBuy={buyProduct} onRestore={onRestore} themeColors={themeColors} t={t} isDark={isDark} ownedCategories={ownedCategories} />}
      <div className="flex items-center gap-4 mb-8"><button onClick={onBack} className="p-2 -ml-2"><ChevronLeft size={32} /></button><h2 className="text-3xl font-bold">{t.settings}</h2></div>
      <div className="space-y-8 max-w-md mx-auto">
        <div className="space-y-3"><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.textSub}`}>{t.theme}</h3><div className="flex gap-2 bg-neutral-800/10 p-1 rounded-xl"><button onClick={() => updateSettings('theme', 'dark')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${localSettings.theme === 'dark' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500'}`}><Moon size={18} /> {t.themeDark}</button><button onClick={() => updateSettings('theme', 'light')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${localSettings.theme === 'light' ? 'bg-white text-black shadow-md' : 'text-neutral-500'}`}><Sun size={18} /> {t.themeLight}</button></div></div>
        <div className={`p-4 rounded-2xl border ${themeColors.border} ${isDark ? 'bg-neutral-800/50' : 'bg-gray-100/50'}`}><div className="flex items-center gap-2 mb-4"><Languages size={20} className="text-pink-500" /><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.text}`}>{t.uiLang}</h3></div><div className="grid grid-cols-2 gap-2">{LANGUAGES.map(lang => (<button key={lang.code} onClick={() => updateSettings('uiLanguage', lang.code)} className={`p-3 rounded-xl font-bold transition-all ${localSettings.uiLanguage === lang.code ? 'bg-pink-500 text-white shadow-md' : themeColors.button}`}>{lang.label}</button>))}</div></div>
        <div className={`p-4 rounded-2xl border ${themeColors.border} ${isDark ? 'bg-neutral-800/50' : 'bg-gray-100/50'}`}><div className="flex items-center gap-2 mb-4"><BookOpen size={20} className="text-indigo-500" /><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.text}`}>{t.wordLang}</h3></div><div className="grid grid-cols-2 gap-2">{LANGUAGES.map(lang => (<button key={lang.code} onClick={() => updateSettings('wordLanguage', lang.code)} className={`p-3 rounded-xl font-bold transition-all ${localSettings.wordLanguage === lang.code ? 'bg-indigo-500 text-white shadow-md' : themeColors.button}`}>{lang.label}</button>))}</div></div>
        <div className="space-y-4 pt-4 border-t border-gray-200/20"><div className="flex justify-between items-center"><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.textSub}`}>{t.teams}</h3>{localSettings.teams.length < 4 && <button onClick={addTeam} className="text-pink-500 font-bold text-sm p-2 -mr-2">{t.addTeam}</button>}</div>{localSettings.teams.map((team, teamIdx) => (<TeamCard key={team.id} team={team} teamIdx={teamIdx} themeColors={themeColors} isDark={isDark} t={t} showRemoveTeam={localSettings.teams.length > 2} onNameChange={updateTeamName} onRemoveTeam={removeTeam} onAddPlayer={addPlayer} onRemovePlayer={removePlayer} onPlayerNameChange={updatePlayerName} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={onDrop} draggingId={draggingId} />))}</div>
        <div className="space-y-3"><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.textSub}`}>{t.targetScore}</h3><div className="grid grid-cols-4 gap-2">{[20, 30, 40, 50, 60, 80, 100].map(v => (<button key={v} onClick={() => updateSettings('targetScore', v)} className={`p-3 rounded-xl font-bold transition-all ${localSettings.targetScore === v ? 'bg-pink-500 text-white shadow-md' : themeColors.button}`}>{v}</button>))}</div></div>
        <div className="space-y-3"><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.textSub}`}>{t.roundTime}</h3><div className="grid grid-cols-4 gap-2">{[30, 45, 60, 90].map(v => (<button key={v} onClick={() => updateSettings('roundDuration', v)} className={`p-3 rounded-xl font-bold text-sm transition-all ${localSettings.roundDuration === v ? 'bg-indigo-500 text-white shadow-md' : themeColors.button}`}>{v} sec</button>))}</div></div>
        <div className="space-y-2"><label className={`font-bold text-sm ${themeColors.textSub}`}>{t.lastWordTime}</label><div className="flex gap-2">{[10, 15, 30].map(time => (<button key={time} onClick={() => updateSettings('lastWordDuration', time)} className={`flex-1 p-3 rounded-xl font-bold text-sm transition-all ${localSettings.lastWordDuration === time ? 'bg-red-500 text-white' : themeColors.button}`}>{time} sec</button>))}</div></div>
        <div className={`space-y-3 p-4 rounded-2xl transition-colors ${categoryError ? 'bg-red-500/10 border-2 border-red-500' : ''}`}><h3 className={`font-bold uppercase text-sm tracking-wider ${themeColors.textSub}`}>{t.categories}</h3><div className="space-y-2">{(CONFIG.availableCategories as Category[]).map(cat => { const isLocked = CONFIG.showPaywall && !ownedCategories.includes(cat); const isSelected = localSettings.categories.includes(cat); const getCatName = (c: Category) => { const names: Record<string, string> = { party: t.catParty, dirty: t.catDirty, extreme: t.catExtreme, movies: t.catMovies || 'Movies', food: t.catFood || 'Food', animals: t.catAnimals || 'Animals', sports: t.catSports || 'Sports', travel: t.catTravel || 'Travel', professions: t.catProfessions || 'Professions', cartoons: t.catCartoons || 'Cartoons', toys: t.catToys || 'Toys', nature: t.catNature || 'Nature', music: t.catMusic || 'Music', videogames: t.catVideogames || 'Video Games', superheroes: t.catSuperheroes || 'Superheroes', history: t.catHistory || 'History', science: t.catScience || 'Science', brands: t.catBrands || 'Brands' }; return names[c] || c; }; const getCatDesc = (c: Category) => { const descs: Record<string, string> = { party: t.catPartyDesc, dirty: t.catDirtyDesc, extreme: t.catExtremeDesc, movies: t.catMoviesDesc || 'Films and characters', food: t.catFoodDesc || 'Dishes and ingredients', animals: t.catAnimalsDesc || 'Animals and nature', sports: t.catSportsDesc || 'Sports and games', travel: t.catTravelDesc || 'Countries and travel', professions: t.catProfessionsDesc || 'Jobs and occupations', cartoons: t.catCartoonsDesc || 'Animated shows', toys: t.catToysDesc || 'Toys and games', nature: t.catNatureDesc || 'Nature and environment', music: t.catMusicDesc || 'Music and artists', videogames: t.catVideogamesDesc || 'Games and characters', superheroes: t.catSuperheroesDesc || 'Comics and superheroes', history: t.catHistoryDesc || 'Historical events', science: t.catScienceDesc || 'Science and technology', brands: t.catBrandsDesc || 'Famous brands' }; return descs[c] || ''; }; const getLockedPrice = (c: Category) => { if (APP_VARIANT === 'family') { const teensCategories = ['movies', 'sports', 'music', 'videogames', 'superheroes']; return teensCategories.includes(c) ? '$0.99' : '$1.99'; } return c === 'dirty' ? '$2.99' : '$4.99'; }; return (<button key={cat} onClick={() => handleCategoryClick(cat)} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border-2 ${isSelected ? `border-pink-500 ${isDark ? 'bg-neutral-800' : 'bg-white'}` : `${themeColors.button} border-transparent opacity-90`}`}><div className="text-left"><div className="font-bold text-lg flex items-center gap-2">{getCatName(cat)}{isLocked && <Lock size={16} className="text-orange-500" />}</div><div className={`text-xs ${themeColors.textSub}`}>{getCatDesc(cat)}</div></div>{isSelected ? <CheckCircle className="text-pink-500" /> : (isLocked ? <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">{getLockedPrice(cat)}</div> : null)}</button>); })}</div></div>
        <button onClick={() => updateSettings('penaltyForSkip', !localSettings.penaltyForSkip)} className={`w-full p-4 rounded-xl flex items-center justify-between ${themeColors.button}`}><span className="font-bold">{t.penaltySkip}</span><div className={`w-12 h-6 rounded-full relative transition-colors ${localSettings.penaltyForSkip ? 'bg-pink-500' : 'bg-neutral-600'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.penaltyForSkip ? 'left-7' : 'left-1'}`} /></div></button>
        <button onClick={() => updateSettings('soundEnabled', !localSettings.soundEnabled)} className={`w-full p-4 rounded-xl flex items-center justify-between ${themeColors.button}`}><div className="flex items-center gap-2"><Volume2 size={20} /><span className="font-bold">{t.sounds}</span></div><div className={`w-12 h-6 rounded-full relative transition-colors ${localSettings.soundEnabled ? 'bg-green-500' : 'bg-neutral-600'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.soundEnabled ? 'left-7' : 'left-1'}`} /></div></button>
        <div className="fixed left-6 right-6 z-10" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}><button onClick={handleSave} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-neutral-200 shadow-xl border border-neutral-200 touch-manipulation">{t.save}</button></div>
      </div>
    </div>
  );
});
SettingsView.displayName = 'SettingsView';

const PreRoundView = memo(({ t, themeColors, isDark, team, allTeams, onStartRound, onExit }: PreRoundViewProps) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // useMemo MUST be called before any conditional returns (Rules of Hooks)
  const sortedTeams = useMemo(() => 
    allTeams ? [...allTeams].sort((a: Team, b: Team) => b.score - a.score) : [], 
    [allTeams]
  );
  
  // Early return AFTER hooks
  if (!team || !team.players) return <div className="p-10">Loading...</div>;
  
  const currentPlayerName = team.players[team.nextPlayerIndex]?.name || "Player";

  return (
    <div className={`min-h-[100dvh] p-4 flex flex-col font-sans ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
       <div className="flex justify-between items-center mb-4">
          <button onClick={() => setShowExitConfirm(true)} className={`p-2 rounded-full transition-colors ${themeColors.button}`}><LogOut size={20} className={themeColors.textSub} /></button>
          <h2 className="text-lg font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">{t.preRoundTitle}</h2>
          <div className="w-10"></div>
       </div>
       <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto gap-6">
          <div className={`w-full p-6 rounded-3xl border shadow-xl flex flex-col items-center ${themeColors.card} ${themeColors.border}`}><div className={`text-xs font-bold uppercase tracking-wider mb-2 ${themeColors.textSub}`}>{t.nextTeam}</div><div className="text-3xl font-black mb-2 text-center leading-tight break-words line-clamp-2 max-w-full px-2 overflow-hidden">{team.name}</div><div className={`mt-2 mb-4 px-4 py-1 rounded-full text-sm font-bold bg-pink-500 text-white shadow-lg animate-pulse max-w-[90%] truncate`}>{currentPlayerName}</div><div className={`px-4 py-2 rounded-xl font-bold text-xl flex items-center gap-2 ${isDark ? 'bg-neutral-900' : 'bg-gray-100'}`}><Trophy size={20} className="text-yellow-500" /><span>{team.score}</span></div></div>
          <div className="relative w-full flex items-center justify-center py-4"><div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed ${themeColors.border}`}><Hand size={20} className={themeColors.textSub} /></div><div className="text-center z-10 w-full px-12"><span className={`block text-xs font-bold uppercase tracking-widest ${themeColors.textSub} mb-1`}>{t.passPhone}</span><span className="font-black text-4xl leading-none block">{currentPlayerName}</span></div></div>
          <div className="w-full"><div className={`text-xs font-bold uppercase tracking-widest mb-2 pl-2 ${themeColors.textSub}`}>{t.leaderboard}</div><div className={`rounded-xl overflow-hidden border ${themeColors.border} max-h-32 overflow-y-auto`}>{sortedTeams.map((tm: any, i: number) => (<div key={tm.id} className={`flex justify-between px-4 py-2 text-sm ${isDark ? (i % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-800/50') : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}><span className={`font-bold truncate pr-2 ${tm.id === team.id ? 'text-pink-500' : ''}`}>{i+1}. {tm.name}</span><span className="font-mono font-bold opacity-70 shrink-0">{tm.score}</span></div>))}</div></div>
       </div>
       <div className="mt-4 w-full max-w-md mx-auto"><button onClick={onStartRound} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-600 shadow-lg active:scale-[0.98] transition-transform touch-manipulation">{t.ready}</button></div>
       {showExitConfirm && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"><div className={`p-6 rounded-2xl w-full max-w-xs text-center border shadow-2xl ${themeColors.card} ${themeColors.border}`}><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} className="text-red-600" /></div><h3 className={`text-xl font-bold mb-2 ${themeColors.text}`}>{t.exitConfirmTitle}</h3><p className={`mb-6 text-sm ${themeColors.textSub}`}>{t.exitConfirmDesc}</p><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowExitConfirm(false)} className={`py-3 rounded-xl font-bold text-sm ${themeColors.button}`}>{t.cancel}</button><button onClick={onExit} className="bg-red-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg">{t.yesExit}</button></div></div></div>)}
    </div>
  )
});

const GameView = memo(({ t, themeColors, isDark, team, word, duration, isLastWord, onAction, penaltyEnabled, soundEnabled, onTimeUp, onExitGame, onEndRoundImmediately }: GameViewProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const bgClass = isLastWord ? 'bg-red-600 text-white' : (isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900');
  const currentPlayerName = team?.players?.[team.nextPlayerIndex]?.name || "";

  useEffect(() => {
    document.body.style.backgroundColor = isLastWord ? '#dc2626' : themeColors.hexBg;
    return () => { document.body.style.backgroundColor = themeColors.hexBg; };
  }, [isLastWord, themeColors.hexBg]);

  return (
    <div className={`min-h-[100dvh] p-6 font-sans flex flex-col transition-colors duration-300 ${bgClass} select-none relative`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
       <div className="flex justify-between items-start mb-6 pt-2">
         <button onClick={() => setIsPaused(true)} className={`p-3 rounded-full transition-colors ${isLastWord ? 'bg-white/20 text-white hover:bg-white/30' : (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50')}`}><Pause size={24} /></button>
         <GameTimer duration={duration} onTimeUp={onTimeUp} soundEnabled={soundEnabled} isActive={true} isLastWord={isLastWord} isPaused={isPaused} />
       </div>
       <div className="text-center mb-4"><div className={`font-bold text-sm uppercase tracking-wider ${isLastWord ? 'opacity-80' : 'opacity-60'}`}>{t.explaining}</div><div className="text-2xl font-bold leading-tight truncate max-w-[80vw] mx-auto">{team?.name || ''}</div><div className="text-sm font-bold mt-1 opacity-80 truncate max-w-[60vw] mx-auto">{currentPlayerName}</div></div>
       <WordCard word={word} isLastWord={isLastWord} t={t} />
       <GameControls onAction={onAction} penaltyEnabled={penaltyEnabled} isDark={isDark} isLastWord={isLastWord} t={t} />
       {isPaused && (<div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm"><div className="w-full max-w-sm space-y-4"><h2 className="text-white text-3xl font-black text-center mb-8">{t.pauseTitle}</h2><button onClick={() => setIsPaused(false)} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"><Play size={24} fill="currentColor" /> {t.resume}</button><button onClick={() => { setIsPaused(false); onEndRoundImmediately(); }} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"><FastForward size={24} /> {t.finishRound}</button><button onClick={onExitGame} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"><Home size={24} /> {t.exitGame}</button></div></div>)}
    </div>
  );
});

const VerificationView = memo(({ words, onComplete, t, themeColors, isDark, penaltyEnabled, soundEnabled }: VerificationViewProps) => {
  const [editedWords, setEditedWords] = useState(words);
  const toggleStatus = (index: number) => {
    const newWords = [...editedWords];
    const newStatus = newWords[index].status === 'guessed' ? 'skipped' : 'guessed';
    newWords[index].status = newStatus;
    if (soundEnabled) soundManager.play(newStatus === 'guessed' ? 'correct' : 'skip');
    setEditedWords(newWords);
  };
  const guessed = editedWords.filter((w: any) => w.status === 'guessed').length;
  const skipped = editedWords.filter((w: any) => w.status === 'skipped').length;
  const total = guessed - (penaltyEnabled ? skipped : 0);

  return (
    <div className={`min-h-[100dvh] p-6 font-sans flex flex-col ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
       <h2 className="text-2xl font-bold mb-2">{t.verification}</h2>
       <p className={`text-sm mb-6 ${themeColors.textSub}`}>{t.verificationDesc}</p>
       <div className={`sticky top-0 z-10 py-4 mb-4 backdrop-blur-md border-b ${themeColors.border} flex justify-between items-center`}><span className="font-bold text-lg">{t.roundScore}</span><span className={`text-3xl font-black ${total > 0 ? 'text-green-500' : 'text-red-500'}`}>{total > 0 ? '+' : ''}{total}</span></div>
       <div className="flex-1 overflow-y-auto space-y-2 mb-6">
         {editedWords.map((item: any, idx: number) => (<button key={idx} onClick={() => toggleStatus(idx)} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border touch-manipulation ${item.status === 'guessed' ? (isDark ? 'bg-green-900/30 border-green-500/50' : 'bg-green-100 border-green-200 text-green-900') : (isDark ? 'bg-red-900/30 border-red-500/50' : 'bg-red-100 border-red-200 text-red-900')}`}><span className="font-bold text-lg text-left">{item.word}</span>{item.status === 'guessed' ? <Check className="text-green-500 shrink-0" /> : <X className="text-red-500 shrink-0" />}</button>))}
       </div>
       <button onClick={() => onComplete(editedWords)} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-neutral-200 border border-neutral-200 shadow-xl touch-manipulation" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>{t.confirm}</button>
    </div>
  );
});

const RoundResultView = memo(({ t, themeColors, team, words, penaltyEnabled, onNext }: RoundResultViewProps) => {
  const guessed = words.filter((w: any) => w.status === 'guessed').length;
  const skipped = words.filter((w: any) => w.status === 'skipped').length;
  const total = guessed - (penaltyEnabled ? skipped : 0);
  const playedPlayerName = team?.players?.[(team.nextPlayerIndex - 1 + team.players.length) % team.players.length]?.name || "";

  return (
    <div className={`min-h-[100dvh] p-6 flex flex-col items-center justify-center font-sans ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-1 opacity-60 uppercase tracking-widest">{t.roundOver}</h2>
        <div className={`text-7xl font-black mb-8 tracking-tighter ${total >= 0 ? 'text-green-500' : 'text-red-500'}`}>{total > 0 ? '+' : ''}{total}</div>
        <div className={`w-full rounded-3xl p-6 border shadow-xl ${themeColors.card} ${themeColors.border}`}>
            <div className={`flex justify-between items-center mb-6 pb-4 border-b ${themeColors.border}`}><div className="text-left flex-1 min-w-0 pr-4"><div className={`text-xs font-bold uppercase tracking-wider ${themeColors.textSub}`}>{t.explained}</div><div className="font-black text-xl truncate">{team?.name}</div><div className="text-sm font-bold text-pink-500 truncate">{playedPlayerName}</div></div><div className={`text-2xl font-black shrink-0 ${themeColors.text}`}>{team?.score}</div></div>
            <div className="space-y-3"><div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10"><span className="font-bold text-green-600 flex items-center gap-2"><Check size={18}/> {t.guessed}</span><span className="font-black text-green-600 text-xl">{guessed}</span></div><div className="flex justify-between items-center p-3 rounded-xl bg-red-500/10"><span className="font-bold text-red-600 flex items-center gap-2"><X size={18}/> {t.skip}</span><span className="font-black text-red-600 text-xl">{skipped}</span></div>{penaltyEnabled && skipped > 0 && <div className="text-center text-xs text-red-500 font-bold mt-1">{t.penaltySkip}</div>}</div>
        </div>
      </div>
      <div className="w-full max-w-sm mt-6" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}><button onClick={onNext} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-lg active:scale-[0.98] transition-all touch-manipulation">{t.next}</button></div>
    </div>
  );
});

// Light component - no memo needed
const StatsRow = ({ player, rank, t, isDark }: StatsRowProps) => {
    const avg = player.turnsPlayed ? ((player.guessedCount || 0) / player.turnsPlayed).toFixed(1) : "0.0";
    return (
        <div className={`flex items-center justify-between p-3 text-sm rounded-xl mb-2 ${isDark ? 'bg-neutral-800' : 'bg-white shadow-sm border border-gray-100'}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${rank === 1 ? 'bg-yellow-400 text-black' : (rank===2 ? 'bg-gray-300 text-black' : (rank===3 ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-500'))}`}>{rank}</div>
                <div className="flex flex-col overflow-hidden"><span className="font-bold truncate leading-tight">{player.name}</span><span className="text-[10px] opacity-60 truncate">{player.teamName}</span></div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <div className={`flex flex-col items-center justify-center w-10 p-1 rounded-lg ${isDark ? 'bg-neutral-900' : 'bg-gray-50'}`}><span className="text-[9px] font-bold uppercase opacity-50">{t.statTurns}</span><span className="font-bold">{player.turnsPlayed || 0}</span></div>
                <div className={`flex flex-col items-center justify-center w-10 p-1 rounded-lg ${isDark ? 'bg-neutral-900' : 'bg-gray-50'}`}><span className="text-[9px] font-bold uppercase opacity-50">{t.statCorrect}</span><span className="font-bold text-green-500">{player.guessedCount || 0}</span></div>
                <div className={`flex flex-col items-center justify-center w-12 p-1 rounded-lg ${isDark ? 'bg-neutral-700' : 'bg-neutral-100'}`}><span className="text-[9px] font-bold uppercase opacity-50">{t.statAvg}</span><span className="font-bold">{avg}</span></div>
            </div>
        </div>
    );
};

const WinnerView = memo(({ t, themeColors, isDark, history, teams, onPlayAgain }: WinnerViewProps) => {
  const winner = history[0] || { winner: '?', score: 0 }; 
  const sortedTeams = useMemo(() => [...teams].sort((a: any, b: any) => b.score - a.score), [teams]);
  const allPlayers = useMemo(() => { const players = teams.flatMap((t:Team) => t.players.map(p => ({...p, teamName: t.name}))); const getAvg = (p: Player) => (p.turnsPlayed ? (p.guessedCount || 0) / p.turnsPlayed : 0); return players.sort((a: any, b: any) => getAvg(b) - getAvg(a)); }, [teams]);

  return (
     <div className={`min-h-[100dvh] p-6 flex flex-col items-center justify-center font-sans text-center ${themeColors.text} overflow-y-auto`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
       <div className="py-10 w-full max-w-sm">
        <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce mx-auto" />
        <h2 className="text-4xl font-black mb-2">{t.winner}</h2>
        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8 leading-tight break-words w-full">{winner.winner}</div>
        <div className="w-full mb-8"><h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${themeColors.textSub}`}>{t.leaderboard}</h3><div className={`rounded-xl overflow-hidden border ${themeColors.border}`}>{sortedTeams.map((team: any, i: number) => (<div key={team.id} className={`flex justify-between items-center p-3 text-sm text-left ${isDark ? (i % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-800/50') : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}><span className={`font-bold flex-1 pr-2 break-words ${i === 0 ? 'text-yellow-500' : ''}`}>{i+1}. {team.name}</span><span className="font-mono font-bold whitespace-nowrap">{team.score}</span></div>))}</div></div>
        <div className="w-full mb-8"><h3 className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2 ${themeColors.textSub}`}><Users size={14} /> {t.bestPlayers}</h3><div className={`rounded-xl border ${themeColors.border} max-h-64 overflow-y-auto p-2 bg-neutral-100/50 dark:bg-neutral-900/30`}>{allPlayers.map((p: Player & { teamName: string }, i: number) => (<StatsRow key={p.id} player={p} rank={i+1} t={t} isDark={isDark} />))}</div></div>
        <button onClick={onPlayAgain} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-neutral-200 shadow-xl border border-neutral-200 touch-manipulation mb-[env(safe-area-inset-bottom)]">{t.playAgain}</button>
       </div>
     </div>
  );
});

const HistoryView = memo(({ t, themeColors, isDark, history, onClear, onBack }: HistoryViewProps) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  
  if (selectedItem) {
     const teams = selectedItem.teams || [];
     const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
     const sortedPlayers = teams.flatMap(t => t.players.map(p => ({...p, teamName: t.name}))).sort((a:any, b:any) => { const avgA = a.turnsPlayed ? (a.guessedCount || 0) / a.turnsPlayed : 0; const avgB = b.turnsPlayed ? (b.guessedCount || 0) / b.turnsPlayed : 0; return avgB - avgA; });

     return (
       <div className={`min-h-[100dvh] p-6 font-sans ${themeColors.text} flex flex-col`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
         <div className="flex items-center justify-between mb-8"><button onClick={() => setSelectedItem(null)} className="p-2 -ml-2"><ChevronLeft size={32} /></button><h2 className="text-xl font-bold">{t.gameStats}</h2><div className="w-8"></div></div>
         <div className="flex-1 space-y-8 overflow-y-auto pb-8">
            <div className="text-center"><div className={`text-sm font-bold opacity-60`}>{selectedItem.date}</div><div className="text-3xl font-black mt-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{selectedItem.winner}</div></div>
            {teams.length > 0 && (<div className="w-full"><h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${themeColors.textSub}`}>{t.leaderboard}</h3><div className={`rounded-xl overflow-hidden border ${themeColors.border}`}>{sortedTeams.map((team: any, i: number) => (<div key={team.id} className={`flex justify-between p-3 text-sm ${isDark ? (i % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-800/50') : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}><span className={`font-bold ${i === 0 ? 'text-yellow-500' : ''}`}>{i+1}. {team.name}</span><span className="font-mono font-bold">{team.score}</span></div>))}</div></div>)}
            {teams.length > 0 && (<div className="w-full"><h3 className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${themeColors.textSub}`}><Users size={14} /> {t.bestPlayers}</h3><div className={`rounded-xl border ${themeColors.border} p-2 bg-neutral-100/50 dark:bg-neutral-900/30`}>{sortedPlayers.map((p: Player & { teamName: string }, i: number) => (<StatsRow key={p.id} player={p} rank={i+1} t={t} isDark={isDark} />))}</div></div>)}
         </div>
         <div className="mb-[env(safe-area-inset-bottom)] pt-4"><button onClick={() => setSelectedItem(null)} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg shadow-xl border border-neutral-200">{t.close}</button></div>
       </div>
     );
  }

  return (
    <div className={`min-h-[100dvh] p-6 font-sans ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
      <div className="flex items-center gap-4 mb-8"><button onClick={onBack} className="p-2 -ml-2"><ChevronLeft size={32} /></button><h2 className="text-3xl font-bold">{t.history}</h2></div>
      {history.length === 0 ? (<div className="text-center text-neutral-500 mt-20"><Calendar size={48} className="mx-auto mb-4 opacity-50" /><p>{t.historyEmpty}</p></div>) : (
        <div className="space-y-4 max-w-md mx-auto pb-10">
           {history.map((item: HistoryItem) => (
             <button key={item.id} onClick={() => setSelectedItem(item)} className={`w-full p-4 rounded-xl flex flex-col gap-2 border text-left transition-all active:scale-[0.98] ${themeColors.card} ${themeColors.border} shadow-sm hover:shadow-md`}>
               <div className="flex items-center justify-between w-full"><div className="flex-1 min-w-0 pr-4"><div className="font-bold text-lg truncate text-yellow-500">{item.winner} 🏆</div><div className={`text-xs ${themeColors.textSub} truncate font-medium mt-0.5`}>{item.teamCount} Teams</div><div className={`text-[10px] ${themeColors.textSub} mt-1`}>{item.date}</div></div><div className={`shrink-0 px-3 py-1 rounded-lg font-mono font-bold text-lg ${isDark ? 'bg-neutral-900' : 'bg-gray-100'}`}>{item.score}</div></div>
             </button>
           ))}
           <button onClick={onClear} className="w-full py-4 text-red-500 font-bold text-sm mt-8 opacity-50 hover:opacity-100 touch-manipulation flex items-center justify-center gap-2"><Trash2 size={16}/> Clear History</button>
        </div>
      )}
    </div>
  );
});
HistoryView.displayName = 'HistoryView';

const RulesView = memo(({ t, themeColors, onBack }: RulesViewProps) => {
  const RuleBlock = ({icon, title, desc}: any) => (<div className="flex gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${themeColors.card} ${themeColors.border}`}>{icon}</div><div><h3 className={`font-bold mb-1 ${themeColors.text}`}>{title}</h3><p className="text-sm leading-relaxed">{desc}</p></div></div>);
  return (
    <div className={`min-h-[100dvh] p-6 font-sans ${themeColors.text}`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
      <div className="flex items-center gap-4 mb-8"><button onClick={onBack} className="p-2 -ml-2"><ChevronLeft size={32} /></button><h2 className="text-3xl font-bold">{t.rulesTitle}</h2></div>
      <div className={`space-y-6 max-w-md mx-auto ${themeColors.textSub}`}>
         <RuleBlock icon={<Target size={24} className="text-pink-500"/>} title={t.ruleGoalTitle} desc={t.ruleGoalDesc} />
         <RuleBlock icon={<Users size={24} className="text-indigo-500"/>} title={t.rule1Title} desc={t.rule1Desc} />
         <RuleBlock icon={<Play size={24} className="text-green-500"/>} title={t.rule2Title} desc={t.rule2Desc} />
         <RuleBlock icon={<CheckCircle size={24} className="text-blue-500"/>} title={t.rule3Title} desc={t.rule3Desc} />
         <div className={`p-4 rounded-xl border border-red-500/30 ${themeColors.card}`}><h3 className={`font-bold mb-2 flex items-center gap-2 ${themeColors.text}`}><AlertCircle size={20} className="text-red-500"/> {t.rule4Title}</h3><ul className="list-disc pl-5 space-y-1 text-sm"><li>{t.ruleNoRoot}</li><li>{t.ruleNoTrans}</li><li>{t.ruleNoGestures}</li><li>{t.ruleNoPointing}</li></ul></div>
         <RuleBlock icon={<Trophy size={24} className="text-yellow-500"/>} title={t.rule5Title} desc={t.rule5Desc} />
      </div>
    </div>
  );
});
RulesView.displayName = 'RulesView';

const AppContent = () => {
  const { gameState, setGameState, settings, setSettings, activeTeam, currentWord, currentRoundWords, t, themeColors, actions, history, setHistory, ownedCategories, buyProduct, handleRestorePurchases } = useGameEngine();
  const commonProps = { t, themeColors, isDark: settings.theme === 'dark' };
  useEffect(() => { document.body.style.backgroundColor = themeColors.hexBg; }, [themeColors.hexBg]);

  return (
    <div className={`${themeColors.bg} transition-colors duration-300 min-h-screen`}>
      {gameState === 'start' && <StartView {...commonProps} onNavigate={setGameState} />}
      {gameState === 'settings' && <SettingsView {...commonProps} initialSettings={settings} onBack={() => setGameState('start')} onSave={(newS: GameSettings) => actions.startGame(newS)} onImmediateChange={(upd: any) => setSettings((p:any) => ({...p, ...upd}))} ownedCategories={ownedCategories} buyProduct={buyProduct} onRestore={handleRestorePurchases} />}
      {gameState === 'preRound' && <PreRoundView {...commonProps} team={activeTeam} allTeams={settings.teams} onStartRound={actions.startRound} onExit={() => setGameState('start')} />}
      {(gameState === 'game' || gameState === 'lastWord') && <GameView {...commonProps} team={activeTeam} word={currentWord} duration={gameState === 'lastWord' ? settings.lastWordDuration : settings.roundDuration} isLastWord={gameState === 'lastWord'} onAction={actions.handleWordAction} penaltyEnabled={settings.penaltyForSkip} soundEnabled={settings.soundEnabled} onTimeUp={actions.handleTimeUp} onExitGame={() => setGameState('start')} onEndRoundImmediately={actions.endRoundImmediately} />}
      {gameState === 'verification' && <VerificationView {...commonProps} words={currentRoundWords} onComplete={actions.handleVerificationComplete} penaltyEnabled={settings.penaltyForSkip} soundEnabled={settings.soundEnabled} />}
      {gameState === 'roundResult' && <RoundResultView {...commonProps} team={activeTeam} words={currentRoundWords} penaltyEnabled={settings.penaltyForSkip} onNext={actions.handleNextRound} />}
      {gameState === 'winner' && <WinnerView {...commonProps} history={history} teams={settings.teams} onPlayAgain={() => setGameState('start')} />}
      {gameState === 'history' && <HistoryView {...commonProps} history={history} onClear={() => { setHistory([]); localStorage.removeItem('guessus_history'); }} onBack={() => setGameState('start')} />}
      {gameState === 'rules' && <RulesView {...commonProps} onBack={() => setGameState('start')} />}
    </div>
  );
};

// Main App wrapped in Error Boundary for crash protection
const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
