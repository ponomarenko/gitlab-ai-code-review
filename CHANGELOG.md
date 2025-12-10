# Changelog

## [1.1.1](https://github.com/ponomarenko/gitlab-ai-code-review/compare/v1.1.0...v1.1.1) (2025-12-10)


### Bug Fixes

* update documentation links to reflect actual file structure ([#7](https://github.com/ponomarenko/gitlab-ai-code-review/issues/7)) ([d8bb599](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d8bb599e6a048a78b6a845186e38a186d0258311)), closes [#6](https://github.com/ponomarenko/gitlab-ai-code-review/issues/6)

## [1.1.0](https://github.com/ponomarenko/gitlab-ai-code-review/compare/v1.0.1...v1.1.0) (2025-12-10)


### Features

* add repository context support for project-specific code reviews ([#4](https://github.com/ponomarenko/gitlab-ai-code-review/issues/4)) ([d20a16e](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d20a16e22b66cff821391edb3a62e29cf8596500))

## [1.0.1](https://github.com/ponomarenko/gitlab-ai-code-review/compare/v1.0.0...v1.0.1) (2025-12-06)


### Bug Fixes

* handle duplicate award emoji gracefully ([#2](https://github.com/ponomarenko/gitlab-ai-code-review/issues/2)) ([36febf6](https://github.com/ponomarenko/gitlab-ai-code-review/commit/36febf61744ca29908fdd83e5e654c5f3453fb17))

## 1.0.0 (2025-12-06)


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
* explicitly set token for release-please action ([bc7a33d](https://github.com/ponomarenko/gitlab-ai-code-review/commit/bc7a33d9a22c2c4dcba420a185656d926b9e35a0))
* remove optional Trivy scan step from Docker image workflow ([d20d8d0](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d20d8d03200c48c50a2686068addff62078cb7e9))
* Remove unnecessary VSCode extension recommendations from extensions.json ([f094517](https://github.com/ponomarenko/gitlab-ai-code-review/commit/f094517164759c3db88ff3c5611a96a867ca3583))
* update Docker build context to current directory for image publishing ([a35c434](https://github.com/ponomarenko/gitlab-ai-code-review/commit/a35c4346208d2496cd04dcf566158b1eb6b9dd5f))
* update prepare script to use child_process for husky installation in non-CI environments ([6ec40ca](https://github.com/ponomarenko/gitlab-ai-code-review/commit/6ec40ca56465c266e83b05fe6cc81ae032539af3))
* update publish-image workflow to correct branch configuration and enhance Docker build steps ([4e9c585](https://github.com/ponomarenko/gitlab-ai-code-review/commit/4e9c5858f6eaee79db7f7d5819f8a4cf4ad573f7))
* update publish-image workflow to trigger on 'release' branch and streamline build steps ([9e3deea](https://github.com/ponomarenko/gitlab-ai-code-review/commit/9e3deea9adf4a17cc6bb1238e1cdfc0cf08e6946))
* update publish-image workflow to trigger only on 'main' branch and upgrade action versions ([3df34e9](https://github.com/ponomarenko/gitlab-ai-code-review/commit/3df34e9b9d652e2c4d14406f82e5af01da26e074))
* Update repository URLs in package.json to reflect correct GitHub links ([67a02d7](https://github.com/ponomarenko/gitlab-ai-code-review/commit/67a02d76e4a53c2ec243d139c58b1df8fb6990e2))
* update workflow to trigger on pushes to both 'release' and 'main' branches ([d0674b8](https://github.com/ponomarenko/gitlab-ai-code-review/commit/d0674b8c0d75934118a05c1258a4987a9fcf651f))
