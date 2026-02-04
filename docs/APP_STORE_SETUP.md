# Настройка App Store Connect

## Обзор

Вам нужно создать **два приложения** в App Store Connect:
1. **Guess Us** (Family) - com.chatrixllc.guessus (4+)
2. **Guess Us 18+** (Adult) - com.chatrixllc.guessus.adult (17+)

## Шаг 1: Регистрация Bundle IDs в Apple Developer

1. Войдите в [Apple Developer Portal](https://developer.apple.com)
2. Перейдите в Certificates, Identifiers & Profiles → Identifiers
3. Нажмите "+" и создайте два App ID:

### Family версия:
- **Description**: Guess Us Family
- **Bundle ID**: `com.chatrixllc.guessus` (Explicit)
- **Capabilities**: (по умолчанию достаточно)

### Adult версия:
- **Description**: Guess Us Adult
- **Bundle ID**: `com.chatrixllc.guessus.adult` (Explicit)
- **Capabilities**:
  - ✅ In-App Purchase (обязательно для IAP)

## Шаг 2: Создание приложений в App Store Connect

1. Войдите в [App Store Connect](https://appstoreconnect.apple.com)
2. Перейдите в "Мои приложения" → "+"

### Family версия:
- **Платформы**: iOS
- **Название**: Guess Us
- **Основной язык**: English (U.S.) или Russian
- **Идентификатор пакета**: com.chatrixllc.guessus
- **SKU**: guessus-family

### Adult версия:
- **Платформы**: iOS
- **Название**: Guess Us 18+
- **Основной язык**: English (U.S.) или Russian
- **Идентификатор пакета**: com.chatrixllc.guessus.adult
- **SKU**: guessus-adult

## Шаг 3: Настройка In-App Purchases (только Adult версия)

1. В приложении "Guess Us 18+" перейдите в Features → In-App Purchases
2. Создайте три продукта:

### Dirty Pack
- **Тип**: Non-Consumable (Непотребляемый)
- **Reference Name**: Dirty Pack
- **Product ID**: `com.chatrixllc.guessus.adult.dirty`
- **Цена**: Tier 3 ($2.99)
- **Локализации**:
  - EN: "Dirty Pack" / "Unlock intimate and passionate word categories"
  - RU: "Грязные мысли" / "Откройте интимные и страстные категории слов"

### Extreme Pack
- **Тип**: Non-Consumable
- **Reference Name**: Extreme Pack
- **Product ID**: `com.chatrixllc.guessus.adult.extreme`
- **Цена**: Tier 5 ($4.99)
- **Локализации**:
  - EN: "Extreme Pack" / "For the boldest players only"
  - RU: "Без границ 18+" / "Только для самых смелых"

### Bundle (All Access)
- **Тип**: Non-Consumable
- **Reference Name**: All Access Bundle
- **Product ID**: `com.chatrixllc.guessus.adult.bundle`
- **Цена**: Tier 6 ($5.99)
- **Локализации**:
  - EN: "All Access Bundle" / "Unlock all premium word categories"
  - RU: "Полный доступ" / "Откройте все премиум категории"

## Шаг 4: Age Rating (Возрастной рейтинг)

### Family версия (4+):
В разделе "App Information" → "Age Rating" ответьте:
- Cartoon or Fantasy Violence: None
- Realistic Violence: None
- Sexual Content and Nudity: None
- Profanity or Crude Humor: None
- Alcohol, Tobacco, or Drug Use: None
- Mature/Suggestive Themes: None
- Simulated Gambling: None
- Horror/Fear Themes: None
- Medical/Treatment Information: None
- Contest Information: None
- Unrestricted Web Access: No

**Результат**: 4+ (Rated 4+)

### Adult версия (17+):
- Cartoon or Fantasy Violence: None
- Realistic Violence: None
- Sexual Content and Nudity: **Frequent/Intense**
- Profanity or Crude Humor: **Frequent/Intense**
- Alcohol, Tobacco, or Drug Use: **Frequent/Intense**
- Mature/Suggestive Themes: **Frequent/Intense**
- Simulated Gambling: None
- Horror/Fear Themes: None
- Medical/Treatment Information: None
- Contest Information: None
- Unrestricted Web Access: No

**Результат**: 17+ (Rated 17+)

## Шаг 5: App Information

### Обе версии:
- **Category**: Games → Party
- **Secondary Category**: Entertainment (опционально)
- **Content Rights**: Does not contain third-party content
- **Age Rating**: Как указано выше

### Privacy Policy:
- Ссылка на вашу Privacy Policy (обязательно!)
- Например: `https://guessus.app/privacy` или GitHub Pages

## Шаг 6: App Store Listing

### Family версия:
```
Название: Guess Us
Подзаголовок: Family Party Game

Описание:
Guess Us - веселая игра для всей семьи! Объясняйте слова жестами 
и мимикой, не используя запретные слова.

Категории:
🎬 Кино - фильмы, актёры, персонажи
🍕 Еда - блюда и продукты
🐶 Животные - звери и птицы
⚽ Спорт - виды спорта
✈️ Путешествия - страны и города
👨‍💼 Профессии - работа и занятия

Особенности:
• 6 тематических категорий
• 2-10 игроков
• Поддержка 4 языков
• Тёмная и светлая тема
• Подсчёт очков и статистика

Ключевые слова: party game, charades, alias, family, words, guess
```

### Adult версия:
```
Название: Guess Us 18+
Подзаголовок: Adult Party Game

Описание:
Guess Us 18+ - дерзкая игра для взрослых компаний! 
Объясняйте пикантные слова, не краснея.

⚠️ Только для взрослых 18+

Категории:
🎉 Вечеринка - алкоголь, клубы, флирт
🔥 Грязные мысли - интимные темы (IAP)
💀 Без границ - только для смелых (IAP)

Особенности:
• Контент 18+
• 2-10 игроков
• In-App Purchases для премиум контента
• Тёмная и светлая тема

Ключевые слова: party game, adult, 18+, drinking, charades
```

## Шаг 7: Скриншоты

### Требования:
- iPhone 6.7" (1290 x 2796) - обязательно
- iPhone 6.5" (1242 x 2688) - опционально
- iPad 12.9" (2048 x 2732) - если поддерживаете iPad

### Для Family версии:
1. Главный экран с "Family Fun"
2. Экран настроек с категориями
3. Игровой процесс
4. Экран победителя

### Для Adult версии:
1. Главный экран с "18+ Party Game"
2. Экран магазина (Paywall)
3. Игровой процесс (без explicit контента на скриншотах!)
4. Экран победителя

**⚠️ Важно**: На скриншотах Adult версии НЕ показывайте явный контент 18+!

## Шаг 8: Тестирование IAP

1. В App Store Connect → Users and Access → Sandbox Testers
2. Создайте тестовый аккаунт (можно использовать несуществующий email)
3. На устройстве: Settings → App Store → выйдите из основного аккаунта
4. При покупке в приложении войдите под sandbox аккаунтом

## Шаг 9: Подача на проверку

1. Загрузите сборку через Xcode или Transporter
2. Выберите сборку в App Store Connect
3. Заполните информацию для проверки:
   - **Demo Account**: не требуется
   - **Notes**: "Party word game for [family/adults]. [For Adult: Contains In-App Purchases for premium content.]"
4. Нажмите "Submit for Review"

## Кросс-промо

После публикации обоих приложений, обновите ссылки кросс-промо в `src/config.ts`:

```typescript
crossPromoAppId: 'ACTUAL_APP_STORE_ID',
```

Или используйте Bundle ID для универсальных ссылок:
```
https://apps.apple.com/app/id[APP_ID]
```

## Checklist

### Family версия:
- [ ] Bundle ID зарегистрирован
- [ ] Приложение создано в ASC
- [ ] Age Rating: 4+
- [ ] Privacy Policy добавлена
- [ ] Скриншоты загружены
- [ ] Описание заполнено
- [ ] Сборка загружена
- [ ] Отправлено на проверку

### Adult версия:
- [ ] Bundle ID зарегистрирован
- [ ] Приложение создано в ASC
- [ ] Age Rating: 17+
- [ ] IAP продукты созданы (dirty, extreme, bundle)
- [ ] Privacy Policy добавлена
- [ ] Скриншоты загружены (без explicit контента!)
- [ ] Описание заполнено
- [ ] Sandbox тестер создан
- [ ] IAP протестированы
- [ ] Сборка загружена
- [ ] Отправлено на проверку
