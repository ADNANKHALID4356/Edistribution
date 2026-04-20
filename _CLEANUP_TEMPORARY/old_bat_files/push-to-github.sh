#!/bin/bash

# ==========================================
# Distribution System - GitHub Push Script
# ==========================================

echo "🚀 Preparing Distribution System for GitHub..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📦 Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
fi

# Check for sensitive files
echo -e "\n${YELLOW}🔍 Checking for sensitive files...${NC}"

SENSITIVE_FILES=(
    "backend/.env"
    "desktop/.env"
    "backend/data/*.db"
    "backend/data/*.sqlite"
    "node_modules"
)

FOUND_SENSITIVE=false
for pattern in "${SENSITIVE_FILES[@]}"; do
    if ls $pattern 2>/dev/null | grep -q .; then
        echo -e "${RED}⚠️  Found: $pattern${NC}"
        FOUND_SENSITIVE=true
    fi
done

if [ "$FOUND_SENSITIVE" = true ]; then
    echo -e "${RED}❌ Sensitive files detected! Make sure .gitignore is configured properly.${NC}"
    echo -e "${YELLOW}💡 These files should NOT be committed to GitHub${NC}"
fi

# Verify .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ .gitignore file not found!${NC}"
    echo -e "${YELLOW}💡 Create .gitignore before pushing to GitHub${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .gitignore found${NC}"
fi

# Verify example environment files exist
echo -e "\n${YELLOW}🔍 Checking for example environment files...${NC}"

if [ -f "backend/.env.example" ]; then
    echo -e "${GREEN}✅ backend/.env.example found${NC}"
else
    echo -e "${RED}❌ backend/.env.example missing${NC}"
fi

if [ -f "desktop/.env.example" ]; then
    echo -e "${GREEN}✅ desktop/.env.example found${NC}"
else
    echo -e "${RED}❌ desktop/.env.example missing${NC}"
fi

# Check git status
echo -e "\n${YELLOW}📊 Current Git Status:${NC}"
git status --short

# Add all files
echo -e "\n${YELLOW}📦 Adding files to Git...${NC}"
git add .

# Show what will be committed
echo -e "\n${YELLOW}📋 Files to be committed:${NC}"
git status --short

# Ask for confirmation
echo -e "\n${YELLOW}❓ Ready to commit and push to GitHub?${NC}"
echo -e "${YELLOW}   Make sure you have:${NC}"
echo -e "   1. Created a GitHub repository"
echo -e "   2. Removed all sensitive data"
echo -e "   3. Updated .env.example files with proper values"
echo -e "   4. Verified .gitignore is working"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}⏸️  Aborted. No changes were committed.${NC}"
    exit 0
fi

# Get commit message
echo -e "\n${YELLOW}💬 Enter commit message:${NC}"
read -p "Message (or press Enter for default): " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="🚀 Production-ready: Distribution Management System"
fi

# Commit
echo -e "\n${YELLOW}💾 Committing changes...${NC}"
git commit -m "$commit_msg"

# Check if remote exists
if git remote | grep -q 'origin'; then
    echo -e "${GREEN}✅ Remote 'origin' found${NC}"
    
    # Ask if want to push
    read -p "Push to origin? (yes/no): " push_confirm
    
    if [ "$push_confirm" = "yes" ]; then
        # Get current branch
        BRANCH=$(git branch --show-current)
        
        echo -e "\n${YELLOW}⬆️  Pushing to origin/$BRANCH...${NC}"
        git push -u origin $BRANCH
        
        echo -e "\n${GREEN}✅ Successfully pushed to GitHub!${NC}"
        echo -e "${GREEN}🌐 Your code is now on GitHub${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No remote repository configured${NC}"
    echo -e "${YELLOW}💡 To push to GitHub, run:${NC}"
    echo -e "   git remote add origin https://github.com/yourusername/distribution_system.git"
    echo -e "   git branch -M main"
    echo -e "   git push -u origin main"
fi

echo -e "\n${GREEN}✨ Done!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Go to your GitHub repository"
echo -e "   2. Verify no sensitive files were committed"
echo -e "   3. Follow PRODUCTION_DEPLOYMENT.md to deploy to server"
echo ""
