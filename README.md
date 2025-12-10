# GitLab AI Code Review Bot

Intelligent code review automation for GitLab using Dify AI with RAG support for frontend best practices.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Knowledge Base Setup](#knowledge-base-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)

## 📚 Quick Links

- [**Quick Start Guide**](QUICK_START.md) - Get started in 5 minutes
- [**Cost Analysis**](docs/COST_ANALYSIS.md) - Detailed pricing breakdown ($0.003-0.04/file)
- [**Knowledge Base Guide**](knowledge-base/README.md) - RAG setup and maintenance
- [**API Documentation**](docs/API.md) - Endpoint reference
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment
- [**FAQ**](docs/FAQ.md) - Frequently asked questions

## ✨ Features

- 🤖 **AI-Powered Reviews**: Leverages Dify API for intelligent code analysis
- 📚 **RAG Integration**: Context-aware reviews using best practices knowledge base
  - React, Vue, Angular best practices
  - Accessibility guidelines (WCAG)
  - Performance optimization patterns
  - Security best practices
- 🎯 **Repository Context**: Custom context files for project-specific guidelines
  - Monorepo/polyrepo structure awareness
  - Project-specific code style and standards
  - Custom skip patterns and focus areas
  - Technology stack considerations
- 🔄 **GitLab Webhook**: Automatic MR review triggers
- 🌐 **Multi-Language**: Supports 15+ programming languages
- 🔒 **Security Analysis**: Detects vulnerabilities and security issues
- 📊 **Detailed Reports**: Comprehensive review with actionable insights
- ⚡ **Performance**: Async processing with rate limiting
- 🔌 **Local Fallback**: Works even when Dify RAG is unavailable
- 🧪 **Test Coverage**: Built-in testing suite

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitLab MR                            │
│                    (Merge Request)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ Webhook Event
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Webhook Handler                           │
│             (Validates & Dispatches)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Review Service                            │
│            (Orchestrates Review Flow)                       │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐      ┌──────────────────┐
│   GitLab     │      │   RAG Service    │
│   Service    │      │  (Best Practices)│
└──────┬───────┘      └────────┬─────────┘
       │                       │
       │ Get Diffs            │ Query Knowledge
       ▼                       ▼
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│  MR Changes  │      │  Dify RAG API   │      │ knowledge-   │
│   (Diffs)    │      │   (Primary)     │      │   base/      │
└──────┬───────┘      └────────┬────────┘      │  (Fallback)  │
       │                       │                └──────┬───────┘
       │                       │ If unavailable        │
       │                       └───────────────────────┘
       │                                │
       └────────────────┬───────────────┘
                        ▼
                ┌───────────────┐
                │  Dify Service │
                │  (AI Review)  │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Review Result │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────────┐
                │  GitLab Comment   │
                │  (Posted to MR)   │
                └───────────────────┘
```

### Knowledge Base Flow

```
knowledge-base/
├── frontend/
│   ├── react-best-practices.md ──┐
│   ├── angular-best-practices.md ─┤
│   ├── accessibility.md ──────────┼─→ Upload Script
│   ├── performance.md ────────────┤     (npm run setup:knowledge-base)
│   └── security.md ───────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │  Dify RAG    │
                            │   Dataset    │
                            └──────┬───────┘
                                   │
        ┌──────────────────────────┼────────────────────────┐
        │ During Review            │                        │
        ▼                          ▼                        ▼
  ┌──────────┐            ┌─────────────┐         ┌──────────────┐
  │ Analyze  │  Query     │ Retrieve    │  Use    │  Enhanced    │
  │  File    │────────────│ Relevant    │─────────│  AI Review   │
  │  Type    │            │ Context     │         │  with Best   │
  └──────────┘            └─────────────┘         │  Practices   │
                                                   └──────────────┘
        │
        │ If Dify unavailable
        ▼
  ┌──────────────┐
  │ Local RAG    │
  │  Fallback    │
  │ (Read .md)   │
  └──────────────┘
```

## 📦 Prerequisites

- Node.js >= 22.x
- GitLab account with API access
- Dify account with API key
- Docker (optional, for containerized deployment)

## 🚀 Installation

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/gitlab-ai-review.git
cd gitlab-ai-review

# Run automated setup
npm run setup
```

The setup script will:
- ✅ Install dependencies
- ✅ Create `.env` from template
- ✅ Validate Node.js version
- ✅ Create logs directory
- ✅ Optionally upload knowledge base to Dify

### Manual Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# GitLab Configuration
GITLAB_TOKEN=glpat-your_token_here
GITLAB_URL=https://gitlab.com
GITLAB_WEBHOOK_SECRET=your_webhook_secret

# Dify Configuration
DIFY_API_KEY=app-your_dify_key
DIFY_API_URL=https://api.dify.ai/v1
DIFY_USER=gitlab-bot

# Review Configuration
MAX_FILES_PER_REVIEW=20
MAX_DIFF_SIZE=5000
ENABLE_INLINE_COMMENTS=false
SKIP_PATTERNS=node_modules,dist,build,*.lock

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# RAG Configuration
RAG_KNOWLEDGE_BASE=frontend-best-practices
RAG_ENABLED=true
```

### GitLab Webhook Setup

1. Navigate to: `Settings → Webhooks`
2. Add webhook URL: `https://your-domain.com/webhook/gitlab`
3. Secret Token: Use value from `GITLAB_WEBHOOK_SECRET`
4. Trigger events:
   - ✅ Merge request events
   - ✅ Comments
5. Enable SSL verification

### Dify RAG Setup

1. Create a new Dify application
2. Upload frontend best practices knowledge base:
   - React/Vue/Angular guidelines
   - Accessibility standards (WCAG)
   - Performance optimization patterns
   - Security best practices
   - CSS/HTML conventions
3. Enable RAG retrieval mode
4. Copy API key to `.env`

**Automated Setup:**

```bash
# Upload knowledge base to Dify automatically
npm run setup:knowledge-base
```

This script will:
- Read all markdown files from `knowledge-base/` directory
- Create a dataset in Dify
- Upload and index all documents
- Configure retrieval settings

**Manual Setup:**

Alternatively, you can manually upload files from `knowledge-base/` to Dify:
1. Go to Dify Console → Datasets
2. Create new dataset: "frontend-best-practices"
3. Upload markdown files from `knowledge-base/frontend/`
4. Wait for indexing to complete
5. Link dataset to your Dify app

**Local Fallback:**

The application includes a **local RAG fallback** that reads knowledge base files directly from the filesystem when Dify is unavailable. This ensures the bot continues working even without external RAG service.

## 📖 Usage

### Start Server

```bash
# Development
npm run dev

# Production
npm start

# With PM2
npm run start:pm2
```

### Repository Context Configuration

Enhance code review quality by providing repository-specific context. Create a `.aicodereview` file with information about your codebase:

```bash
# Copy example template
cp examples/.aicodereview.example .aicodereview

# Edit with your repository details
nano .aicodereview
```

The context file can include:
- **Repository Type**: monorepo, polyrepo, or library
- **Project Structure**: Description of directories and their purposes
- **Code Style Guidelines**: Project-specific coding standards
- **Review Focus Areas**: What to prioritize (performance, security, accessibility)
- **Skip Patterns**: Additional files/folders to exclude from review
- **Custom Instructions**: Special requirements for your team

**Using context in manual reviews:**

```bash
# Trigger review with repository context
gitlab-ai-review review -p 12345 -m 42 --context ./.aicodereview

# Short form
gitlab-ai-review review -p 12345 -m 42 -c ./.aicodereview
```

The AI will use this context to provide more relevant, project-specific feedback.

### Setup Knowledge Base (First Time)

Upload best practices to Dify RAG:

```bash
npm run setup:knowledge-base
```

This uploads all files from `knowledge-base/` directory to Dify, enabling context-aware code reviews with:
- ✅ React best practices
- ✅ Vue.js patterns  
- ✅ Angular 18+ guidelines
- ✅ Accessibility (WCAG)
- ✅ Performance optimization
- ✅ Security best practices

**Note**: The bot works even without Dify RAG - it falls back to reading local files from `knowledge-base/` directory.

### Manual Review Trigger

```bash
curl -X POST https://your-domain.com/api/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "projectId": "12345",
    "mrIid": 42
  }'
```

### Health Check

```bash
curl https://your-domain.com/health
```

## 📁 Project Structure

```
gitlab-ai-review/
├── src/
│   ├── config/
│   │   ├── index.js              # Configuration loader
│   │   └── constants.js          # Application constants
│   ├── services/
│   │   ├── gitlab.service.js     # GitLab API client
│   │   ├── dify.service.js       # Dify API client
│   │   ├── review.service.js     # Review orchestration
│   │   └── rag.service.js        # RAG knowledge base
│   ├── middleware/
│   │   ├── auth.middleware.js    # Authentication
│   │   ├── validation.middleware.js  # Request validation
│   │   ├── rateLimit.middleware.js   # Rate limiting
│   │   └── error.middleware.js   # Error handling
│   ├── controllers/
│   │   ├── webhook.controller.js # Webhook handler
│   │   └── review.controller.js  # Manual review
│   ├── utils/
│   │   ├── logger.js             # Winston logger
│   │   ├── errors.js             # Custom errors
│   │   ├── helpers.js            # Helper functions
│   │   └── prompt-loader.js      # Prompt template loader
│   ├── routes/
│   │   ├── index.js              # API routes
│   │   └── webhook.routes.js     # Webhook routes
│   └── app.js                    # Express app
├── tests/
│   ├── setup.js                  # Test configuration
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   └── review.test.js
│   └── fixtures/
├── docs/
│   ├── API.md                    # API documentation
│   ├── DEPLOYMENT.md             # Deployment guide
│   └── CONTRIBUTING.md           # Contributing guidelines
├── scripts/
│   ├── setup.sh                  # Setup script
│   └── deploy.sh                 # Deployment script
├── knowledge-base/                # Knowledge base & prompts
│   ├── prompts/                   # AI prompt templates
│   │   ├── actionable-review.md   # Default review prompt
│   │   ├── critical-only-review.md # Critical issues only
│   │   └── detailed-review.md     # Comprehensive review
│   ├── frontend/                  # Frontend best practices (RAG)
│   │   ├── react-best-practices.md
│   │   ├── vue-best-practices.md
│   │   ├── accessibility.md
│   │   ├── performance.md
│   │   └── security.md
│   ├── backend/                   # Backend best practices (RAG)
│   │   ├── api-design.md
│   │   └── security.md
│   └── README.md                  # Knowledge base documentation
├── logs/                          # Application logs (gitignored)
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI pipeline
│       └── deploy.yml            # Deployment pipeline
├── .husky/                        # Git hooks
│   └── pre-commit
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.js            # PM2 configuration
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── .dockerignore
├── jest.config.js
├── package.json
├── examples/
│   ├── .aicodereview.example      # Full context template
│   └── .aicodereview.minimal      # Minimal context template
└── README.md
```

### Repository Context File

The `.aicodereview` file (optional, placed in project root) provides project-specific information to the AI:

```markdown
# Repository Context
## Repository Type: monorepo
## Project Structure
- apps/api - NestJS BFF
- apps/ui - React UI client
## Code Style Guidelines
- Airbnb style guide
- Strict TypeScript mode
## Review Focus Areas
- Performance critical for UI
- Security critical for API
## Skip Patterns
- apps/ui-e2e/** (E2E tests)
```

Use with CLI:
```bash
gitlab-ai-review review -p <project> -m <mr> --context ./.aicodereview
```

## 🛠 Development

### Code Style

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Type checking
npm run typecheck
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Debugging

```bash
# Debug mode
npm run debug

# VS Code launch configuration provided
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t gitlab-ai-review:latest .

# Run container
docker run -d \
  --name gitlab-review-bot \
  -p 3000:3000 \
  --env-file .env \
  gitlab-ai-review:latest
```

### Docker Compose

```bash
docker-compose up -d
```

### PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Cloud Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Kubernetes

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## 📊 Monitoring

The application exposes metrics at `/metrics`:

- Request duration
- Review success/failure rate
- Dify API latency
- Memory usage
- Active connections

Recommended monitoring stack:
- Prometheus for metrics
- Grafana for visualization
- Sentry for error tracking

## 🔐 Security

- API key authentication
- Webhook signature verification
- Rate limiting
- Input validation
- Dependency scanning (Snyk/Dependabot)
- OWASP security headers

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md)

## 📞 Support

- 📧 Email: support@yourcompany.com
- 💬 Slack: #gitlab-ai-review
- 🐛 Issues: GitHub Issues

## 🙏 Acknowledgments

- Dify AI team for the excellent RAG platform
- GitLab community for API documentation
- OpenAI for GPT models
- All contributors and early adopters

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## 🔗 Related Projects

- [Dify](https://github.com/langgenius/dify) - LLM app development platform
- [GitLab](https://gitlab.com) - DevOps platform
- [Review Bot](https://gitlab.com/gitlab-org/gitlab-reviewbot) - GitLab's official bot

---

**Made with ❤️ for better code reviews**