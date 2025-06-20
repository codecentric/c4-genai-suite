FROM node:22.14.0-alpine3.21 AS base

FROM base AS backend_build
WORKDIR /src/backend
COPY library /src/library
COPY backend /src/backend
RUN npm ci --include=dev
RUN npm run build

FROM base AS frontend_build
ARG VERSION
WORKDIR /src/frontend
COPY frontend/package*.json .
RUN npm ci
COPY frontend .
RUN VITE_VERSION="$VERSION" npm run build

FROM base
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

RUN apk add --no-cache caddy tini
COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=backend_build /src/backend/dist /app/backend/dist
COPY --from=backend_build /src/library/dist /app/library/dist
COPY --from=frontend_build /src/frontend/dist /app/frontend

COPY library/package*.json /app/library/
WORKDIR /app/library
RUN npm ci --omit=dev

COPY backend/package*.json /app/backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 3000

CMD ["sh", "-c", "caddy run --config /etc/caddy/Caddyfile & node /app/backend/dist/main"]