#!/bin/bash
set -e

VARIANT=$1

if [ -z "$VARIANT" ]; then
  echo "Usage: ./scripts/build-variant.sh [family|adult]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/build-variant.sh family   # Build Family version"
  echo "  ./scripts/build-variant.sh adult    # Build Adult 18+ version"
  exit 1
fi

if [ "$VARIANT" != "family" ] && [ "$VARIANT" != "adult" ]; then
  echo "❌ Error: Variant must be 'family' or 'adult'"
  exit 1
fi

# Определяем параметры для каждого варианта
if [ "$VARIANT" = "family" ]; then
  BUNDLE_ID="com.chatrixllc.guessus"
  APP_NAME="Guess Us"
  APP_ICON="AppIconFamily"
else
  BUNDLE_ID="com.chatrixllc.guessus.adult"
  APP_NAME="Guess Us 18+"
  APP_ICON="AppIconAdult"
fi

echo ""
echo "🔧 Building $VARIANT version ($APP_NAME)..."
echo "============================================="
echo "   Bundle ID: $BUNDLE_ID"
echo "   App Icon: $APP_ICON"
echo ""

# 1. Копируем env файл
cp "configs/$VARIANT/.env.$VARIANT" .env
echo "✓ Copied .env.$VARIANT → .env"

# 2. Копируем capacitor config
cp "configs/$VARIANT/capacitor.config.ts" capacitor.config.ts
echo "✓ Copied capacitor.config.ts for $VARIANT"

# 3. Собираем веб-приложение
echo ""
echo "📦 Building web app..."
npm run build

# 4. Синхронизируем с iOS (без pod install чтобы избежать ошибок)
echo ""
echo "📱 Copying web assets to iOS..."
npx cap copy ios

# 5. Обновляем Info.plist
INFO_PLIST="ios/App/App/Info.plist"
echo ""
echo "📝 Updating Info.plist..."

# Обновляем Bundle ID
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $BUNDLE_ID" "$INFO_PLIST"
echo "✓ Set Bundle ID: $BUNDLE_ID"

# Обновляем Display Name
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$INFO_PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $APP_NAME" "$INFO_PLIST"
echo "✓ Set Display Name: $APP_NAME"

# Обновляем Bundle Name
/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$INFO_PLIST"
echo "✓ Set Bundle Name: $APP_NAME"

# 6. Обновляем project.pbxproj для App Icon
PROJECT_FILE="ios/App/App.xcodeproj/project.pbxproj"
echo ""
echo "🎨 Setting App Icon: $APP_ICON..."
sed -i '' "s/ASSETCATALOG_COMPILER_APPICON_NAME = [^;]*/ASSETCATALOG_COMPILER_APPICON_NAME = $APP_ICON/" "$PROJECT_FILE"
echo "✓ Updated App Icon in project"

echo ""
echo "============================================="
echo "✅ Build complete for $VARIANT!"
echo ""
echo "   Bundle ID: $BUNDLE_ID"
echo "   App Name: $APP_NAME"
echo "   App Icon: $APP_ICON"
echo ""
echo "Next steps:"
echo "  1. Open Xcode:  npx cap open ios"
echo "  2. Archive:     Product → Archive"
echo "  3. Upload:      Distribute App → App Store Connect"
echo ""
echo "📝 To switch variants, run this script again with different argument."
echo ""
