FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Vite uses these values at build time.
ARG VITE_BACKEND_URL
ARG VITE_BASE_URL
ARG VITE_GIPHY_API_KEY
ARG VITE_JITSI_DOMAIN

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_GIPHY_API_KEY=${VITE_GIPHY_API_KEY}
ENV VITE_JITSI_DOMAIN=${VITE_JITSI_DOMAIN}

# Display the environment variables for debugging
RUN echo "VITE_BACKEND_URL: $VITE_BACKEND_URL"
RUN echo "VITE_BASE_URL: $VITE_BASE_URL"
RUN echo "VITE_GIPHY_API_KEY: $VITE_GIPHY_API_KEY"
RUN echo "VITE_JITSI_DOMAIN: $VITE_JITSI_DOMAIN"

# If the build arguments are not set, terminate the build
RUN if [ -z "$VITE_BACKEND_URL" ] || [ -z "$VITE_BASE_URL" ] || [ -z "$VITE_GIPHY_API_KEY" ] || [ -z "$VITE_JITSI_DOMAIN" ]; then \
      echo "One or more required build arguments are missing. Terminating the build." && exit 1; \
    fi

RUN npm run build

FROM nginx:1.27-alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/build /usr/share/nginx/html


# Use static nginx.conf from docker directory
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
