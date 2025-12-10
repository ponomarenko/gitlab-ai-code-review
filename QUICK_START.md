# Quick Start Guide

Get your AI Code Review bot up and running in 5 minutes!

## Prerequisites

- Node.js 22+
- GitLab account with API access
- Dify account ([Sign up free](https://cloud.dify.ai))

## Installation

```bash
# 1. Clone repository
git clone https://github.com/ponomarenko/gitlab-ai-code-review.git
cd gitlab-ai-code-review

# 2. Run setup (automated)
npm run setup
```

## Configuration

### 1. Get GitLab Token

1. Go to GitLab → **Settings** → **Access Tokens**
2. Create token with `api` scope
3. Copy token

### 2. Get Dify API Key

1. Go to [Dify Console](https://cloud.dify.ai)
2. Create new application (or use existing)
3. Copy API key from **API Access** section

### 3. Configure .env

```bash
# Edit .env file
nano .env
```

**Required settings:**
```env
GITLAB_TOKEN=glpat-your_token_here
DIFY_API_KEY=app-your_dify_key
```

**Optional but recommended:**
```env
GITLAB_WEBHOOK_SECRET=random_secret_string
RAG_ENABLED=true
```

## Setup Knowledge Base (RAG)

Upload best practices to Dify for enhanced reviews:

```bash
npm run setup:knowledge-base
```

This uploads:
- ✅ React best practices
- ✅ Vue.js patterns
- ✅ Angular 18+ guidelines
- ✅ Accessibility (WCAG)
- ✅ Performance optimization
- ✅ Security best practices

**Don't have Dify setup yet?** No problem! The bot uses local files as fallback.

## Start Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# With PM2 (recommended for production)
npm run start:pm2
```

Server starts on `http://localhost:3000`

## Configure GitLab Webhook

1. Go to your GitLab project
2. Navigate to **Settings** → **Webhooks**
3. Add webhook:

```
URL: http://your-domain:3000/webhook/gitlab
Secret Token: [your GITLAB_WEBHOOK_SECRET]
```

4. Select trigger:
   - ✅ **Merge request events**

5. Click **Add webhook**

## Test It!

### Automatic Test (via Webhook)

1. Create a merge request in your GitLab project
2. Bot automatically reviews and posts comments
3. Check MR for AI review results

### Manual Test (via API)

```bash
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 12345,
    "mrIid": 1
  }'
```

Replace `12345` with your project ID and `1` with MR IID.

## Verify Everything Works

### 1. Check Server Health

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. Check Logs

```bash
# Development
npm run dev
# Watch console output

# Production with PM2
npm run logs
```

### 3. Trigger Test Review

Create a simple MR with a small code change and watch for bot comments.

## Common Issues

### ❌ "GITLAB_TOKEN not found"

**Solution**: Set `GITLAB_TOKEN` in `.env` file

### ❌ "Webhook signature invalid"

**Solution**: Ensure `GITLAB_WEBHOOK_SECRET` matches in both `.env` and GitLab webhook settings

### ❌ "Dify API error"

**Solution**: 
1. Check `DIFY_API_KEY` is correct
2. Verify Dify app is active
3. Bot will use local knowledge base as fallback

### ❌ "Cannot connect to GitLab"

**Solution**:
1. Verify `GITLAB_TOKEN` has `api` scope
2. Check `GITLAB_URL` if using self-hosted GitLab
3. Ensure server can reach GitLab API

## Next Steps

### 🎨 Customize Reviews

Edit `src/services/dify.service.js` to customize review prompts:

```javascript
buildCodeReviewPrompt(diff, fileName, language, context) {
  // Customize your prompt here
  return `Your custom prompt...`;
}
```

### 📚 Add Custom Best Practices

1. Create new markdown file in `knowledge-base/frontend/`:
   ```bash
   touch knowledge-base/frontend/nextjs-best-practices.md
   ```

2. Write best practices with examples

3. Upload to Dify:
   ```bash
   npm run setup:knowledge-base
   ```

### 🔐 Enable Authentication

Set API key for manual review endpoint:

```env
API_KEY=your_random_secret_key
```

Then use:
```bash
curl -X POST http://localhost:3000/api/review \
  -H "Authorization: Bearer your_random_secret_key" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 123, "mrIid": 1}'
```

### 📊 Add Monitoring

Set up monitoring with:
- Prometheus metrics: `http://localhost:3000/metrics`
- Health checks: `http://localhost:3000/health`
- Application logs: `logs/combined.log`

### 🚀 Deploy to Production

**Docker Deployment:**
```bash
docker build -t gitlab-ai-review:latest .
docker run -d -p 3000:3000 --env-file .env gitlab-ai-review:latest
```

**PM2 Process Management:**
```bash
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

**Cloud Platforms:**
- **AWS**: Deploy to ECS/Fargate using docker image
- **GCP**: Use Cloud Run with container registry
- **Azure**: Deploy to Container Instances

## Getting Help

- 📖 **Full Documentation**: See [README.md](README.md)
- 📚 **Knowledge Base Guide**: See [knowledge-base/README.md](knowledge-base/README.md)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/ponomarenko/gitlab-ai-code-review/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/ponomarenko/gitlab-ai-code-review/discussions)

## Architecture Overview

```
GitLab MR → Webhook → Review Service → {
  ├─ GitLab API (get changes)
  ├─ RAG Service (get best practices)
  │   ├─ Dify RAG (primary)
  │   └─ Local files (fallback)
  └─ Dify AI (analyze code)
} → Post review comment
```

## What Gets Reviewed?

The bot analyzes:
- ✅ Code quality and structure
- ✅ Security vulnerabilities
- ✅ Performance issues
- ✅ Best practices adherence
- ✅ Accessibility concerns
- ✅ Testing coverage
- ✅ Documentation quality

It skips:
- ❌ Binary files (images, videos)
- ❌ Lock files (package-lock.json)
- ❌ Minified files (*.min.js)
- ❌ Generated code
- ❌ Large diffs (>5000 chars)

## Tips for Best Results

1. **Keep MRs focused**: Smaller, focused MRs get better reviews
2. **Add context**: Include MR description for better AI understanding
3. **Review RAG content**: Ensure knowledge base is up-to-date
4. **Monitor logs**: Watch for errors or issues
5. **Iterate**: Customize prompts based on team needs

---

**Ready to go?** Start with `npm run dev` and create a test MR! 🚀