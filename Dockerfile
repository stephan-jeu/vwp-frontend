# STAP 1: Build fase
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Installeer pnpm (omdat ik pnpm-lock.yaml in je ls zie)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Kopieer package bestanden
COPY package.json pnpm-lock.yaml* ./

# Installeer dependencies
RUN pnpm install

# Kopieer de rest van de code
COPY . .

# Build de statische site
# Voor Nuxt 4 SSG gebruiken we 'nuxi generate'
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
RUN npx nuxi generate

# STAP 2: Runtime fase (Nginx)
FROM nginx:alpine

# Verwijder de standaard bestanden
RUN rm -rf /usr/share/nginx/html/*

# Kopieer de statische output van Nuxt 4 naar Nginx
# De output van 'nuxi generate' staat in .output/public
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Kopieer je eigen nginx.conf (essentieel voor SPA routing!)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]