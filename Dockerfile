# STAP 1: Build fase
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Kopieer package bestanden
COPY package*.json ./

# Installeer dependencies
RUN npm install

# Kopieer de rest van de code
COPY . .

# Haal de build variabelen op (nodig tijdens 'generate')
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

# Genereer de statische bestanden (dist map)
RUN npm run generate

# STAP 2: Runtime fase (Nginx)
FROM nginx:alpine

# Kopieer de statische bestanden van de builder naar de Nginx html map
# Let op: bij Nuxt 3 is de output map vaak '.output/public' ipv 'dist'
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Voeg je eigen nginx.conf toe als je die hebt, anders gebruikt hij de default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]