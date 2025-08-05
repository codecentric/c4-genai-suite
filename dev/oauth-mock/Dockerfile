# Use Node.js LTS as the base image
FROM node:24.5.0-alpine3.21

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy tsconfig.json and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm install --only=development && \
 npm run build && \
 npm prune --production

# Remove source code and build dependencies to reduce image size
RUN rm -rf src tsconfig.json

# Expose the port the app runs on
EXPOSE 9999

ENV PORT=9999

# Run the application
CMD ["node", "dist/server.js"]
