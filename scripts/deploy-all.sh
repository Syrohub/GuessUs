#!/bin/bash
set -e

echo ""
echo "🚀 DEPLOYING BOTH VERSIONS TO TESTFLIGHT"
echo "=========================================="
echo ""

# Set UTF-8 for CocoaPods
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# ============================================
# 1. Build and Upload Adult Version
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 1: Building Adult version..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/build-variant.sh adult

echo ""
echo "🚀 Uploading Adult to TestFlight..."
cd ios/App
fastlane adult
cd ../..

echo ""
echo "✅ Adult version uploaded!"
echo ""

# ============================================
# 2. Build and Upload Family Version
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 2: Building Family version..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/build-variant.sh family

echo ""
echo "🚀 Uploading Family to TestFlight..."
cd ios/App
fastlane family
cd ../..

echo ""
echo "✅ Family version uploaded!"
echo ""

# ============================================
# Done!
# ============================================
echo "=========================================="
echo "🎉 BOTH VERSIONS UPLOADED TO TESTFLIGHT!"
echo "=========================================="
echo ""
echo "Check App Store Connect → TestFlight for new builds."
echo ""
