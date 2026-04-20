# Pre-Push Checklist

Before pushing to GitHub, complete this checklist to ensure a safe and secure deployment.

## ✅ Security Checklist

### Critical (Must Complete)

- [ ] **Verify .gitignore** - Run `type .gitignore` and confirm it includes:
  - `node_modules/`
  - `.env`
  - `*.db`
  - `*.sqlite`
  - `*.log`

- [ ] **Check .env.example files exist**:
  - [ ] `backend/.env.example` exists
  - [ ] `desktop/.env.example` exists
  - [ ] Both contain placeholder values (no real passwords)

- [ ] **Remove sensitive data from example files**:
  ```bash
  # Verify these commands show only placeholder values:
  findstr /C:"DB_PASSWORD" backend\.env.example
  findstr /C:"JWT_SECRET" backend\.env.example
  ```
  Should show: `DB_PASSWORD=your_secure_password_here` (not actual password)

- [ ] **Database files excluded**:
  - [ ] `backend/data/distribution_system.db` exists locally but will be gitignored
  - [ ] No production database files in project

### Recommended

- [ ] **Update README.md** with:
  - [ ] Project description
  - [ ] Installation instructions
  - [ ] Link to PRODUCTION_DEPLOYMENT.md
  - [ ] Link to QUICK_START.md

- [ ] **Version bump** in package.json files:
  - [ ] `backend/package.json` - Update version number
  - [ ] `desktop/package.json` - Update version number

- [ ] **Test locally one more time**:
  - [ ] Backend starts without errors: `cd backend && npm start`
  - [ ] Frontend builds successfully: `cd desktop && npm run build`
  - [ ] Can login with admin credentials

## 🔍 Verification Steps

### Step 1: Run Cleanup Script
```bash
prepare-for-github.bat
```

### Step 2: Verify No Sensitive Files Will Be Committed
```bash
git status
```
**Verify Output Does NOT Include:**
- ❌ `backend/.env`
- ❌ `backend/data/*.db`
- ❌ `node_modules/`
- ❌ Any log files

**Verify Output DOES Include:**
- ✅ `backend/.env.example`
- ✅ `desktop/.env.example`
- ✅ `.gitignore`
- ✅ Documentation files (*.md)
- ✅ Source code files (*.js, *.jsx, etc.)

### Step 3: Double-Check .env.example Files
```bash
# Backend .env.example should have placeholders:
type backend\.env.example | findstr /C:"password" /C:"secret"

# Desktop .env.example should have placeholders:
type desktop\.env.example | findstr /C:"localhost"
```

Expected output should show placeholder values, not actual credentials.

### Step 4: Test Deployment Configuration
```bash
node verify-deployment-ready.js
```
Should pass all checks except warnings about development files (which is expected).

## 📋 GitHub Repository Setup

Before running push-to-github.bat:

1. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Repository name: `distribution-system` (or your preferred name)
   - Visibility: Private (recommended for business application)
   - Do NOT initialize with README (we already have one)

2. **Get Repository URL**:
   ```
   https://github.com/YOUR_USERNAME/distribution-system.git
   ```

3. **Configure Git (if not already done)**:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## 🚀 Push to GitHub

Once all checklist items are complete:

```bash
push-to-github.bat
```

This script will:
1. Verify .gitignore is working
2. Show files that will be committed
3. Add all files (excluding gitignored ones)
4. Commit with a message
5. Push to GitHub

## ✅ Post-Push Verification

After pushing to GitHub:

1. **Visit your GitHub repository**
2. **Verify these files ARE present**:
   - ✅ `backend/.env.example`
   - ✅ `desktop/.env.example`
   - ✅ `.gitignore`
   - ✅ `PRODUCTION_DEPLOYMENT.md`
   - ✅ `QUICK_START.md`
   - ✅ All source code files

3. **Verify these files are NOT present**:
   - ❌ `backend/.env` (should not be visible)
   - ❌ `backend/data/distribution_system.db` (should not be visible)
   - ❌ `node_modules/` directories (should not be visible)

4. **Check repository size**:
   - Should be < 50 MB (excluding node_modules)
   - If > 100 MB, something went wrong

## 🎯 Ready for Production Deployment

Once on GitHub, proceed to server deployment:

1. Follow instructions in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
2. Use [QUICK_START.md](QUICK_START.md) for quick reference
3. Test thoroughly before giving access to clients

## ⚠️ Common Issues

### Issue: .env file appears in `git status`
**Solution**: 
```bash
git rm --cached backend/.env
git rm --cached desktop/.env
git commit -m "Remove .env files from git tracking"
```

### Issue: node_modules appears in `git status`
**Solution**:
```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules from git tracking"
```

### Issue: Database file appears in `git status`
**Solution**:
```bash
git rm --cached backend/data/*.db
git commit -m "Remove database files from git tracking"
```

## 📞 Support

If you encounter issues:
1. Check .gitignore is properly configured
2. Run `git status` to see what will be committed
3. Run `prepare-for-github.bat` again
4. Verify .env.example files have placeholders only

---

**Remember**: Never commit real passwords, API keys, or production databases to GitHub!
