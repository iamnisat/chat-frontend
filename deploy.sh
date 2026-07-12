#!/bin/bash
set -e

echo "Deploying chat-frontend to Cloud Run..."

gcloud run deploy chat-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_SOCKET_URL=https://deploy.farminsight.dev"

echo "Deployment complete!"
