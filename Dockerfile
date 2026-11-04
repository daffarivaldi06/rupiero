# Build the static web app.
FROM node:22 AS build
WORKDIR /app
ENV CI=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export -p web

# Serve it with nginx on port 8080 (Cloud Run's default).
FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
