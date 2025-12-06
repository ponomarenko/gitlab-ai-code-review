# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.1.0 (2025-12-06)


### Features

* add configurable review focus levels with smart filtering ([19fb1a8](https://github.com/ponomarenko/gitlab-ai-code-review/commit/19fb1a84c0c00eff3301ef6c3fd63e5a5da87621))
* add GitHub Actions workflow for Docker image publishing and update Dockerfile and package.json for improved CI/CD ([467dd90](https://github.com/ponomarenko/gitlab-ai-code-review/commit/467dd90be6c9b1dfa8f68660a9f2c21fbf5b7107))
* add production-ready CLI with Docker and Kubernetes support ([6dc4027](https://github.com/ponomarenko/gitlab-ai-code-review/commit/6dc4027441b124adc34c2e696f0eb33ea52d5a99))
* add versioning with standard-version and app version logging ([471c8a5](https://github.com/ponomarenko/gitlab-ai-code-review/commit/471c8a5f0b07419b62be3216656a137d0e6dcdec))
* Add VSCode configuration files for improved development experience ([bb5b0ef](https://github.com/ponomarenko/gitlab-ai-code-review/commit/bb5b0ef7a5ea5f9362159a4355df6b782a1a23b9))
* AI-generated links and simplified review formatting ([d78be34](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d78be3476f71318f8e4f7be687440b628d220a9d))
* Implement comprehensive code review system with RAG integration ([c63c122](https://github.com/ponomarenko/gitlab-ai-code-review/commit/c63c1225d652f61937481c146be1eaf68a4ed5f4))
* Update ESLint configuration and improve middleware error handling ([fc95b3c](https://github.com/ponomarenko/gitlab-ai-code-review/commit/fc95b3c956a9cea9567b4b80c66140aebb431498))
* Update pre-commit hook to use lint-staged and enhance Dockerfile dependency installation ([a53a267](https://github.com/ponomarenko/gitlab-ai-code-review/commit/a53a267f6e4fd2fd1293100ce73fc1761b764d51))
* Upgrade Node.js version to 22 across Dockerfile, prerequisites, and setup scripts ([40004e6](https://github.com/ponomarenko/gitlab-ai-code-review/commit/40004e6bb5f990df8b285d972a1fca65ecb5e27b))


### Bug Fixes

* allow manual runs in Docker image workflow and enhance buildx setup ([db190d6](https://github.com/ponomarenko/gitlab-ai-code-review/commit/db190d616944d97edf18aafb90e2bbb8011cf0c4))
* enhance Docker image workflow by adding QEMU and Buildx setup steps ([46fedbb](https://github.com/ponomarenko/gitlab-ai-code-review/commit/46fedbbd805f6f8baea0285aebea8cfea4e17fe8))
* remove optional Trivy scan step from Docker image workflow ([d20d8d0](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d20d8d03200c48c50a2686068addff62078cb7e9))
* Remove unnecessary VSCode extension recommendations from extensions.json ([f094517](https://github.com/ponomarenko/gitlab-ai-code-review/commit/f094517164759c3db88ff3c5611a96a867ca3583))
* update Docker build context to current directory for image publishing ([a35c434](https://github.com/ponomarenko/gitlab-ai-code-review/commit/a35c4346208d2496cd04dcf566158b1eb6b9dd5f))
* update prepare script to use child_process for husky installation in non-CI environments ([6ec40ca](https://github.com/ponomarenko/gitlab-ai-code-review/commit/6ec40ca56465c266e83b05fe6cc81ae032539af3))
* update publish-image workflow to correct branch configuration and enhance Docker build steps ([4e9c585](https://github.com/ponomarenko/gitlab-ai-code-review/commit/4e9c5858f6eaee79db7f7d5819f8a4cf4ad573f7))
* update publish-image workflow to trigger on 'release' branch and streamline build steps ([9e3deea](https://github.com/ponomarenko/gitlab-ai-code-review/commit/9e3deea9adf4a17cc6bb1238e1cdfc0cf08e6946))
* update publish-image workflow to trigger only on 'main' branch and upgrade action versions ([3df34e9](https://github.com/ponomarenko/gitlab-ai-code-review/commit/3df34e9b9d652e2c4d14406f82e5af01da26e074))
* Update repository URLs in package.json to reflect correct GitHub links ([67a02d7](https://github.com/ponomarenko/gitlab-ai-code-review/commit/67a02d76e4a53c2ec243d139c58b1df8fb6990e2))
* update workflow to trigger on pushes to both 'release' and 'main' branches ([d0674b8](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d0674b8c0d75934118a05c1258a4987a9fcf651f))


### Code Refactoring

* extract AI prompts from dify.service.js to knowledge-base templates ([140b898](https://github.com/ponomarenko/gitlab-ai-code-review/commit/140b8988cfd6c7e1d7c02d04ff51743ea5ab919f))
* Replace `settings.default.json` with `settings.json` for simplified VSCode configuration management ([921d204](https://github.com/ponomarenko/gitlab-ai-code-review/commit/921d20444096d4718a3ea0b3a6f481309837f8e2))

## [1.0.0] - 2025-01-15

### Added
- 🚀 Initial release of GitLab AI Code Review Bot
- 🤖 Dify AI integration for intelligent code analysis
- 📚 RAG (Retrieval-Augmented Generation) support with knowledge base
- 🔄 GitLab webhook integration for automatic MR reviews
- 🎯 Multi-language support (JavaScript, TypeScript, Python, Java, Go, etc.)
- 🔒 Security analysis and vulnerability detection
- ⚡ Async processing with concurrency control
- 📊 Comprehensive review reports with severity levels

### Knowledge Base
- ✅ React best practices (Hooks, components, performance)
- ✅ Vue.js guidelines and patterns
- ✅ Angular 18+ best practices (Signals, standalone components)
- ✅ NestJS framework (DI, modules, TypeORM, testing)
- ✅ RESTful API design (HTTP methods, versioning, pagination)
- ✅ Backend security (OWASP Top 10, auth, encryption)
- ✅ Web accessibility guidelines (WCAG, ARIA)
- ✅ Frontend performance optimization
- ✅ Frontend security best practices (XSS, CSRF, authentication)

### Infrastructure
- 🐳 Docker and Docker Compose support
- 🔧 PM2 configuration for production
- 📝 Winston logging with rotation
- 🛡️ Security middleware (Helmet, CORS, rate limiting)
- ✅ Input validation with Joi
- 🧪 Jest testing framework setup
- 🔄 CI/CD GitHub Actions workflows

### Services
- **GitLab Service**: Full API client for MR operations
- **Dify Service**: AI analysis with configurable prompts
- **Review Service**: Orchestrates review workflow
- **RAG Service**: Knowledge base integration with local fallback
- **Local RAG Service**: Fallback for offline/unavailable Dify RAG

### Developer Tools
- 📦 Automated setup script (`npm run setup`)
- 📚 Knowledge base upload script (`npm run setup:knowledge-base`)
- 🔍 ESLint + Prettier configuration
- 🪝 Husky pre-commit hooks
- 📖 Comprehensive documentation

### Features
- **Automatic Reviews**: Triggered on MR open/update/reopen
- **Manual Reviews**: API endpoint for on-demand reviews
- **Contextual Feedback**: Uses RAG to provide best practices
- **Inline Comments**: Optional line-specific feedback
- **Commit Status**: Updates GitLab commit status
- **Smart Filtering**: Skips binary files, lock files, large diffs
- **Caching**: RAG query results cached for performance
- **Error Handling**: Graceful degradation and fallbacks
- **Rate Limiting**: Protects against abuse
- **Health Checks**: `/health` and `/ready` endpoints
- **Metrics**: Prometheus-compatible `/metrics` endpoint

### Documentation
- README.md with full setup instructions
- QUICK_START.md for rapid deployment
- knowledge-base/README.md for RAG maintenance
- API documentation placeholder
- Deployment guide placeholder
- Contributing guidelines placeholder

## [Unreleased]

### Planned
- [ ] Inline code suggestions
- [ ] Multi-file context analysis
- [ ] Custom review rules configuration
- [ ] Review result dashboard
- [ ] Slack/Teams notifications
- [ ] Review statistics and metrics
- [ ] Code fix suggestions with auto-apply
- [ ] Support for more programming languages
- [ ] Fine-tuned models for specific frameworks
- [ ] Review templates and presets

### Under Consideration
- [ ] GitHub integration
- [ ] Bitbucket support
- [ ] Self-hosted AI models option
- [ ] Review scheduling
- [ ] Team-specific knowledge bases
- [ ] Review quality feedback loop
- [ ] Integration with JIRA/Linear

---

## Version History

### Version 1.0.0
**Release Date**: 2025-01-15

**What's New**:
- Complete GitLab + Dify integration
- RAG-powered contextual reviews
- Production-ready deployment options
- Comprehensive knowledge base
- Local fallback for offline operation

**Breaking Changes**: None (initial release)

**Migration Guide**: N/A (initial release)

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on:
- Code of conduct
- Development workflow
- Pull request process
- Commit message conventions

## Links

- [Repository](https://github.com/your-org/gitlab-ai-review)
- [Issues](https://github.com/your-org/gitlab-ai-review/issues)
- [Discussions](https://github.com/your-org/gitlab-ai-review/discussions)
- [Documentation](https://github.com/your-org/gitlab-ai-review/wiki)