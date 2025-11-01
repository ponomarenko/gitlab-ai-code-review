# Frequently Asked Questions (FAQ)

## General Questions

### What is this bot?
GitLab AI Code Review Bot is an automated code reviewer that uses AI (via Dify) to analyze merge requests and provide intelligent feedback based on best practices.

### How does it work?
1. GitLab sends webhook when MR is created/updated
2. Bot fetches code changes from GitLab
3. Bot queries knowledge base (RAG) for relevant best practices
4. Bot sends code + context to Dify AI for analysis
5. Bot posts comprehensive review as MR comment

### Do I need Dify?
Yes, you need a Dify account for AI analysis. However:
- Free tier is available
- Local RAG fallback works without Dify RAG
- You can modify code to use other AI providers

### What languages are supported?
The bot analyzes code in:
- JavaScript/TypeScript (React, Vue, Angular, Node.js)
- Python
- Java
- Go
- Ruby
- PHP
- C/C++/C#
- Rust
- Kotlin
- Swift
- And more!

## Setup Questions

### How long does setup take?
- **Quick setup**: 5 minutes (automated script)
- **Full setup with RAG**: 15 minutes
- **Production deployment**: 30-60 minutes

### Do I need to upload knowledge base?
Not required, but highly recommended! Without it:
- ✅ Bot still works and analyzes code
- ❌ Reviews won't include specific best practices
- ❌ Less context-aware feedback

### Can I use my own knowledge base?
Yes! Add markdown files to `knowledge-base/` directory and run:
```bash
npm run setup:knowledge-base
```

### What if Dify RAG is down?
Bot automatically falls back to reading local markdown files from `knowledge-base/` directory.

## Configuration Questions

### How do I get GitLab token?
1. Go to GitLab → **Settings** → **Access Tokens**
2. Create token with `api` scope
3. Copy and add to `.env`

### How do I get Dify API key?
1. Sign up at [Dify Cloud](https://cloud.dify.ai)
2. Create new application
3. Go to **API Access** → Copy key
4. Add to `.env`

### What's the webhook secret for?
It validates webhook requests are from GitLab. Optional but recommended for security.

### Can I use self-hosted GitLab?
Yes! Set `GITLAB_URL` in `.env`:
```env
GITLAB_URL=https://gitlab.yourcompany.com
```

### Can I use self-hosted Dify?
Yes! Set `DIFY_API_URL` in `.env`:
```env
DIFY_API_URL=https://dify.yourcompany.com/v1
```

## Usage Questions

### Will bot review all MRs automatically?
Yes, if webhook is configured. You can also:
- Trigger manually via API
- Disable webhook and use API only
- Filter by labels/branches (requires custom code)

### Can I skip certain files?
Yes! Configure in `.env`:
```env
SKIP_PATTERNS=node_modules,dist,*.test.js,*.spec.js
```

### Can I review specific files only?
Modify `review.service.js` to add file whitelist:
```javascript
shouldReviewFile(filePath) {
  const allowedPatterns = [/src\//, /lib\//];
  return allowedPatterns.some(p => p.test(filePath));
}
```

### How do I customize review prompts?
Edit `src/services/dify.service.js`:
```javascript
buildCodeReviewPrompt(diff, fileName, language, context) {
  return `Your custom prompt here...`;
}
```

### Can I add custom rules?
Yes! Add to knowledge base or modify prompt:
```javascript
const customRules = `
1. Always use async/await
2. No console.log in production
3. Add JSDoc comments
`;
```

## Performance Questions

### How many MRs can it handle?
- **Sequential**: ~10-20 per minute (depends on diff size)
- **With rate limiting**: 100 requests per 15 minutes
- **Concurrent**: 3 files analyzed in parallel

Adjust concurrency in `review.service.js`:
```javascript
const concurrency = 5; // Increase for more parallel processing
```

### Does it slow down MR process?
No! Review runs asynchronously:
1. Webhook responds immediately (200 OK)
2. Review runs in background
3. Results posted when ready (usually <1 minute)

### What about large MRs?
Large MRs are handled smartly:
- Files limited to `MAX_FILES_PER_REVIEW` (default: 20)
- Large diffs (>5000 chars) are skipped
- Binary files automatically skipped

### Can I cache reviews?
RAG queries are cached. For full review caching, add Redis:
```javascript
// Check cache before review
const cached = await redis.get(`review:${projectId}:${mrIid}:${sha}`);
if (cached) return JSON.parse(cached);
```

## Troubleshooting

### Bot doesn't post comments
**Check:**
1. GitLab token has `api` scope
2. Bot user has permission to comment
3. Webhook is configured correctly
4. Check logs: `npm run logs` or `logs/error.log`

### Webhook not triggering
**Solutions:**
1. Verify webhook URL is accessible
2. Check webhook secret matches
3. Test webhook in GitLab settings
4. Check firewall/network settings

### "Rate limit exceeded"
**Solutions:**
1. Increase limits in `.env`:
   ```env
   RATE_LIMIT_MAX_REQUESTS=200
   ```
2. Add delay between reviews
3. Use Redis for distributed rate limiting

### Dify API errors
**Solutions:**
1. Verify API key is correct
2. Check Dify account quota/limits
3. Try switching to local fallback temporarily
4. Check Dify status page

### Out of memory
**Solutions:**
1. Limit concurrent processing
2. Reduce `MAX_FILES_PER_REVIEW`
3. Increase Node.js memory:
   ```bash
   node --max-old-space-size=4096 src/app.js
   ```

### Reviews are too generic
**Solutions:**
1. Upload knowledge base to Dify RAG
2. Add more specific best practices
3. Improve prompts with examples
4. Add project-specific guidelines

## Advanced Usage

### Can I integrate with Slack?
Yes! Add notification service:
```javascript
async notifySlack(review) {
  await axios.post(process.env.SLACK_WEBHOOK, {
    text: `New review for MR ${review.mrIid}`,
    attachments: [{ text: review.summary }]
  });
}
```

### Can I use multiple AI providers?
Yes! Create provider abstraction:
```javascript
class AIProvider {
  async analyze(code) {
    switch(this.provider) {
      case 'dify': return this.difyAnalyze(code);
      case 'openai': return this.openaiAnalyze(code);
      case 'anthropic': return this.anthropicAnalyze(code);
    }
  }
}
```

### Can I save review history?
Yes! Add database:
```javascript
async saveReview(review) {
  await db.reviews.insert({
    projectId: review.projectId,
    mrIid: review.mrIid,
    result: review.result,
    timestamp: new Date()
  });
}
```

### Can I generate reports?
Yes! Add reporting service:
```javascript
async generateReport(projectId) {
  const reviews = await db.reviews.find({ projectId });
  return {
    totalReviews: reviews.length,
    avgFilesReviewed: _.meanBy(reviews, 'filesReviewed'),
    commonIssues: this.analyzeIssues(reviews)
  };
}
```

## Cost Questions

### Is it free?
The bot itself is free (MIT license). You pay for:
- Dify API usage (free tier available)
- Server hosting (if self-hosted)
- GitLab (if using paid tier)

### Dify pricing?
Check [Dify Pricing](https://dify.ai/pricing):
- Free tier: Good for small teams
- Pro: $59/month for more capacity
- Enterprise: Custom pricing

### Hosting costs?
Depends on deployment:
- **VPS**: $5-20/month (DigitalOcean, Linode)
- **Cloud**: $10-50/month (AWS, GCP, Azure)
- **Docker**: Any Linux server with Docker
- **Free**: Deploy on free tier (Render, Railway)

### How to reduce costs?
1. Use local RAG fallback (no Dify RAG needed)
2. Limit reviews to critical files only
3. Use smaller AI models
4. Cache aggressively
5. Deploy on cheap VPS

## Security Questions

### Is my code secure?
- Code is sent to Dify API for analysis
- Use self-hosted Dify for sensitive code
- Or modify to use local AI models
- Review Dify's [security practices](https://docs.dify.ai/security)

### How is data stored?
- Bot doesn't store code long-term
- Reviews stored in GitLab comments
- Logs may contain snippets (configure log level)
- RAG cache is in-memory only

### Can I audit what's sent?
Yes! Check logs:
```bash
LOG_LEVEL=debug npm run dev
```

Or add custom logging:
```javascript
logger.info('Sending to Dify', {
  fileName,
  diffSize: diff.length,
  hasContext: !!ragContext
});
```

### How to secure webhook?
1. Use GITLAB_WEBHOOK_SECRET
2. Use HTTPS in production
3. Add IP whitelist if needed
4. Monitor logs for suspicious activity

## Contributing Questions

### How can I contribute?
See [CONTRIBUTING.md](CONTRIBUTING.md):
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Where to report bugs?
[GitHub Issues](https://github.com/your-org/gitlab-ai-review/issues)

### How to suggest features?
[GitHub Discussions](https://github.com/your-org/gitlab-ai-review/discussions)

### Can I add new knowledge base topics?
Yes! Pull requests welcome:
1. Add `.md` file to `knowledge-base/`
2. Follow existing format
3. Include examples
4. Update README
5. Submit PR

---

## Still have questions?

- 📖 Check [Documentation](../README.md)
- 💬 Ask in [Discussions](https://github.com/your-org/gitlab-ai-review/discussions)
- 🐛 Report bugs in [Issues](https://github.com/your-org/gitlab-ai-review/issues)
- 📧 Email: support@yourcompany.com