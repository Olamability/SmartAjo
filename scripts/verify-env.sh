#!/bin/bash

# ==============================================================================
# Environment Variable Verification Script
# ==============================================================================
# This script checks if your environment variables are properly configured
# Run this after setting up your .env.local file
# ==============================================================================

set -e

echo "=============================================="
echo "🔍 Verifying Environment Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track if all checks pass
ALL_CHECKS_PASSED=true

# Function to check if variable is set
check_var() {
    local var_name=$1
    local is_required=$2
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}✗ $var_name${NC} - ${RED}MISSING (REQUIRED)${NC}"
            ALL_CHECKS_PASSED=false
        else
            echo -e "${YELLOW}○ $var_name${NC} - Not set (optional)"
        fi
    else
        if [ "$is_required" = "true" ]; then
            echo -e "${GREEN}✓ $var_name${NC} - Set"
        else
            echo -e "${BLUE}✓ $var_name${NC} - Set (optional)"
        fi
    fi
}

# Function to check variable length
check_var_length() {
    local var_name=$1
    local min_length=$2
    local var_value="${!var_name}"
    
    if [ -n "$var_value" ]; then
        if [ ${#var_value} -lt $min_length ]; then
            echo -e "  ${RED}⚠ WARNING: $var_name is too short (minimum $min_length characters)${NC}"
            ALL_CHECKS_PASSED=false
        fi
    fi
}

# Check if .env.local exists
echo "1️⃣  Checking for .env.local file..."
if [ ! -f .env.local ]; then
    echo -e "${RED}✗ .env.local file not found!${NC}"
    echo ""
    echo "To fix this:"
    echo "  1. Copy the example file:"
    echo "     cp .env.local.example .env.local"
    echo ""
    echo "  2. Edit .env.local and set the required variables"
    echo ""
    echo "  3. See ENV_SETUP.md for detailed instructions"
    exit 1
else
    echo -e "${GREEN}✓ .env.local file exists${NC}"
fi
echo ""

# Load environment variables from .env.local
echo "2️⃣  Loading environment variables..."
set -o allexport
source .env.local
set +o allexport
echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Check required variables
echo "3️⃣  Checking REQUIRED variables..."
echo "   These MUST be set for the app to work:"
echo ""
check_var "DATABASE_URL" "true"
check_var "JWT_SECRET" "true"
echo ""

# Check JWT_SECRET length
if [ -n "$JWT_SECRET" ]; then
    check_var_length "JWT_SECRET" 32
    if [ "$JWT_SECRET" = "your-super-secret-jwt-key-min-32-characters-change-this-in-production" ]; then
        echo -e "  ${YELLOW}⚠ WARNING: JWT_SECRET is using the example value${NC}"
        echo -e "  ${YELLOW}  Generate a secure secret with: openssl rand -base64 32${NC}"
    fi
fi
echo ""

# Check recommended variables
echo "4️⃣  Checking RECOMMENDED variables..."
echo "   These improve the app experience:"
echo ""
check_var "NODE_ENV" "false"
check_var "NEXT_PUBLIC_APP_NAME" "false"
check_var "NEXT_PUBLIC_APP_URL" "false"
echo ""

# Check optional variables
echo "5️⃣  Checking OPTIONAL variables..."
echo "   These enable specific features:"
echo ""
echo "   Payment Integration (Paystack):"
check_var "PAYSTACK_SECRET_KEY" "false"
check_var "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" "false"
echo ""

echo "   Email Configuration:"
check_var "EMAIL_FROM" "false"
check_var "EMAIL_HOST" "false"
check_var "EMAIL_USER" "false"
check_var "EMAIL_PASSWORD" "false"
echo ""

echo "   SMS Configuration (Twilio):"
check_var "TWILIO_ACCOUNT_SID" "false"
check_var "TWILIO_AUTH_TOKEN" "false"
check_var "TWILIO_PHONE_NUMBER" "false"
echo ""

# Test database connection
echo "6️⃣  Testing database connection..."
if [ -n "$DATABASE_URL" ]; then
    # Check if psql is available
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Database connection successful${NC}"
        else
            echo -e "${YELLOW}⚠ Cannot connect to database${NC}"
            echo -e "${YELLOW}  This is OK if the database isn't running yet${NC}"
            echo -e "${YELLOW}  The app will test the connection when it starts${NC}"
        fi
    else
        echo -e "${YELLOW}○ psql not found, skipping connection test${NC}"
        echo -e "${YELLOW}  (Database will be tested when you run the app)${NC}"
    fi
else
    echo -e "${RED}✗ DATABASE_URL not set, cannot test connection${NC}"
    ALL_CHECKS_PASSED=false
fi
echo ""

# Summary
echo "=============================================="
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✅ Environment setup looks good!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Install dependencies: npm install"
    echo "  2. Start the dev server: npm run dev"
    echo "  3. Open http://localhost:3000"
else
    echo -e "${RED}❌ Environment setup has issues${NC}"
    echo ""
    echo "Please fix the errors above, then run this script again."
    echo ""
    echo "For help, see:"
    echo "  - ENV_SETUP.md (comprehensive guide)"
    echo "  - QUICK_SETUP.md (quick start guide)"
    echo "  - LOCAL_SETUP.md (detailed setup guide)"
    exit 1
fi
echo "=============================================="
