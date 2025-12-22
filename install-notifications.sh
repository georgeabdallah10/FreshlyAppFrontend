#!/bin/bash

# ==================================================================
# SAVR NOTIFICATION SYSTEM - INSTALLATION SCRIPT
# ==================================================================
# This script helps you set up the notification system quickly
# ==================================================================

echo ""
echo " Savr Notification System Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED} Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${GREEN} Found package.json${NC}"
echo ""

# Step 2: Install required packages
echo " Step 1: Installing required packages..."
echo ""
echo "Installing expo-notifications and expo-device..."
npx expo install expo-notifications expo-device

if [ $? -eq 0 ]; then
    echo -e "${GREEN} Packages installed successfully${NC}"
else
    echo -e "${RED} Failed to install packages${NC}"
    exit 1
fi

echo ""

# Step 3: Check for Expo project ID
echo " Step 2: Checking Expo configuration..."
echo ""

if grep -q "projectId" app.json; then
    echo -e "${GREEN} Found projectId in app.json${NC}"
else
    echo -e "${YELLOW}  No projectId found in app.json${NC}"
    echo ""
    echo "To get your project ID, run:"
    echo "  npx expo login"
    echo "  eas project:info"
    echo ""
    echo "Then add it to app.json under extra.eas.projectId"
fi

echo ""

# Step 4: Check Supabase client
echo "  Step 3: Checking Supabase setup..."
echo ""

if [ -f "src/supabase/client.ts" ]; then
    echo -e "${GREEN} Found Supabase client${NC}"
else
    echo -e "${YELLOW}  Supabase client not found${NC}"
fi

echo ""

# Step 5: List created files
echo " Step 4: Verifying notification system files..."
echo ""

FILES=(
    "src/notifications/types.ts"
    "src/notifications/registerForPush.ts"
    "src/notifications/schedulePantryNotifications.ts"
    "src/notifications/handleIncomingNotifications.ts"
    "src/notifications/supabaseHelpers.ts"
    "hooks/useNotifications.ts"
    "components/NotificationCard.tsx"
    "app/(tabs)/notifications/index.tsx"
)

MISSING_FILES=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}${NC} $file"
    else
        echo -e "${RED}${NC} $file (missing)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

echo ""

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN} All notification files present!${NC}"
else
    echo -e "${YELLOW}  $MISSING_FILES file(s) missing${NC}"
fi

echo ""

# Step 6: Next steps
echo " Next Steps:"
echo "=============="
echo ""
echo "1. Configure Expo Project ID:"
echo "   - Run: npx expo login"
echo "   - Run: eas project:info"
echo "   - Add projectId to app.json"
echo "   - Update src/notifications/registerForPush.ts line 73"
echo ""
echo "2. Setup Supabase Tables:"
echo "   - Run the SQL from src/notifications/supabaseHelpers.ts"
echo "   - Or check NOTIFICATION_SYSTEM_SETUP.md"
echo ""
echo "3. Test on Physical Device:"
echo "   - iOS: npx expo run:ios --device"
echo "   - Android: npx expo run:android --device"
echo ""
echo "4. Send Test Notification:"
echo "   - Visit: https://expo.dev/notifications"
echo "   - Use your Expo push token from the app"
echo ""
echo " Documentation:"
echo "   - Quick Start: NOTIFICATION_QUICK_START.md"
echo "   - Full Setup: NOTIFICATION_SYSTEM_SETUP.md"
echo "   - API Examples: NOTIFICATION_API_EXAMPLES.md"
echo ""
echo -e "${GREEN} Setup complete! Follow the next steps above.${NC}"
echo ""
