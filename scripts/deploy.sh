#!/bin/bash

# Deployment script for GitLab AI Code Review
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
NAMESPACE=${NAMESPACE:-default}

echo "=== GitLab AI Code Review Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Namespace: $NAMESPACE"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
  echo "Error: Invalid environment. Must be production, staging, or development"
  exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed"
  exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
  echo "Error: Cannot connect to Kubernetes cluster"
  exit 1
fi

# Create namespace if it doesn't exist
echo "Creating namespace if needed..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo "Applying ConfigMap..."
kubectl apply -f kubernetes/configmap.yaml -n $NAMESPACE

# Apply Secret (if exists)
if [ -f "kubernetes/secret.yaml" ]; then
  echo "Applying Secret..."
  kubectl apply -f kubernetes/secret.yaml -n $NAMESPACE
else
  echo "Warning: kubernetes/secret.yaml not found. Make sure secrets are configured."
fi

# Update image version in deployment
echo "Updating deployment with version $VERSION..."
kubectl set image deployment/gitlab-ai-review \
  gitlab-ai-review=gitlab-ai-review:$VERSION \
  -n $NAMESPACE

# Apply deployment
echo "Applying Deployment..."
kubectl apply -f kubernetes/deployment.yaml -n $NAMESPACE

# Apply Service
echo "Applying Service..."
kubectl apply -f kubernetes/deployment.yaml -n $NAMESPACE

# Apply Ingress (if production)
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Applying Ingress..."
  kubectl apply -f kubernetes/ingress.yaml -n $NAMESPACE
fi

# Apply HPA
echo "Applying HorizontalPodAutoscaler..."
kubectl apply -f kubernetes/hpa.yaml -n $NAMESPACE

# Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/gitlab-ai-review -n $NAMESPACE --timeout=5m

# Verify deployment
echo ""
echo "=== Deployment Status ==="
kubectl get deployment gitlab-ai-review -n $NAMESPACE
kubectl get pods -l app=gitlab-ai-review -n $NAMESPACE
kubectl get svc gitlab-ai-review -n $NAMESPACE

# Run health check
echo ""
echo "=== Health Check ==="
POD=$(kubectl get pod -l app=gitlab-ai-review -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -n $NAMESPACE -- gitlab-ai-review health --all || true

echo ""
echo "=== Deployment Complete ==="
echo "To view logs: kubectl logs -f deployment/gitlab-ai-review -n $NAMESPACE"
echo "To port-forward: kubectl port-forward deployment/gitlab-ai-review 3000:3000 -n $NAMESPACE"
