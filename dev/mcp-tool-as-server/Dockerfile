#
# Base image for all modules
#
FROM node:22.14.0-alpine3.21 AS base

#
# MCP SERVER
#
FROM base AS mcp_server

WORKDIR /src/mcp-server

COPY package*.json ./

# Optimized installation for build servers.
RUN npm ci

COPY . .

# Run the build command which creates the production bundle
RUN npm run build

#
# MCP SERVER DEPENDENCIES
#
FROM base AS mcp_server_dependencies

WORKDIR /src/mcp-server

COPY package*.json ./

RUN npm ci --omit=dev

#
# RUNTIME
#
FROM base AS production

RUN apk add git python3=3.12.11-r0 uv=0.5.31-r0

WORKDIR /mcp-server

COPY --from=mcp_server_dependencies /src/mcp-server/node_modules /mcp-server/node_modules
COPY --from=mcp_server /src/mcp-server/dist /mcp-server/dist

EXPOSE 80

CMD ["node", "/mcp-server/dist/index"]
