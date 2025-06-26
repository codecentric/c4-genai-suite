FROM node:24.3.0-alpine3.21 AS base

FROM base AS backend_build
WORKDIR /src/backend
COPY backend .
RUN npm ci --include=dev
RUN npm run build

FROM base AS frontend_build
ARG VERSION
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN VITE_VERSION="$VERSION" npm run build

FROM base
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

RUN apk add --no-cache caddy=2.8.4-r7 tini=0.19.0-r3
COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=backend_build /src/backend/dist /app/backend/dist
COPY --from=frontend_build /src/frontend/dist /app/frontend

COPY backend/package*.json /app/backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 3000

CMD ["sh", "-c", "caddy run --config /etc/caddy/Caddyfile & node /app/backend/dist/main"]