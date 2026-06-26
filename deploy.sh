#!/bin/bash
set -e

echo "Deploying chat-frontend to Cloud Run..."

gcloud run deploy chat-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_SOCKET_URL=https://chat-middleware-u25qpvjxya-uc.a.run.app"

echo "Deployment complete!"
