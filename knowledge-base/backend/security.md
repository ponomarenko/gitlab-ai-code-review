# Backend Security Best Practices

## OWASP Top 10 (2021)

### A01: Broken Access Control

**Risk**: Users can access resources they shouldn't.

**Prevention:**
```javascript
// ❌ Bad: No authorization check
app.get('/admin/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// ✅ Good: Proper authorization
app.get('/admin/users', 
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    const users = await User.findAll();
    res.json(users);
  }
);

// Middleware example
function authorize(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Resource ownership check
app.delete('/posts/:id', authenticate, async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Check ownership
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  await post.destroy();
  res.status(204).send();
});
```

### A02: Cryptographic Failures

**Risk**: Sensitive data exposed due to weak encryption.

**Prevention:**
```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ✅ Good: Hash passwords with bcrypt
async function hashPassword(password) {
  const saltRounds = 12; // Higher = more secure but slower
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ✅ Good: Encrypt sensitive data at rest
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ✅ Good: Use HTTPS everywhere
// In production, redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ❌ Bad: Storing passwords in plain text
// ❌ Bad: Using MD5 or SHA1 for passwords
// ❌ Bad: Weak encryption keys
```

### A03: Injection

**Risk**: SQL, NoSQL, OS command, or LDAP injection.

**SQL Injection Prevention:**
```javascript
// ❌ Bad: String concatenation (SQL injection!)
app.get('/users', async (req, res) => {
  const name = req.query.name;
  const sql = `SELECT * FROM users WHERE name = '${name}'`;
  // Attacker can send: name=' OR '1'='1
  const users = await db.query(sql);
  res.json(users);
});

// ✅ Good: Parameterized queries
app.get('/users', async (req, res) => {
  const name = req.query.name;
  const sql = 'SELECT * FROM users WHERE name = ?';
  const users = await db.query(sql, [name]);
  res.json(users);
});

// ✅ Good: Using ORM (Sequelize)
app.get('/users', async (req, res) => {
  const users = await User.findAll({
    where: { name: req.query.name }
  });
  res.json(users);
});

// ✅ Good: TypeORM with query builder
const users = await getRepository(User)
  .createQueryBuilder('user')
  .where('user.name = :name', { name: req.query.name })
  .getMany();
```

**NoSQL Injection Prevention:**
```javascript
// ❌ Bad: Direct query with user input
app.get('/users', async (req, res) => {
  const query = { $where: req.query.filter }; // Injection!
  const users = await User.find(query);
  res.json(users);
});

// ✅ Good: Validate and sanitize
app.get('/users', async (req, res) => {
  const allowedFilters = ['name', 'email', 'role'];
  const filter = {};
  
  for (const [key, value] of Object.entries(req.query)) {
    if (allowedFilters.includes(key)) {
      filter[key] = value;
    }
  }
  
  const users = await User.find(filter);
  res.json(users);
});

// ✅ Good: Use schema validation
const Joi = require('joi');

const querySchema = Joi.object({
  name: Joi.string().max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('user', 'admin')
});

app.get('/users', async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  
  const users = await User.find(value);
  res.json(users);
});
```

**Command Injection Prevention:**
```javascript
const { exec } = require('child_process');

// ❌ Bad: Direct command execution
app.post('/backup', (req, res) => {
  const filename = req.body.filename;
  exec(`tar -czf ${filename}.tar.gz /data`, (error, stdout) => {
    // Attacker can send: filename="; rm -rf / #"
    res.json({ success: true });
  });
});

// ✅ Good: Use libraries instead
const archiver = require('archiver');

app.post('/backup', (req, res) => {
  const archive = archiver('tar', { gzip: true });
  archive.directory('/data', false);
  archive.pipe(res);
  archive.finalize();
});

// If command execution is necessary, validate input
const path = require('path');

app.post('/backup', (req, res) => {
  const filename = path.basename(req.body.filename); // Remove path traversal
  
  // Whitelist validation
  if (!/^[a-zA-Z0-9_-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Use array form (no shell interpretation)
  const { spawn } = require('child_process');
  const proc = spawn('tar', ['-czf', `${filename}.tar.gz`, '/data']);
  
  proc.on('close', (code) => {
    res.json({ success: code === 0 });
  });
});
```

### A04: Insecure Design

**Risk**: Security flaws in application architecture.

**Secure Design Patterns:**
```javascript
// ✅ Good: Rate limiting
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  // Login logic
});

// ✅ Good: Account lockout after failed attempts
class AuthService {
  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw new Error(`Account locked. Try again in ${minutes} minutes`);
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
        user.failedLoginAttempts = 0;
      }
      
      await user.save();
      throw new Error('Invalid credentials');
    }
    
    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    
    return this.generateToken(user);
  }
}

// ✅ Good: CAPTCHA after failed attempts
app.post('/auth/login', async (req, res) => {
  const { email, password, captchaToken } = req.body;
  
  // Check if CAPTCHA is required
  const failedAttempts = await getFailedAttempts(email);
  
  if (failedAttempts >= 3) {
    if (!captchaToken) {
      return res.status(400).json({ 
        error: 'CAPTCHA required',
        requiresCaptcha: true 
      });
    }
    
    const isValidCaptcha = await verifyCaptcha(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }
  }
  
  // Proceed with login
});
```

### A05: Security Misconfiguration

**Risk**: Default configs, incomplete setups, open cloud storage.

**Prevention:**
```javascript
const helmet = require('helmet');
const cors = require('cors');

// ✅ Good: Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// ✅ Good: Proper CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// ✅ Good: Hide server information
app.disable('x-powered-by');

// ✅ Good: Environment-specific configs
if (process.env.NODE_ENV === 'production') {
  // Disable detailed error messages
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
    // Log full error server-side only
    logger.error(err);
  });
} else {
  // Development: show detailed errors
  app.use((err, req, res, next) => {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    });
  });
}

// ❌ Bad: Exposing sensitive information
app.get('/debug', (req, res) => {
  res.json({
    env: process.env, // Never expose environment variables!
    config: config,   // May contain secrets
  });
});

// ✅ Good: Never commit secrets to git
// Use .env files and .gitignore
// .env (not in git)
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET=your-secret-key
API_KEY=your-api-key

// ✅ Good: Use secrets management
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
  
  return JSON.parse(data.SecretString);
}
```

### A06: Vulnerable and Outdated Components

**Prevention:**
```bash
# ✅ Good: Regular dependency updates
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Use tools like Snyk
npm install -g snyk
snyk test
snyk monitor

# Renovate Bot or Dependabot for automated PRs
```

```json
// package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "check:security": "snyk test"
  },
  "dependencies": {
    "express": "^4.18.2",  // ✅ Use specific versions
    "bcrypt": "^5.1.0"
  }
}
```

### A07: Identification and Authentication Failures

**JWT Best Practices:**
```javascript
const jwt = require('jsonwebtoken');

// ✅ Good: Secure JWT configuration
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    // Don't include sensitive data
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',  // Short-lived access tokens
    issuer: 'your-app',
    audience: 'your-app-users',
    algorithm: 'HS256', // or RS256 for better security
  });
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// ✅ Good: Token verification middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ✅ Good: Refresh token rotation
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token is in database (not revoked)
    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken, userId: decoded.userId }
    });
    
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const user = await User.findByPk(decoded.userId);
    
    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Revoke old refresh token
    await tokenRecord.destroy();
    
    // Store new refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ✅ Good: Logout (revoke tokens)
app.post('/auth/logout', authenticate, async (req, res) => {
  await RefreshToken.destroy({
    where: { userId: req.user.userId }
  });
  
  res.json({ message: 'Logged out successfully' });
});
```

**Password Reset Security:**
```javascript
const crypto = require('crypto');

// ✅ Good: Secure password reset flow
app.post('/auth/forgot-password', rateLimit({ max: 3, windowMs: 3600000 }), async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ where: { email } });
  
  // Always return same response (prevent user enumeration)
  const response = { message: 'If email exists, reset link has been sent' };
  
  if (!user) {
    return res.json(response);
  }
  
  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Store hashed token
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();
  
  // Send email with original token
  await sendEmail({
    to: email,
    subject: 'Password Reset',
    html: `Reset your password: ${process.env.APP_URL}/reset-password?token=${resetToken}`
  });
  
  res.json(response);
});

app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  const user = await User.findOne({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { [Op.gt]: new Date() }
    }
  });
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  // Validate new password
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }
  
  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();
  
  // Invalidate all sessions
  await RefreshToken.destroy({ where: { userId: user.id } });
  
  res.json({ message: 'Password reset successfully' });
});
```

### A08: Software and Data Integrity Failures

**Prevention:**
```javascript
// ✅ Good: Verify package integrity
// package-lock.json ensures consistent installations

// ✅ Good: Code signing and verification
const crypto = require('crypto');

function signData(data, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

function verifySignature(data, signature, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'hex');
}

// ✅ Good: Validate uploaded files
const multer = require('multer');
const fileType = require('file-type');

const upload = multer({
  fileFilter: async (req, file, cb) => {
    try {
      const buffer = await file.buffer;
      const type = await fileType.fromBuffer(buffer);
      
      // Verify actual file type matches extension
      if (!type || type.mime !== file.mimetype) {
        return cb(new Error('File type mismatch'));
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(type.mime)) {
        return cb(new Error('Invalid file type'));
      }
      
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
```

### A09: Security Logging and Monitoring Failures

**Good Logging Practices:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// ✅ Good: Log security events
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await authService.login(email, password);
    
    logger.info('Successful login', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    res.json({ token: user.token });
  } catch (error) {
    logger.warn('Failed login attempt', {
      email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ✅ Good: Log suspicious activity
function detectSuspiciousActivity(req) {
  // Multiple failed logins
  // Access to sensitive endpoints
  // Unusual patterns
  
  logger.alert('Suspicious activity detected', {
    userId: req.user?.id,
    ip: req.ip,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Alert security team
  notifySecurityTeam({
    type: 'SUSPICIOUS_ACTIVITY',
    details: { /* ... */ }
  });
}

// ❌ Bad: Logging sensitive data
logger.info('User login', {
  email: user.email,
  password: password, // Never log passwords!
  creditCard: user.creditCard // Never log sensitive data!
});
```

### A10: Server-Side Request Forgery (SSRF)

**Prevention:**
```javascript
const axios = require('axios');
const { URL } = require('url');

// ❌ Bad: Unrestricted URL fetching
app.post('/fetch', async (req, res) => {
  const { url } = req.body;
  const response = await axios.get(url); // SSRF vulnerability!
  res.json(response.data);
});

// ✅ Good: Whitelist allowed domains
const ALLOWED_DOMAINS = [
  'api.example.com',
  'cdn.example.com'
];

app.post('/fetch', async (req, res) => {
  try {
    const url = new URL(req.body.url);
    
    // Check if domain is allowed
    if (!ALLOWED_DOMAINS.includes(url.hostname)) {
      return res.status(400).json({ error: 'Domain not allowed' });
    }
    
    // Block private IP ranges
    if (isPrivateIP(url.hostname)) {
      return res.status(400).json({ error: 'Private IPs not allowed' });
    }
    
    const response = await axios.get(url.href, {
      timeout: 5000,
      maxRedirects: 0 // Prevent redirect attacks
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

function isPrivateIP(hostname) {
  const privateRanges = [
    /^127\./,  // 127.0.0.0/8
    /^10\./,   // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,  // 192.168.0.0/16
    /^localhost$/i
  ];
  
  return privateRanges.some(range => range.test(hostname));
}
```

## Additional Security Measures

### Input Validation

```javascript
const Joi = require('joi');
const validator = require('validator');

// ✅ Good: Comprehensive validation
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  name: Joi.string().min(2).max(100).required(),
  age: Joi.number().integer().min(18).max(120),
  website: Joi.string().uri()
});

app.post('/users', async (req, res) => {
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  // Sanitize HTML input
  value.name = validator.escape(value.name);
  
  const user = await User.create(value);
  res.status(201).json(user);
});
```

### Content Security Policy

```javascript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'nonce-{random}'",  // Use nonces for inline scripts
      "https://cdn.example.com"
    ],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.example.com"],
    fontSrc: ["'self'", "https://fonts.googleapis.com"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}));
```

### Security Checklist

**Authentication & Authorization**
- [ ] Use bcrypt or argon2 for password hashing
- [ ] Implement rate limiting on auth endpoints
- [ ] Use secure session management
- [ ] Implement account lockout after failed attempts
- [ ] Use 2FA for sensitive operations
- [ ] Validate JWT tokens properly
- [ ] Implement token refresh rotation
- [ ] Secure password reset flow

**Input Validation**
- [ ] Validate all user inputs
- [ ] Use parameterized queries
- [ ] Sanitize HTML inputs
- [ ] Validate file uploads
- [ ] Implement size limits
- [ ] Check file types
- [ ] Escape output

**API Security**
- [ ] Use HTTPS only
- [ ] Implement CORS properly
- [ ] Add security headers (Helmet)
- [ ] Rate limit API endpoints
- [ ] Validate content-type
- [ ] Check API versioning
- [ ] Document security requirements

**Data Protection**
- [ ] Encrypt sensitive data at rest
- [ ] Use TLS for data in transit
- [ ] Implement proper key management
- [ ] Don't log sensitive data
- [ ] Secure database connections
- [ ] Regular backups
- [ ] Data retention policies

**Infrastructure**
- [ ] Keep dependencies updated
- [ ] Use security scanners
- [ ] Regular penetration testing
- [ ] Monitor security logs
- [ ] Implement WAF
- [ ] DDoS protection
- [ ] Secure CI/CD pipeline

**Compliance**
- [ ] GDPR compliance
- [ ] PCI DSS (if handling payments)
- [ ] HIPAA (if handling health data)
- [ ] SOC 2
- [ ] Regular audits

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [CWE Top 25](https://cwe.mitre.org/top25/)