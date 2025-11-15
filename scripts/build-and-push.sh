#!/bin/bash

# Build and push Docker image
# Usage: ./scripts/build-and-push.sh [version]

set -e

VERSION=${1:-latest}
REGISTRY=${REGISTRY:-registry.gitlab.com/your-org}
IMAGE_NAME=${IMAGE_NAME:-gitlab-ai-review}
FULL_IMAGE="$REGISTRY/$IMAGE_NAME"

echo "=== Building Docker Image ==="
echo "Image: $FULL_IMAGE:$VERSION"
echo ""

# Build CLI image
echo "Building CLI image..."
docker build -f Dockerfile.cli -t "$FULL_IMAGE:$VERSION" -t "$FULL_IMAGE:latest" .

# Build standard image (optional)
echo "Building standard image..."
docker build -f Dockerfile -t "$FULL_IMAGE:standard-$VERSION" .

# Run tests in container
echo ""
echo "=== Running Tests ==="
docker run --rm "$FULL_IMAGE:$VERSION" npm test || {
  echo "Tests failed!"
  exit 1
}

# Security scan (if trivy is installed)
if command -v trivy &> /dev/null; then
  echo ""
  echo "=== Security Scan ==="
  trivy image "$FULL_IMAGE:$VERSION"
fi

# Push images
echo ""
echo "=== Pushing Images ==="
docker push "$FULL_IMAGE:$VERSION"
docker push "$FULL_IMAGE:latest"
docker push "$FULL_IMAGE:standard-$VERSION"

echo ""
echo "=== Build Complete ==="
echo "Images pushed:"
echo "  - $FULL_IMAGE:$VERSION"
echo "  - $FULL_IMAGE:latest"
echo "  - $FULL_IMAGE:standard-$VERSION"
