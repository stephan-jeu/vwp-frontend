# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy requirements
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
# For SPA mode (ssr: false), 'nuxt build' or 'nuxt generate' creates proper output.
# 'nuxt typecheck' is run optionally, but let's skip it for speed in Docker.
RUN pnpm generate

# Stage 2: Serve
FROM nginx:alpine

# Copy built assets from builder stage
# Nuxt 3/4 outputs to .output/public for static generation
COPY --from=build /app/.output/public /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
