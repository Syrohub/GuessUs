// --- Core Types ---

export type Category = 'party' | 'dirty' | 'extreme';
export type GameScreenState = 'start' | 'settings' | 'game' | 'preRound' | 'lastWord' | 'verification' | 'roundResult' | 'winner' | 'history' | 'rules';
export type Language = 'en' | 'es' | 'ua' | 'ru';
export type Theme = 'dark' | 'light';
export type SoundType = 'correct' | 'skip' | 'tick' | 'timeup' | 'win' | 'ready';

export interface Player {
  id: string;
  name: string;
  score: number;
  guessedCount?: number;
  turnsPlayed?: number;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  players: Player[];
  nextPlayerIndex: number; 
}

export interface GameSettings {
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

export interface HistoryItem {
  id: string;
  date: string;
  winner: string;
  teamCount: number;
  score: number;
  mvp: string;
  teams?: Team[];
}

export interface RoundWord {
  word: string;
  status: 'guessed' | 'skipped';
}

// --- Monetization Types ---
export type ProductId = 'dirty' | 'extreme' | 'bundle';

export interface Product {
    id: ProductId;
    price: string;
    unlocks: Category[];
}

// --- Theme Colors Interface ---
export interface ThemeColors {
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

// --- Common Props for Components ---
export interface CommonProps {
    t: Record<string, string>;
    themeColors: ThemeColors;
    isDark: boolean;
}
