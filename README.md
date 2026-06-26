# Chat Frontend

A React 18+ TypeScript chat application that connects to a Socket.IO backend.

## Features

- Login screen with user/farmer identity selection
- Thread list sidebar with mock thread IDs
- Real-time chat with message bubbles
- Typing indicators
- Connection status display
- Character counter (5000 max)
- Responsive design
- Auto-scroll to latest messages

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```
VITE_SOCKET_URL=http://localhost:8080
VITE_APP_ENV=development
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Run Tests

```bash
npm run test
```

### Build

```bash
npm run build
```

## Docker

### Build Image

```bash
docker build -t chat-frontend .
```

### Run Container

```bash
docker run -p 8080:8080 -e VITE_SOCKET_URL=https://chat-middleware-u25qpvjxya-uc.a.run.app chat-frontend
```

## Google Cloud Run Deployment

### Option 1: Using deploy.sh

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Using gcloud CLI

```bash
gcloud run deploy chat-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_SOCKET_URL=https://chat-middleware-u25qpvjxya-uc.a.run.app"
```

### Option 3: Using Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml .
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SOCKET_URL` | Backend Socket.IO server URL | `http://localhost:8080` |
| `VITE_APP_ENV` | Environment (development/production) | `development` |

## Project Structure

```
src/
├── components/        # React components
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   ├── ThreadList.tsx
│   ├── TypingIndicator.tsx
│   └── ConnectionStatus.tsx
├── context/          # React context
│   └── SocketContext.tsx
├── hooks/            # Custom hooks
│   ├── useChat.ts
│   └── useSocket.ts
├── pages/            # Page components
│   ├── LoginPage.tsx
│   └── ChatPage.tsx
├── types/            # TypeScript types
│   └── index.ts
└── __tests__/        # Tests
    ├── ChatPage.test.tsx
    ├── MessageBubble.test.tsx
    └── SocketContext.test.tsx
```


## ------------ Google Cloud Platform ------------

# Google Cloud authentication

gcloud auth login

gcloud config set project upheld-setting-423215-p7

## Docker Image push to GCloud Artifact Registry

gcloud builds submit \
  --tag us-central1-docker.pkg.dev/upheld-setting-423215-p7/development/chat-frontend

## Artifact Registry run deploy

gcloud run deploy chat-frontend \
--image=us-central1-docker.pkg.dev/upheld-setting-423215-p7/development/chat-frontend \
--port=8080 \
--region=us-central1 \
--allow-unauthenticated \
--platform managed