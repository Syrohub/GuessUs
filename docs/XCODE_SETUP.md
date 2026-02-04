# Настройка Xcode для двух версий приложения

## Обзор

Проект поддерживает две версии приложения:
- **Guess Us** (Family) - семейная версия (4+)
- **Guess Us 18+** (Adult) - взрослая версия (17+)

## Структура конфигурации

```
ios/App/App/Config/
├── Family.xcconfig    # Настройки для семейной версии
├── Adult.xcconfig     # Настройки для взрослой версии
└── Active.xcconfig    # Активная конфигурация (генерируется автоматически)
```

## Настройка Xcode (один раз)

### Шаг 1: Добавить Config файлы в проект

1. Откройте `ios/App/App.xcworkspace` в Xcode
2. В Project Navigator кликните правой кнопкой на папку `App`
3. Выберите "Add Files to 'App'..."
4. Выберите папку `Config` (с файлами xcconfig)
5. Убедитесь что отмечено "Create groups" и target "App"
6. Нажмите "Add"

### Шаг 2: Подключить Active.xcconfig к проекту

1. В Project Navigator кликните на проект "App" (синяя иконка)
2. Выберите PROJECT (не TARGET!) → "App"
3. Перейдите на вкладку "Info"
4. В секции "Configurations" раскройте Debug и Release
5. Для каждой конфигурации (Debug/Release) в колонке "App":
   - Кликните на выпадающий список
   - Выберите "Active" (из папки Config)

### Шаг 3: Настроить Build Settings (опционально)

Если xcconfig не применяется автоматически, проверьте в Build Settings:

1. Выберите TARGET → App
2. Найдите "Product Bundle Identifier"
3. Должно быть `$(PRODUCT_BUNDLE_IDENTIFIER)` (использует значение из xcconfig)

## Сборка приложений

### Из командной строки (рекомендуется)

```bash
# Собрать Family версию
npm run build:family

# Собрать Adult версию  
npm run build:adult

# Затем открыть Xcode
npx cap open ios
```

Скрипт автоматически:
- Копирует правильный .env файл
- Копирует правильный capacitor.config.ts
- Генерирует Active.xcconfig с нужным вариантом
- Собирает веб-приложение
- Синхронизирует с iOS

### Из Xcode

После запуска `npm run build:family` или `npm run build:adult`:
1. Откройте Xcode: `npx cap open ios`
2. Выберите симулятор или устройство
3. Нажмите Run (Cmd+R)

## Иконки приложений

Иконки хранятся в:
- `Assets.xcassets/AppIconFamily.appiconset/` - для Family версии
- `Assets.xcassets/AppIconAdult.appiconset/` - для Adult версии

Замените `AppIcon-1024.png` на свои иконки (1024x1024 px).

## Bundle ID

- Family: `com.chatrixllc.guessus`
- Adult: `com.chatrixllc.guessus.adult`

Эти ID нужно зарегистрировать в Apple Developer Portal.

## Важно

- **НЕ** редактируйте `Active.xcconfig` вручную - он генерируется скриптом
- После переключения варианта в Xcode может потребоваться Clean Build (Cmd+Shift+K)
- При первой сборке убедитесь что выбран правильный Team в Signing & Capabilities
