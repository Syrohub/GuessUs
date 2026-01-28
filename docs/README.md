# Guess Us - Two App Versions

## Быстрый старт

### Разработка

```bash
# Family версия (4+)
npm run dev:family

# Adult версия (17+)
npm run dev:adult
```

### Сборка для iOS

```bash
# Family версия
npm run build:family
npx cap open ios

# Adult версия  
npm run build:adult
npx cap open ios
```

## Структура проекта

```
├── configs/
│   ├── family/
│   │   ├── .env.family          # Переменные окружения
│   │   ├── capacitor.config.ts  # Capacitor конфиг
│   │   └── words-family.json    # Словарь (bundled)
│   └── adult/
│       ├── .env.adult
│       └── capacitor.config.ts
├── ios/App/App/
│   ├── Config/
│   │   ├── Family.xcconfig      # Xcode конфиг Family
│   │   ├── Adult.xcconfig       # Xcode конфиг Adult
│   │   └── Active.xcconfig      # Активный (генерируется)
│   └── Assets.xcassets/
│       ├── AppIconFamily.appiconset/
│       └── AppIconAdult.appiconset/
├── docs/
│   ├── XCODE_SETUP.md           # Настройка Xcode
│   ├── APP_STORE_SETUP.md       # App Store Connect
│   ├── TESTFLIGHT_GUIDE.md      # Тестирование
│   ├── PRIVACY_POLICY.md        # Политика конфиденциальности
│   └── TERMS_OF_SERVICE.md      # Условия использования
└── src/
    ├── config.ts                # Конфигурация вариантов
    ├── utils/purchases.ts       # In-App Purchases
    └── data/words-family.json   # Словарь Family
```

## Варианты приложения

| | Family | Adult |
|---|---|---|
| Bundle ID | com.chatrixllc.guessus | com.chatrixllc.guessus.adult |
| Название | Guess Us | Guess Us 18+ |
| Age Rating | 4+ | 17+ |
| Категории | movies, food, animals, sports, travel, professions | party, dirty*, extreme* |
| IAP | Нет | Да (dirty, extreme, bundle) |

\* Требуют покупки

## Документация

1. [Настройка Xcode](./XCODE_SETUP.md) - как подключить xcconfig
2. [App Store Setup](./APP_STORE_SETUP.md) - регистрация в App Store Connect
3. [TestFlight Guide](./TESTFLIGHT_GUIDE.md) - тестирование
4. [Privacy Policy](./PRIVACY_POLICY.md) - для App Store
5. [Terms of Service](./TERMS_OF_SERVICE.md) - для App Store

## Product IDs для IAP

```
com.chatrixllc.guessus.adult.dirty    - $2.99
com.chatrixllc.guessus.adult.extreme  - $4.99
com.chatrixllc.guessus.adult.bundle   - $5.99
```

## Checklist перед публикацией

- [ ] Обновить email в Privacy Policy и Terms of Service
- [ ] Разместить Privacy Policy онлайн (GitHub Pages, сайт)
- [ ] Зарегистрировать Bundle IDs в Apple Developer
- [ ] Создать приложения в App Store Connect
- [ ] Настроить IAP продукты (Adult версия)
- [ ] Загрузить скриншоты и описания
- [ ] Протестировать через TestFlight
- [ ] Submit for Review
