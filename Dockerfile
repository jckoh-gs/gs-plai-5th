FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY web ./web
COPY vite.config.js ./
RUN npm run build
FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ARG SOURCE_COMMIT=uncommitted
ARG PRD_VERSION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT org.opencontainers.image.version=$PRD_VERSION grid.runtime.variant=alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DB_PATH=/data/lab.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk upgrade --no-cache \
    && npm ci --omit=dev --ignore-scripts && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && rm -rf /var/cache/apk/* /root/.npm
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
COPY samples ./samples
COPY docs/protocol.md ./docs/protocol.md
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
