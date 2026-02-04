# 🎮 Guess Us — TODO для App Store релиза

## 📋 Статус проекта
- **Репо:** https://github.com/Syrohub/GuessUs
- **Стек:** React + TypeScript + Vite + Capacitor
- **Версия:** 1.9.0
- **TestFlight:** ✅ Работает

---

## 🏗️ Архитектура

### Две версии приложения:
| | Family | Adult |
|---|--------|-------|
| Bundle ID | `com.guessus.family` | `com.guessus.adult` |
| Рейтинг | 4+ | 17+ |
| Категории | Все бесплатно | Платные dirty/extreme |
| IAP | ❌ | ✅ |

### In-App Purchases (Adult):
| Продукт | ID | Цена |
|---------|-----|------|
| Dirty Pack | `com.chatrixllc.guessus.adult.dirty` | $2.99 |
| Extreme Pack | `com.chatrixllc.guessus.adult.extreme` | $4.99 |
| Bundle | `com.chatrixllc.guessus.adult.bundle` | $5.99 |

---

## ✅ Что уже сделано

- [x] Основная игровая механика
- [x] Многоязычность (EN, RU, ES, UA)
- [x] Тёмная/светлая тема
- [x] Звуковые эффекты + haptics
- [x] Система команд и игроков
- [x] История игр
- [x] IAP интеграция (cordova-plugin-purchase)
- [x] Два варианта сборки (family/adult)
- [x] TestFlight деплой
- [x] Документация (App Store Setup, Privacy Policy, Terms)

---

## 🚀 TODO для App Store релиза

### 1. App Store Connect — Проверить настройки
- [ ] Bundle ID зарегистрирован: `com.guessus.family`
- [ ] Bundle ID зарегистрирован: `com.guessus.adult`
- [ ] Приложение создано в App Store Connect (Family)
- [ ] Приложение создано в App Store Connect (Adult)
- [ ] IAP продукты созданы и **approved** (Adult версия)
- [ ] Sandbox тестирование IAP пройдено

### 2. Метаданные App Store
- [ ] Название приложения (30 символов max)
  - Family: "Guess Us - Party Word Game"
  - Adult: "Guess Us 18+ - Adult Party"
- [ ] Подзаголовок (30 символов)
- [ ] Описание (4000 символов)
- [ ] Ключевые слова (100 символов)
- [ ] Категория: Games > Word / Party
- [ ] Скриншоты:
  - [ ] iPhone 6.7" (1290 x 2796) — минимум 3
  - [ ] iPhone 6.5" (1284 x 2778)
  - [ ] iPhone 5.5" (1242 x 2208)
  - [ ] iPad 12.9" (если поддерживаем)
- [ ] Иконка приложения (1024x1024)
- [ ] Preview видео (опционально)

### 3. Compliance
- [ ] Privacy Policy URL (уже есть в docs/)
- [ ] Terms of Service URL
- [ ] Возрастной рейтинг заполнен
- [ ] Export Compliance (обычно No для игр)
- [ ] Content Rights

### 4. Код — финальные правки
- [ ] Убрать DEBUG логирование в purchases.ts
- [ ] Проверить все Product IDs соответствуют App Store Connect
- [ ] Тест restore purchases
- [ ] Crash-free запуск (проверить Xcode console)

### 5. Build & Submit
- [ ] Увеличить версию если нужно
- [ ] `npm run build:family` → Xcode → Archive → Upload
- [ ] `npm run build:adult` → Xcode → Archive → Upload
- [ ] Submit for Review

---

## ⚠️ Важные замечания

### Bundle ID несоответствие!
В `purchases.ts`:
```typescript
dirty: 'com.chatrixllc.guessus.adult.dirty'
```
В документации:
```
com.guessus.adult.dirty
```
**→ Нужно синхронизировать!**

### Проверить перед релизом:
1. Product IDs в коде = Product IDs в App Store Connect
2. Sandbox тестер добавлен в App Store Connect
3. IAP статус = "Ready to Submit"

---

## 📱 Команды для сборки

```bash
# Установка зависимостей
npm install

# Dev режим
npm run dev              # общий
npm run dev:family       # family версия
npm run dev:adult        # adult версия

# Build для iOS
npm run update:ios:family   # сборка + открыть Xcode
npm run update:ios:adult    # сборка + открыть Xcode

# Archive (через Fastlane)
npm run archive:family
npm run archive:adult
```

---

## ❓ Нужна информация от тебя

1. **Bundle ID — какой правильный?**
   - `com.guessus.adult` или `com.chatrixllc.guessus.adult`?

2. **App Store Connect:**
   - IAP продукты уже созданы?
   - Какой статус? (Draft / Ready to Submit / Approved)

3. **Скриншоты:**
   - Есть готовые?
   - Нужно сгенерировать?

4. **Какую версию релизим первой?**
   - [ ] Только Family (проще, без IAP)
   - [ ] Только Adult (с монетизацией)
   - [ ] Обе сразу

---

*Последнее обновление: 2026-02-04*
