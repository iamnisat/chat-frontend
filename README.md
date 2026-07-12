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
docker run -p 8080:8080 -e VITE_SOCKET_URL=https://deploy.farminsight.dev chat-frontend
```

## Environment Variables

| Variable          | Description                          | Default                 |
| ----------------- | ------------------------------------ | ----------------------- |
| `VITE_SOCKET_URL` | Backend Socket.IO server URL         | `http://localhost:8080` |
| `VITE_APP_ENV`    | Environment (development/production) | `development`           |

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

### Google Cloud authentication

```bash
gcloud auth login
gcloud config set project upheld-setting-423215-p7
```

### Build and Deploy (using cloudbuild.yaml)

```bash
gcloud builds submit --config cloudbuild.yaml .
```

This will:

1. Build the Docker image with `VITE_SOCKET_URL` as a build arg
2. Push the image to Google Container Registry
3. Deploy to Cloud Run with the correct environment

#### Deploy to Cloud Run

```bash
gcloud run deploy chat-frontend \
  --image=gcr.io/upheld-setting-423215-p7/chat-frontend \
  --port=8080 \
  --region=us-central1 \
  --allow-unauthenticated \
  --platform managed
```
