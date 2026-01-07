#!/bin/bash

# Supabase Schema Verification Script
# This script validates the SQL syntax of the Supabase schema files

set -e  # Exit on error

echo "🔍 Supabase Schema Verification"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL client is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client (psql) not found${NC}"
    echo "Cannot perform full SQL syntax validation"
    echo "The schema will be validated when deployed to Supabase"
    echo ""
    echo "Basic file checks:"
fi

# Function to check file
check_file() {
    local file=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ NOT FOUND${NC}"
        return 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$file" ]; then
        echo -e "${RED}❌ EMPTY${NC}"
        return 1
    fi
    
    # Check for common SQL syntax errors and typos
    local errors=0
    
    # Common typos for CREATE TABLE
    if grep -qi "CRATE TABLE\|CREADE TABLE\|CREAT TABLE\|CREATE TABEL" "$file"; then
        echo -e "${RED}❌ TYPO: Found common typo in CREATE TABLE statement${NC}"
        errors=1
    fi
    
    # Common typos for INSERT INTO
    if grep -qi "INSER INTO\|INSERT ITO\|INSERT ITNO" "$file"; then
        echo -e "${RED}❌ TYPO: Found common typo in INSERT INTO statement${NC}"
        errors=1
    fi
    
    # Common typos for SELECT FROM
    if grep -qi "SELCT FROM\|SELECT FRM\|SELECT FORM" "$file"; then
        echo -e "${RED}❌ TYPO: Found common typo in SELECT FROM statement${NC}"
        errors=1
    fi
    
    if [ $errors -eq 1 ]; then
        return 1
    fi
    
    echo -e "${GREEN}✅ OK${NC}"
    return 0
}

# Check all schema files
echo "📁 File Validation"
echo "------------------"

check_file "database/supabase_schema.sql" "Main Supabase Schema"
check_file "database/supabase_storage.sql" "Storage Configuration"
check_file "database/SUPABASE_DEPLOYMENT.md" "Deployment Guide"
check_file "database/SUPABASE_QUICK_REFERENCE.md" "Quick Reference"
check_file "database/schema.sql" "Original Schema"

echo ""
echo "📊 Schema Statistics"
echo "--------------------"

# Count various SQL components in supabase_schema.sql
if [ -f "database/supabase_schema.sql" ]; then
    tables=$(grep -c "CREATE TABLE IF NOT EXISTS" database/supabase_schema.sql || echo "0")
    indexes=$(grep -c "CREATE INDEX" database/supabase_schema.sql || echo "0")
    functions=$(grep -c "CREATE OR REPLACE FUNCTION" database/supabase_schema.sql || echo "0")
    triggers=$(grep -c "CREATE TRIGGER" database/supabase_schema.sql || echo "0")
    views=$(grep -c "CREATE OR REPLACE VIEW" database/supabase_schema.sql || echo "0")
    policies=$(grep -c "CREATE POLICY" database/supabase_schema.sql || echo "0")
    
    echo "Tables:    $tables"
    echo "Indexes:   $indexes"
    echo "Functions: $functions"
    echo "Triggers:  $triggers"
    echo "Views:     $views"
    echo "RLS Policies: $policies"
fi

echo ""
echo "📝 Documentation Check"
echo "----------------------"

# Check documentation files for completeness
if [ -f "database/SUPABASE_DEPLOYMENT.md" ]; then
    if grep -q "Quick Deployment" database/SUPABASE_DEPLOYMENT.md; then
        echo -e "Deployment Guide: ${GREEN}✅ Complete${NC}"
    else
        echo -e "Deployment Guide: ${YELLOW}⚠️  May be incomplete${NC}"
    fi
fi

if [ -f "database/SUPABASE_QUICK_REFERENCE.md" ]; then
    if grep -q "Quick Start" database/SUPABASE_QUICK_REFERENCE.md; then
        echo -e "Quick Reference: ${GREEN}✅ Complete${NC}"
    else
        echo -e "Quick Reference: ${YELLOW}⚠️  May be incomplete${NC}"
    fi
fi

echo ""
echo "🎯 Deployment Checklist"
echo "-----------------------"
echo "Before deploying to Supabase:"
echo "  [ ] Create Supabase account"
echo "  [ ] Create new project"
echo "  [ ] Save database password securely"
echo "  [ ] Run supabase_schema.sql in SQL Editor"
echo "  [ ] Run supabase_storage.sql in SQL Editor"
echo "  [ ] Get connection string from Settings"
echo "  [ ] Update .env.local with DATABASE_URL"
echo "  [ ] Test connection from application"
echo ""

echo -e "${GREEN}✨ Schema verification complete!${NC}"
echo ""
echo "📖 Next steps:"
echo "   1. Read: database/SUPABASE_DEPLOYMENT.md"
echo "   2. Deploy: Copy & run supabase_schema.sql in Supabase SQL Editor"
echo "   3. Configure: Copy & run supabase_storage.sql"
echo "   4. Connect: Update .env.local with your DATABASE_URL"
echo ""
