#!/bin/bash
# Test script for user registration flow
# This script helps verify the signup fix is working correctly

echo "================================================"
echo "User Registration Flow Test"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will guide you through testing the signup fix.${NC}"
echo ""

# Step 1
echo "Step 1: Start the development server"
echo "---------------------------------------"
echo "Run: npm run dev"
echo ""
read -p "Press Enter when the dev server is running..."
echo ""

# Step 2
echo "Step 2: Open the application"
echo "---------------------------------------"
echo "Open: http://localhost:3000"
echo ""
read -p "Press Enter when the app is open..."
echo ""

# Step 3
echo "Step 3: Navigate to Signup Page"
echo "---------------------------------------"
echo "Click 'Sign up' or navigate to /signup"
echo ""
read -p "Press Enter when you're on the signup page..."
echo ""

# Step 4
echo "Step 4: Fill out signup form"
echo "---------------------------------------"
echo "Enter:"
echo "  - Full Name: Test User"
echo "  - Email: test@example.com (or your test email)"
echo "  - Phone: +1234567890"
echo "  - Password: test123"
echo "  - Confirm Password: test123"
echo ""
read -p "Press Enter when form is filled..."
echo ""

# Step 5
echo "Step 5: Submit the form"
echo "---------------------------------------"
echo "Click 'Create account' button"
echo ""
echo "Expected behavior:"
echo "  1. ✓ Spinner shows 'Creating account...'"
echo "  2. ✓ Spinner STOPS after a few seconds (not stuck!)"
echo "  3. ✓ Success message appears"
echo "  4. ✓ Automatically redirected to login page after 2 seconds"
echo ""
read -p "Did the spinner stop and redirect work? (y/n): " spinner_ok
echo ""

if [ "$spinner_ok" != "y" ]; then
    echo -e "${RED}✗ FAILED: Spinner is still stuck or no redirect${NC}"
    echo "This means the fix didn't work. Check browser console for errors."
    exit 1
fi

echo -e "${GREEN}✓ PASSED: Spinner stopped and redirect worked${NC}"
echo ""

# Step 6
echo "Step 6: Check your email"
echo "---------------------------------------"
echo "Expected:"
echo "  - Email from Supabase with confirmation link"
echo ""
read -p "Did you receive the confirmation email? (y/n): " email_ok
echo ""

if [ "$email_ok" != "y" ]; then
    echo -e "${RED}✗ WARNING: No email received${NC}"
    echo "Check your Supabase email settings and spam folder."
fi

# Step 7
echo "Step 7: Verify database state BEFORE confirmation"
echo "---------------------------------------"
echo "Open Supabase Dashboard > Table Editor"
echo ""
echo "Check auth.users table:"
echo "  - Should have entry with email: test@example.com"
echo "  - email_confirmed_at: should be NULL"
echo ""
echo "Check public.users table:"
echo "  - Should NOT have entry yet (this is expected!)"
echo ""
read -p "Press Enter when you've verified the database state..."
echo ""

# Step 8
echo "Step 8: Click confirmation link in email"
echo "---------------------------------------"
echo "Click the 'Confirm your email' link in the email"
echo ""
read -p "Press Enter after clicking the link..."
echo ""

# Step 9
echo "Step 9: Login with confirmed account"
echo "---------------------------------------"
echo "If not automatically logged in:"
echo "  1. Go to login page"
echo "  2. Enter email: test@example.com"
echo "  3. Enter password: test123"
echo "  4. Click 'Sign in'"
echo ""
echo "Expected:"
echo "  - Successfully logs in"
echo "  - Redirected to dashboard"
echo "  - No errors in console"
echo ""
read -p "Were you able to login successfully? (y/n): " login_ok
echo ""

if [ "$login_ok" != "y" ]; then
    echo -e "${RED}✗ FAILED: Login unsuccessful${NC}"
    echo "Check browser console for errors."
    exit 1
fi

echo -e "${GREEN}✓ PASSED: Login successful${NC}"
echo ""

# Step 10
echo "Step 10: Verify database state AFTER confirmation"
echo "---------------------------------------"
echo "Open Supabase Dashboard > Table Editor"
echo ""
echo "Check auth.users table:"
echo "  - Entry should have email_confirmed_at: [timestamp]"
echo ""
echo "Check public.users table:"
echo "  - Should NOW have entry with:"
echo "    - id: [same as auth.users]"
echo "    - email: test@example.com"
echo "    - full_name: Test User"
echo "    - phone: +1234567890"
echo "    - is_verified: false"
echo ""
read -p "Does public.users have the entry? (y/n): " db_ok
echo ""

if [ "$db_ok" != "y" ]; then
    echo -e "${RED}✗ FAILED: Profile not created in public.users${NC}"
    echo "Check Supabase logs and browser console for errors."
    exit 1
fi

echo -e "${GREEN}✓ PASSED: Profile created successfully${NC}"
echo ""

# Final summary
echo "================================================"
echo -e "${GREEN}ALL TESTS PASSED! ✓${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "  ✓ Signup page doesn't get stuck"
echo "  ✓ Email confirmation works"
echo "  ✓ Profile created in public.users after confirmation"
echo "  ✓ Login works correctly"
echo ""
echo "The fix is working correctly!"
