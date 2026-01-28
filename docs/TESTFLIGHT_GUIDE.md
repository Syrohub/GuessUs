# TestFlight Testing Guide

## Подготовка к загрузке

### 1. Сборка Family версии

```bash
# Собрать Family версию
npm run build:family

# Открыть Xcode
npx cap open ios
```

В Xcode:
1. Убедитесь, что в Project Settings → Info выбран правильный Bundle ID
2. Добавьте Config/Active.xcconfig в проект (если не добавлен)
3. Product → Archive
4. Distribute App → App Store Connect → Upload

### 2. Сборка Adult версии

```bash
# Собрать Adult версию
npm run build:adult

# Открыть Xcode
npx cap open ios
```

В Xcode:
1. Добавьте In-App Purchase capability в Signing & Capabilities
2. Product → Archive
3. Distribute App → App Store Connect → Upload

## Настройка TestFlight

### В App Store Connect:

1. Перейдите в приложение → TestFlight
2. Выберите загруженную сборку
3. Добавьте информацию для тестирования:
   - **What to Test**: "Протестируйте основной игровой процесс, настройки команд, все категории слов"
   - **Contact Information**: Ваш email

### Добавление тестировщиков:

#### Internal Testers (до 100 человек):
- App Store Connect → Users and Access → добавьте пользователей с ролью App Manager, Developer или Marketing
- Они автоматически получат доступ к TestFlight

#### External Testers (до 10,000 человек):
1. TestFlight → External Testing → создайте группу
2. Добавьте тестировщиков по email
3. ⚠️ Первая сборка требует Beta App Review (1-2 дня)

## Тестирование In-App Purchases

### Создание Sandbox Tester:
1. App Store Connect → Users and Access → Sandbox Testers
2. Создайте нового тестера:
   - Можно использовать любой email (даже несуществующий)
   - Запомните пароль!

### Тестирование на устройстве:
1. Settings → App Store → выйдите из своего Apple ID
2. НЕ входите в sandbox аккаунт заранее
3. Запустите приложение и попробуйте купить
4. При запросе войдите под sandbox аккаунтом
5. Покупка будет бесплатной и не спишет деньги

### Что тестировать:
- [ ] Покупка "Dirty Pack"
- [ ] Покупка "Extreme Pack"  
- [ ] Покупка "Bundle"
- [ ] Restore Purchases работает
- [ ] После покупки категории разблокируются
- [ ] Покупки сохраняются после перезапуска приложения

## Чеклист тестирования

### Family версия:
- [ ] Приложение запускается
- [ ] Все 6 категорий доступны
- [ ] Игра работает корректно
- [ ] Смена языка работает
- [ ] Тёмная/светлая тема работает
- [ ] История сохраняется
- [ ] Звуки работают

### Adult версия:
- [ ] Приложение запускается
- [ ] Бейдж "18+" отображается
- [ ] Категория "Party" доступна бесплатно
- [ ] Категории Dirty/Extreme показывают замок
- [ ] Paywall открывается при клике на заблокированную категорию
- [ ] In-App Purchases работают (sandbox)
- [ ] Restore Purchases работает
- [ ] После покупки категории разблокируются
- [ ] Игра работает корректно
- [ ] Смена языка работает
- [ ] Звуки работают

## Troubleshooting

### Покупки не работают:
1. Убедитесь, что IAP настроены в App Store Connect
2. Проверьте, что Product ID в коде совпадает с ASC
3. Убедитесь, что статус IAP - "Ready to Submit" или "Approved"
4. Используйте sandbox аккаунт

### Сборка не загружается:
1. Проверьте Bundle ID
2. Проверьте сертификаты и Provisioning Profiles
3. Увеличьте Build Number для каждой новой загрузки

### TestFlight не показывает сборку:
1. Подождите 10-30 минут после загрузки
2. Проверьте статус обработки в App Store Connect
3. Проверьте email на наличие ошибок

## После тестирования

Когда всё протестировано и работает:
1. Исправьте найденные баги
2. Загрузите финальную сборку
3. Submit for Review в App Store Connect
