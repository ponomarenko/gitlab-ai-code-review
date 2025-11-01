#!/bin/bash

# GitLab AI Code Review Setup Script
# Automates the initial setup process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}GitLab AI Code Review Bot Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 22+ from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}✗ Node.js version must be 22 or higher${NC}"
    echo -e "${YELLOW}Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}\n"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}\n"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}✓ Created logs directory${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo -e "${BLUE}Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your credentials:${NC}"
    echo -e "  - GITLAB_TOKEN"
    echo -e "  - DIFY_API_KEY"
    echo -e "  - GITLAB_WEBHOOK_SECRET (optional)\n"
else
    echo -e "${GREEN}✓ .env file exists${NC}\n"
fi

# Validate .env configuration
echo -e "${BLUE}Validating configuration...${NC}"

if grep -q "your_gitlab_personal_access_token_here" .env; then
    echo -e "${YELLOW}⚠ GITLAB_TOKEN not configured${NC}"
    echo -e "  Get token from: GitLab → Settings → Access Tokens"
fi

if grep -q "your_dify_api_key_here" .env; then
    echo -e "${YELLOW}⚠ DIFY_API_KEY not configured${NC}"
    echo -e "  Get key from: https://cloud.dify.ai"
fi

echo ""

# Ask if user wants to setup knowledge base
echo -e "${BLUE}Setup Knowledge Base?${NC}"
echo -e "This will upload best practices to Dify for RAG-enhanced reviews."
read -p "Upload knowledge base now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if grep -q "your_dify_api_key_here" .env; then
        echo -e "${YELLOW}⚠ Cannot upload: DIFY_API_KEY not configured${NC}"
        echo -e "  Please configure .env first, then run:"
        echo -e "  ${BLUE}npm run setup:knowledge-base${NC}\n"
    else
        echo -e "${BLUE}Uploading knowledge base to Dify...${NC}"
        npm run setup:knowledge-base
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Knowledge base uploaded successfully${NC}\n"
        else
            echo -e "${YELLOW}⚠ Knowledge base upload failed${NC}"
            echo -e "  The bot will use local fallback instead.\n"
        fi
    fi
else
    echo -e "${BLUE}Skipping knowledge base upload${NC}"
    echo -e "  You can upload later with: ${BLUE}npm run setup:knowledge-base${NC}\n"
fi

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Configure .env with your tokens"
echo -e "2. Start development server: ${BLUE}npm run dev${NC}"
echo -e "3. Configure GitLab webhook:"
echo -e "   • Project → Settings → Webhooks"
echo -e "   • URL: ${BLUE}http://your-domain:3000/webhook/gitlab${NC}"
echo -e "   • Trigger: ${BLUE}Merge request events${NC}"
echo -e "4. Test webhook or trigger manual review:\n"
echo -e "   ${BLUE}curl -X POST http://localhost:3000/api/review \\${NC}"
echo -e "   ${BLUE}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "   ${BLUE}  -d '{\"projectId\": 123, \"mrIid\": 1}'${NC}\n"

echo -e "${YELLOW}Documentation:${NC}"
echo -e "• README.md - Full documentation"
echo -e "• knowledge-base/README.md - RAG setup guide"
echo -e "• docs/ - Additional guides\n"

echo -e "${GREEN}Happy reviewing! 🚀${NC}\n"