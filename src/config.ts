// App Variant Configuration
// Вариант приложения определяется при сборке через VITE_APP_VARIANT

import { Category, AdultCategory, FamilyCategory } from './words';

export type AppVariant = 'family' | 'adult';
export type { Category, AdultCategory, FamilyCategory };

// Определяем вариант из environment variable (default: adult)
export const APP_VARIANT: AppVariant = 
  (import.meta.env.VITE_APP_VARIANT as AppVariant) || 'adult';

export const IS_FAMILY = APP_VARIANT === 'family';
export const IS_ADULT = APP_VARIANT === 'adult';

// Конфигурация для каждого варианта
interface VariantConfig {
  appId: string;
  appName: string;
  tagline: string;
  ageRating: '4+' | '9+' | '12+' | '17+';
  availableCategories: Category[];
  defaultCategories: Category[];
  showPaywall: boolean;
  showAdultBadge: boolean;
  crossPromoAppId: string;
  crossPromoText: {
    en: string;
    ru: string;
    es: string;
    ua: string;
  };
}

export const VARIANT_CONFIG: Record<AppVariant, VariantConfig> = {
  family: {
    appId: 'com.chatrixllc.guessus',
    appName: 'Guess Us',
    tagline: 'Family Fun',
    ageRating: '4+',
    // All 15 categories: Kids (5 free) + Teens (5 paid) + Adults (5 paid)
    availableCategories: [
      // Kids Pack - FREE
      'animals', 'food', 'cartoons', 'toys', 'nature',
      // Teens Pack - $0.99
      'movies', 'sports', 'music', 'videogames', 'superheroes',
      // Adults Pack - $1.99
      'travel', 'professions', 'history', 'science', 'brands'
    ],
    // Kids categories are free by default
    defaultCategories: ['animals', 'food', 'cartoons', 'toys', 'nature'],
    showPaywall: true, // Family now has IAP too
    showAdultBadge: false,
    crossPromoAppId: 'com.chatrixllc.guessus.adult',
    crossPromoText: {
      en: 'Want spicier words? Try Guess Us 18+!',
      ru: 'Хотите острее? Попробуйте Guess Us 18+!',
      es: '¿Quieres palabras más picantes? ¡Prueba Guess Us 18+!',
      ua: 'Хочете гостріше? Спробуйте Guess Us 18+!'
    }
  },
  adult: {
    appId: 'com.chatrixllc.guessus.adult',
    appName: 'Guess Us',
    tagline: '18+ Party Game',
    ageRating: '17+',
    availableCategories: ['party', 'dirty', 'extreme'],
    defaultCategories: ['party'],
    showPaywall: true,
    showAdultBadge: true,
    crossPromoAppId: 'com.chatrixllc.guessus',
    crossPromoText: {
      en: 'Play with family? Get Guess Us Family!',
      ru: 'Играете с семьёй? Скачайте Guess Us Family!',
      es: '¿Juegas en familia? ¡Descarga Guess Us Family!',
      ua: 'Граєте з родиною? Завантажте Guess Us Family!'
    }
  }
};

// Активная конфигурация для текущей сборки
export const CONFIG = VARIANT_CONFIG[APP_VARIANT];

// Helper: проверить, доступна ли категория в текущем варианте
export function isCategoryAvailable(category: Category): boolean {
  return CONFIG.availableCategories.includes(category);
}

// Helper: получить URL для cross-promotion
export function getCrossPromoUrl(): string {
  return `https://apps.apple.com/app/${CONFIG.crossPromoAppId}`;
}
