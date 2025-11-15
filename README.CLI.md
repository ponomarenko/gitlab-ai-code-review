# GitLab AI Code Review - CLI & Container Guide

Production-ready CLI tool with Docker and Kubernetes support for CI/CD pipelines.

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Link CLI globally
npm link

# Run server
gitlab-ai-review server

# Run manual review
gitlab-ai-review review --project 123 --mr 456

# Check health
gitlab-ai-review health --all
```

### Docker
```bash
# Build image
docker build -f Dockerfile.cli -t gitlab-ai-review:latest .

# Run server
docker run -d -p 3000:3000 --env-file .env gitlab-ai-review:latest

# Run CLI commands
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review config
```

### Docker Compose
```bash
# Start all services
docker-compose -f docker-compose.cli.yml up -d

# View logs
docker-compose -f docker-compose.cli.yml logs -f

# Stop services
docker-compose -f docker-compose.cli.yml down
```

### Kubernetes
```bash
# Deploy to cluster
kubectl apply -f kubernetes/

# Check status
kubectl get pods -l app=gitlab-ai-review

# View logs
kubectl logs -f deployment/gitlab-ai-review
```

## CLI Commands

### `server` - Start Webhook Server
```bash
gitlab-ai-review server [options]

Options:
  -p, --port <port>    Server port (default: 3000)
  -h, --host <host>    Server host (default: 0.0.0.0)
```

### `review` - Manual Code Review
```bash
gitlab-ai-review review [options]

Options:
  -p, --project <id>   GitLab project ID (required)
  -m, --mr <iid>       Merge request IID (required)
  -f, --force          Force review even if already reviewed
```

### `health` - Health Check
```bash
gitlab-ai-review health [options]

Options:
  --gitlab    Check GitLab connectivity
  --dify      Check Dify API connectivity
  --all       Check all services
```

### `config` - Configuration
```bash
gitlab-ai-review config [options]

Options:
  --validate  Validate configuration only
  --json      Output as JSON
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
GITLAB_TOKEN=your_gitlab_token
DIFY_API_KEY=your_dify_api_key

# Optional
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
GITLAB_URL=https://gitlab.com
MAX_FILES_PER_REVIEW=20
RAG_ENABLED=true
```

## CI/CD Integration

### GitLab CI
```yaml
stages:
  - review

code-review:
  stage: review
  image: registry.gitlab.com/your-org/gitlab-ai-review:latest
  script:
    - gitlab-ai-review review --project $CI_PROJECT_ID --mr $CI_MERGE_REQUEST_IID
  only:
    - merge_requests
  variables:
    GITLAB_TOKEN: $GITLAB_TOKEN
    DIFY_API_KEY: $DIFY_API_KEY
```

### GitHub Actions
```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Run AI Code Review
        run: |
          docker run --rm \
            -e GITLAB_TOKEN=${{ secrets.GITLAB_TOKEN }} \
            -e DIFY_API_KEY=${{ secrets.DIFY_API_KEY }} \
            gitlab-ai-review:latest \
            gitlab-ai-review review --project 123 --mr 456
```

### Jenkins
```groovy
pipeline {
  agent any
  stages {
    stage('Code Review') {
      steps {
        script {
          docker.image('gitlab-ai-review:latest').inside {
            sh 'gitlab-ai-review review --project ${PROJECT_ID} --mr ${MR_IID}'
          }
        }
      }
    }
  }
}
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.19+)
- kubectl configured
- Container registry access

### Deploy
```bash
# Create secrets
kubectl create secret generic gitlab-ai-review-secrets \
  --from-literal=GITLAB_TOKEN=your_token \
  --from-literal=DIFY_API_KEY=your_key

# Deploy all resources
kubectl apply -f kubernetes/

# Verify deployment
kubectl get pods -l app=gitlab-ai-review
kubectl logs -f deployment/gitlab-ai-review
```

### Update Configuration
```bash
# Edit ConfigMap
kubectl edit configmap gitlab-ai-review-config

# Restart pods to apply changes
kubectl rollout restart deployment/gitlab-ai-review
```

### Scale
```bash
# Manual scaling
kubectl scale deployment gitlab-ai-review --replicas=5

# Auto-scaling (HPA already configured)
kubectl get hpa gitlab-ai-review
```

## Best Practices

### Security
- ✅ Run as non-root user (UID 1001)
- ✅ Read-only root filesystem
- ✅ No privilege escalation
- ✅ Security headers enabled
- ✅ Secrets in environment variables
- ✅ Rate limiting configured

### Performance
- ✅ Multi-stage Docker builds
- ✅ Minimal Alpine base image
- ✅ Production dependencies only
- ✅ Compression enabled
- ✅ Resource limits set
- ✅ Horizontal pod autoscaling

### Reliability
- ✅ Health checks configured
- ✅ Graceful shutdown handling
- ✅ Error logging and monitoring
- ✅ Rolling updates
- ✅ Pod anti-affinity
- ✅ Readiness probes

### Monitoring
- ✅ Prometheus metrics endpoint
- ✅ Structured logging (JSON)
- ✅ Health check endpoints
- ✅ Resource usage tracking

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs gitlab-ai-review

# Verify configuration
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review config --validate

# Test connectivity
docker run --rm --env-file .env gitlab-ai-review:latest gitlab-ai-review health --all
```

### Kubernetes pod crashes
```bash
# Check pod status
kubectl describe pod <pod-name>

# View logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Verify secrets
kubectl get secret gitlab-ai-review-secrets -o yaml
```

### Performance issues
```bash
# Check resource usage
kubectl top pods -l app=gitlab-ai-review

# View metrics
curl http://localhost:3000/metrics

# Check HPA status
kubectl get hpa gitlab-ai-review
```

## Advanced Usage

### Custom Knowledge Base
Mount custom knowledge base in Docker:
```bash
docker run -d \
  -v ./custom-kb:/app/knowledge-base:ro \
  --env-file .env \
  gitlab-ai-review:latest
```

### Redis Caching
Enable Redis in docker-compose.cli.yml:
```yaml
environment:
  - REDIS_URL=redis://redis:6379
```

### Multiple Environments
```bash
# Staging
kubectl apply -f kubernetes/ -n staging

# Production
kubectl apply -f kubernetes/ -n production
```

## Documentation

- [Full CLI Documentation](docs/CLI.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [API Documentation](docs/API.md)

## Support

- Issues: https://github.com/your-org/gitlab-ai-review/issues
- Docs: https://docs.example.com
- Email: support@example.com
