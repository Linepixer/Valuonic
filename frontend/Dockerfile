# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
# Feed the version shown in the footer (see vite.config.js); unset locally, which yields a -dev version.
ARG BUILD_NUMBER
ARG GIT_SHA
RUN npm run build

# Server stage
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# CSP connect-src needs the API origin; in prod it is same-origin, locally it is a different port.
ARG VITE_API_URL
RUN api_origin=$(printf '%s' "$VITE_API_URL" | sed -nE 's#^(https?://[^/]+).*#\1#p') \
    && sed -i "s#__API_ORIGIN__#${api_origin}#" /etc/nginx/security-headers.conf \
    && nginx -t

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
