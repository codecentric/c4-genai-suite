FROM node:24.22.1-alpine3.23 AS base

FROM base AS build
WORKDIR /src

COPY . .

RUN npm ci --include=dev
RUN npm run build

FROM base
WORKDIR /srv

ENV NODE_ENV=production

COPY package*.json .
RUN npm ci --omit=dev
COPY --from=build /src/dist /srv/dist

CMD ["node", "dist/main.js"]
