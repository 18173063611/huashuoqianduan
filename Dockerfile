FROM node:22-alpine AS build
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_PET_CREATION_API_MODE=real
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
ENV VITE_PET_CREATION_API_MODE=${VITE_PET_CREATION_API_MODE}

RUN { \
      printf 'VITE_API_BASE_URL=%s\n' "$VITE_API_BASE_URL"; \
      if [ -n "$VITE_WS_BASE_URL" ]; then printf 'VITE_WS_BASE_URL=%s\n' "$VITE_WS_BASE_URL"; fi; \
      printf 'VITE_PET_CREATION_API_MODE=%s\n' "$VITE_PET_CREATION_API_MODE"; \
    } > .env.production \
    && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
