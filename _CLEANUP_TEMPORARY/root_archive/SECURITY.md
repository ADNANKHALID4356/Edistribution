# Security Policy

## 🔒 Security Overview

The Distribution Management System takes security seriously. This document outlines our security policies, how to report vulnerabilities, and best practices for secure deployment.

---

## 📋 Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

---

## 🚨 Reporting a Vulnerability

### How to Report

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public GitHub issue
2. **Email** us directly at: **security@ummahtechinnovations.com**
3. **Include** the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### What to Expect

- **Initial Response:** Within 48 hours
- **Assessment:** Within 7 days
- **Fix Timeline:** Critical issues within 14 days, others within 30 days
- **Disclosure:** Coordinated disclosure after fix is released
- **Credit:** Security researchers will be credited (if desired)

### Bug Bounty

We currently do not have a formal bug bounty program, but we greatly appreciate responsible disclosure and will acknowledge contributors.

---

## 🛡️ Security Features

### Current Security Measures

#### Authentication & Authorization
- ✅ **JWT-based authentication** with secure token generation
- ✅ **bcrypt password hashing** with salt rounds
- ✅ **Role-based access control** (Admin, Warehouse, Salesman)
- ✅ **Token expiration** (configurable, default 7 days)
- ✅ **Secure session management**

#### API Security
- ✅ **Rate limiting** to prevent brute force attacks
- ✅ **CORS configuration** for controlled access
- ✅ **Input validation** on all endpoints
- ✅ **SQL injection protection** via parameterized queries
- ✅ **XSS prevention** through input sanitization
- ✅ **Request size limits** to prevent DoS

#### Data Protection
- ✅ **Environment variables** for sensitive configuration
- ✅ **Password encryption** at rest
- ✅ **Secure database connections**
- ✅ **No sensitive data in logs**

#### Network Security
- ✅ **HTTPS support** (recommended for production)
- ✅ **Secure headers** (Helmet.js compatible)
- ✅ **IP whitelisting** (configurable)

---

## 🔐 Security Best Practices

### For Developers

#### 1. Environment Variables
```bash
# NEVER commit these files:
.env
.env.production
*.env (except .env.example)

# ALWAYS use strong secrets:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

#### 2. Database Security
```javascript
// ✅ GOOD: Parameterized queries
const [users] = await db.query(
  'SELECT * FROM users WHERE username = ?',
  [username]
);

// ❌ BAD: String concatenation (SQL injection risk)
const [users] = await db.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

#### 3. Password Handling
```javascript
// ✅ GOOD: Always hash passwords
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);

// ❌ BAD: Never store plain text passwords
const password = 'user123'; // DON'T DO THIS
```

#### 4. Token Management
```javascript
// ✅ GOOD: Include expiration
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// ❌ BAD: No expiration (security risk)
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
```

#### 5. Input Validation
```javascript
// ✅ GOOD: Validate and sanitize
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

// Validate before processing
if (!username || username.length < 3) {
  return res.status(400).json({ error: 'Invalid username' });
}
```

### For Deployment

#### 1. Environment Configuration

**Production .env checklist:**
```env
# ✅ Strong JWT secret (64+ characters, random)
JWT_SECRET=use_strong_random_secret_minimum_64_characters_here

# ✅ Strong database password
DB_PASSWORD=Use_Strong_P@ssw0rd_With_Special_Ch@rs

# ✅ Production mode
NODE_ENV=production

# ✅ Secure database host
DB_HOST=secure-db-server.com

# ❌ NEVER use these in production:
# JWT_SECRET=secret123
# DB_PASSWORD=root
# NODE_ENV=development
```

#### 2. Database Hardening

**MySQL Security Checklist:**
```sql
-- ✅ Create dedicated user (not root)
CREATE USER 'dist_user'@'%' IDENTIFIED BY 'Strong_P@ssw0rd';
GRANT SELECT, INSERT, UPDATE, DELETE ON distribution_system_db.* TO 'dist_user'@'%';

-- ✅ Limit remote access to specific IPs (if possible)
CREATE USER 'dist_user'@'192.168.1.%' IDENTIFIED BY 'Strong_P@ssw0rd';

-- ✅ Remove test accounts
DROP USER IF EXISTS 'test'@'%';

-- ✅ Regular backups
-- Setup automated daily backups

-- ✅ Enable SSL connections (recommended)
REQUIRE SSL;
```

#### 3. Server Security

**VPS/Server Security Checklist:**
```bash
# ✅ Update system packages
sudo apt update && sudo apt upgrade -y

# ✅ Configure firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5000/tcp  # API (or use reverse proxy)
sudo ufw allow 3306/tcp  # MySQL (limit to specific IPs if possible)
sudo ufw enable

# ✅ Install fail2ban (prevent brute force)
sudo apt install fail2ban -y

# ✅ Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# ✅ Use SSH keys instead of passwords
# ✅ Keep Node.js and dependencies updated
# ✅ Use process manager (PM2) with monitoring
```

#### 4. HTTPS Configuration

**Always use HTTPS in production:**
```bash
# Option 1: Let's Encrypt (Free SSL)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com

# Option 2: Cloudflare (Free SSL + CDN)
# Configure through Cloudflare dashboard

# Update backend to use HTTPS
# Use reverse proxy (Nginx/Apache) for SSL termination
```

#### 5. Monitoring & Logging

```javascript
// ✅ Log security events (but not sensitive data)
logger.info(`Login attempt: ${username} from ${ip}`);
logger.warn(`Failed login attempt: ${username}`);
logger.error(`Unauthorized access attempt to ${endpoint}`);

// ❌ NEVER log sensitive data
// logger.info(`Password: ${password}`); // DON'T DO THIS
// logger.info(`Token: ${token}`);       // DON'T DO THIS
```

---

## 🚫 Common Vulnerabilities & Prevention

### 1. SQL Injection
**Risk:** High  
**Prevention:** Use parameterized queries
```javascript
// ✅ Safe
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ Vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 2. XSS (Cross-Site Scripting)
**Risk:** Medium  
**Prevention:** Sanitize input, use React's built-in XSS protection
```javascript
// React automatically escapes JSX
<div>{userInput}</div> // Safe in React

// ❌ Dangerous
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

### 3. Authentication Bypass
**Risk:** Critical  
**Prevention:** Proper middleware, token verification
```javascript
// ✅ Always verify tokens
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 4. Sensitive Data Exposure
**Risk:** Critical  
**Prevention:** Never commit secrets, use .env
```bash
# ✅ Use environment variables
DB_PASSWORD=<secure>

# ❌ NEVER hardcode
const dbPassword = "mypassword123"; // DON'T DO THIS
```

### 5. Broken Access Control
**Risk:** High  
**Prevention:** Implement role-based access control
```javascript
// ✅ Check permissions
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.delete('/users/:id', authMiddleware, adminOnly, deleteUser);
```

---

## 🔍 Security Audit Checklist

### Before Production Deployment

#### Code Security
- [ ] No hardcoded credentials in code
- [ ] All `.env` files in `.gitignore`
- [ ] Strong JWT secret configured
- [ ] Password hashing implemented
- [ ] Input validation on all endpoints
- [ ] Parameterized SQL queries
- [ ] Error messages don't leak sensitive info

#### Infrastructure Security
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Database user with limited permissions
- [ ] Strong database password
- [ ] SSH keys used (not passwords)
- [ ] Regular backup strategy in place
- [ ] Server monitoring enabled

#### Application Security
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Default passwords changed
- [ ] Admin accounts secured
- [ ] Logging configured (no sensitive data)
- [ ] Dependencies updated
- [ ] Security headers configured

#### Network Security
- [ ] MySQL port limited to trusted IPs
- [ ] API only accessible via HTTPS
- [ ] VPN/private network for sensitive operations
- [ ] DDoS protection in place

---

## 🆘 Security Incident Response

### If You Suspect a Breach

1. **Immediate Actions:**
   - Change all passwords immediately
   - Rotate JWT secrets
   - Review access logs
   - Disable compromised accounts
   - Notify security team

2. **Investigation:**
   - Identify scope of breach
   - Determine what data was accessed
   - Review audit logs
   - Identify vulnerability

3. **Remediation:**
   - Patch vulnerability
   - Update security measures
   - Monitor for further incidents
   - Document lessons learned

4. **Communication:**
   - Notify affected users (if applicable)
   - Report to authorities (if required)
   - Public disclosure (if appropriate)

---

## 📚 Security Resources

### Tools & Libraries

- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-rate-limit** - API rate limiting
- **helmet** - Security headers for Express
- **validator** - Input validation

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 📞 Contact

For security concerns:
- **Email:** security@ummahtechinnovations.com
- **Emergency:** Contact via GitHub Issues (mark as urgent)

---

## 📝 Updates

This security policy is reviewed and updated regularly. Last updated: December 21, 2025

---

**Remember: Security is everyone's responsibility. When in doubt, ask!**
