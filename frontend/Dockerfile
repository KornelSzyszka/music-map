FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS check
COPY . .
RUN npm run typecheck && npm run lint && npm run test

FROM deps AS build
COPY . .
RUN npm run build

# The atlas files are mounted at /usr/share/nginx/html/atlas, not baked into the image.
FROM nginx:1.29-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
