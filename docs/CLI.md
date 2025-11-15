# GitLab AI Code Review CLI

Production-ready CLI for running GitLab AI Code Review in CI/CD pipelines and containers.

## Installation

### NPM (Local)
```bash
npm install
npm link
```

### Docker
```bash
docker build -f Dockerfile.cli -t gitlab-ai-review:latest .
```

### Docker Compose
```bash
docker-compose -f docker-compose.cli.yml up -d
```

### Kubernetes
```bash
kubectl apply -f kubernetes/
```

## CLI Commands

### Server Mode
Start the webhook server:
```bash
gitlab-ai-review server
gitlab-ai-review server --port 3000 --host 0.0.0.0
```

### Manual Review
Trigger a code review manually:
```bash
gitlab-ai-review review --project 123 --mr 456
gitlab-ai-review review -p my-group/my-project -m 789 --force
```

### Health Check
Check service health and connectivity:
```bash
gitlab-ai-review health
gitlab-ai-review health --gitlab
gitlab-ai-review health --dify
gitlab-ai-review health --all
```

### Configuration
Display current configuration:
```bash
gitlab-ai-review config
gitlab-ai-review config --json
gitlab-ai-review config --validate
```

### Global Options
```bash
-v, --verbose    Enable verbose logging
-q, --quiet      Suppress non-error output
--version        Display version
--help           Display help
```

## Docker Usage

### Build Image
```bash
docker build -f Dockerfile.cli -t gitlab-ai-review:latest .
```

### Run Server
```bash
docker run -d \
  --name gitlab-ai-review \
  -p 3000:3000 \
  --env-file .env \
  gitlab-ai-review:latest
```

### Run Manual Review
```bash
docker run --rm \
  --env-file .env \
  gitlab-ai-review:latest \
  gitlab-ai-review review --project 123 --mr 456
```

### Run Health Check
```bash
docker run --rm \
  --env-file .env \
  gitlab-ai-review:latest \
  gitlab-ai-review health --all
```

### View Configuration
```bash
docker run --rm \
  --env-file .env \
  gitlab-ai-review:latest \
  gitlab-ai-review config --json
```

## Docker Compose

### Start Services
```bash
docker-compose -f docker-compose.cli.yml up -d
```

### View Logs
```bash
docker-compose -f docker-compose.cli.yml logs -f
```

### Stop Services
```bash
docker-compose -f docker-compose.cli.yml down
```

### Scale Services
```bash
docker-compose -f docker-compose.cli.yml up -d --scale gitlab-ai-review=3
```

## Kubernetes Deployment

### Deploy All Resources
```bash
kubectl apply -f kubernetes/
```

### Deploy Individual Resources
```bash
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/ingress.yaml
kubectl apply -f kubernetes/hpa.yaml
```

### Update Secrets
```bash
# Edit secret values
kubectl edit secret gitlab-ai-review-secrets

# Or create from file
kubectl create secret generic gitlab-ai-review-secrets \
  --from-env-file=.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

### View Logs
```bash
kubectl logs -f deployment/gitlab-ai-review
kubectl logs -f -l app=gitlab-ai-review --all-containers
```

### Scale Deployment
```bash
kubectl scale deployment gitlab-ai-review --replicas=5
```

### Port Forward (for testing)
```bash
kubectl port-forward deployment/gitlab-ai-review 3000:3000
```

## Environment Variables

All configuration is done via environment variables. See `.env.example` for all available options.

### Required Variables
- `GITLAB_TOKEN` - GitLab personal access token
- `DIFY_API_KEY` - Dify API key

### Optional Variables
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `GITLAB_URL` - GitLab instance URL
- `GITLAB_WEBHOOK_SECRET` - Webhook secret for validation
- `MAX_FILES_PER_REVIEW` - Maximum files to review
- `RAG_ENABLED` - Enable RAG support
- And more...

## CI/CD Integration

### GitLab CI
```yaml
review:
  image: registry.gitlab.com/your-org/gitlab-ai-review:latest
  script:
    - gitlab-ai-review review --project $CI_PROJECT_ID --mr $CI_MERGE_REQUEST_IID
  only:
    - merge_requests
```

### GitHub Actions
```yaml
- name: Run Code Review
  run: |
    docker run --rm \
      -e GITLAB_TOKEN=${{ secrets.GITLAB_TOKEN }} \
      -e DIFY_API_KEY=${{ secrets.DIFY_API_KEY }} \
      gitlab-ai-review:latest \
      gitlab-ai-review review --project 123 --mr 456
```

### Jenkins
```groovy
stage('Code Review') {
  steps {
    sh '''
      docker run --rm \
        -e GITLAB_TOKEN=${GITLAB_TOKEN} \
        -e DIFY_API_KEY=${DIFY_API_KEY} \
        gitlab-ai-review:latest \
        gitlab-ai-review review --project ${PROJECT_ID} --mr ${MR_IID}
    '''
  }
}
```

## Best Practices

### Security
1. **Never commit secrets** - Use environment variables or secret management
2. **Use read-only file systems** - Kubernetes deployment uses `readOnlyRootFilesystem: true`
3. **Run as non-root** - Container runs as user 1001
4. **Limit resources** - Set CPU and memory limits
5. **Enable security headers** - Helmet middleware is configured

### Performance
1. **Use health checks** - Kubernetes liveness and readiness probes
2. **Enable horizontal scaling** - HPA configuration included
3. **Set resource limits** - Prevent resource exhaustion
4. **Use compression** - Gzip compression enabled
5. **Implement caching** - Redis support available

### Reliability
1. **Graceful shutdown** - SIGTERM/SIGINT handlers
2. **Error handling** - Global error handlers
3. **Logging** - Structured logging with Winston
4. **Monitoring** - Prometheus metrics endpoint
5. **Rate limiting** - Prevent abuse

### Deployment
1. **Use rolling updates** - Zero-downtime deployments
2. **Version images** - Tag with commit SHA
3. **Test before deploy** - Run tests in CI/CD
4. **Monitor deployments** - Check logs and metrics
5. **Have rollback plan** - Keep previous versions

## Troubleshooting

### Check Logs
```bash
# Docker
docker logs gitlab-ai-review

# Docker Compose
docker-compose -f docker-compose.cli.yml logs -f

# Kubernetes
kubectl logs -f deployment/gitlab-ai-review
```

### Verify Configuration
```bash
# Docker
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review config

# Kubernetes
kubectl exec -it deployment/gitlab-ai-review -- gitlab-ai-review config
```

### Test Connectivity
```bash
# Docker
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review health --all

# Kubernetes
kubectl exec -it deployment/gitlab-ai-review -- gitlab-ai-review health --all
```

### Debug Mode
```bash
# Enable verbose logging
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review -v server

# Or set LOG_LEVEL
docker run --rm -e LOG_LEVEL=debug --env-file .env gitlab-ai-review:latest
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/gitlab-ai-review/issues
- Documentation: https://docs.example.com
- Email: support@example.com
