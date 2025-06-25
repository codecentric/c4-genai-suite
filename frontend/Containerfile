FROM node:22.14.0 AS build
ARG VERSION
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
RUN VITE_VERSION="$VERSION" npm run build


FROM caddy:2.10.0

WORKDIR /srv

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
