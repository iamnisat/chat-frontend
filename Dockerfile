FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first so this layer is cached unless package.json/lock change
COPY package.json package-lock.json* ./
RUN npm ci

# Build-time env (baked into the static bundle by Vite)
ARG VITE_SOCKET_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
