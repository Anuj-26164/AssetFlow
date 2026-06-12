# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Template is rendered at container start by the nginx image entrypoint, which
# substitutes ${PORT} (only) using NGINX_ENVSUBST_FILTER and runs nginx.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=80
ENV NGINX_ENVSUBST_FILTER=PORT
EXPOSE 80
