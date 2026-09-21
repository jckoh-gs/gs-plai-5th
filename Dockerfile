FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY web ./web
COPY vite.config.js ./
RUN npm run build
FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203
ARG SOURCE_COMMIT=uncommitted
ARG PRD_VERSION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT org.opencontainers.image.version=$PRD_VERSION
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DB_PATH=/data/lab.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
COPY samples ./samples
COPY docs/protocol.md ./docs/protocol.md
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
