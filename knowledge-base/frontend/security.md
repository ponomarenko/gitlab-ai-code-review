# Frontend Security Best Practices

## XSS Prevention

### Input Sanitization
\`\`\`javascript
// Always sanitize user input
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
\`\`\`

### Content Security Policy
\`\`\`javascript
// Set CSP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
\`\`\`

## Authentication

### Token Storage
- Store tokens in httpOnly cookies (not localStorage)
- Use secure flag in production
- Implement token rotation

### Password Handling
- Never store plaintext passwords
- Use bcrypt/argon2 for hashing
- Implement rate limiting on login

## CSRF Protection
\`\`\`javascript
// Use CSRF tokens
app.use(csrf());

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});
\`\`\`

## Secure Communication
- Always use HTTPS
- Implement HSTS
- Use secure WebSocket (wss://)

## Dependencies
- Regular security audits: \`npm audit\`
- Keep dependencies updated
- Use Snyk or Dependabot