#!/bin/bash

# Local Database Setup Script for Secured-Ajo
# This script sets up a local PostgreSQL database for development

set -e

echo "🚀 Setting up local PostgreSQL database for Secured-Ajo..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="ajo_secure"
DB_USER="ajo_user"
DB_PASSWORD="ajo_password123"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}📦 Step 1: Checking PostgreSQL installation...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL 14+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is installed${NC}"

echo -e "${BLUE}📦 Step 2: Starting PostgreSQL service...${NC}"
if command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql || sudo service postgresql start
else
    sudo service postgresql start
fi
echo -e "${GREEN}✅ PostgreSQL service started${NC}"

echo -e "${BLUE}📦 Step 3: Creating database and user...${NC}"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};" 2>/dev/null || true

sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"
echo -e "${GREEN}✅ Database and user created${NC}"

echo -e "${BLUE}📦 Step 4: Importing database schema...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCHEMA_FILE="${SCRIPT_DIR}/../database/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found at $SCHEMA_FILE${NC}"
    exit 1
fi

sudo -u postgres psql ${DB_NAME} -f "$SCHEMA_FILE" > /dev/null
echo -e "${GREEN}✅ Database schema imported${NC}"

echo -e "${BLUE}📦 Step 5: Setting up environment variables...${NC}"
ENV_FILE="${SCRIPT_DIR}/../.env.local"
ENV_EXAMPLE="${SCRIPT_DIR}/../.env.local.example"

if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}⚠️  .env.local already exists. Backing up to .env.local.backup${NC}"
    cp "$ENV_FILE" "${ENV_FILE}.backup"
fi

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env.local from example
cp "$ENV_EXAMPLE" "$ENV_FILE"

# Update DATABASE_URL
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}|g" "$ENV_FILE"
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" "$ENV_FILE"
else
    # Linux
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}|g" "$ENV_FILE"
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" "$ENV_FILE"
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}Database Connection Details:${NC}"
echo "  Host:     ${DB_HOST}"
echo "  Port:     ${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User:     ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo -e "${BLUE}Connection String:${NC}"
echo "  postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review and update .env.local with your Paystack keys (if needed)"
echo "  2. Run: npm install"
echo "  3. Run: npm run dev"
echo "  4. Open: http://localhost:3000"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
