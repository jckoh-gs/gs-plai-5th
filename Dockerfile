FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY web ./web
COPY vite.config.js ./
RUN npm run build
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ARG SOURCE_COMMIT=uncommitted
ARG PRD_VERSION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT org.opencontainers.image.version=$PRD_VERSION
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DB_PATH=/data/lab.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && npm ci --omit=dev --ignore-scripts && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/* /root/.npm
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
COPY samples ./samples
COPY docs/protocol.md ./docs/protocol.md
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
