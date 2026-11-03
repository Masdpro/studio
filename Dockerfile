# syntax=docker/dockerfile:1
# Closebuy production image for Fly.io. Build and deploy with: fly deploy

FROM node:22-bookworm-slim AS build
# better-sqlite3 compiles a small native module during install.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
# Newer npm versions can skip install scripts; make sure the SQLite driver is actually built.
RUN node -e "require('better-sqlite3')(':memory:')" 2>/dev/null \
 || (cd node_modules/better-sqlite3 && npm run install) \
 && node -e "require('better-sqlite3')(':memory:'); console.log('better-sqlite3 ok')"
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build against an empty throwaway database so nothing from a developer's machine ends up in the image.
RUN DATABASE_URL=/tmp/build.db node scripts/migrate.mjs && DATABASE_URL=/tmp/build.db npm run build && rm -f /tmp/build.db*

FROM node:22-bookworm-slim AS run
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl sqlite3 && rm -rf /var/lib/apt/lists/*

# Litestream (database backups), downloaded from the official release and checked against its published checksums.
ARG LITESTREAM_VERSION=0.5.17
RUN cd /tmp \
 && curl -fsSLO "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-x86_64.tar.gz" \
 && curl -fsSLO "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/checksums.txt" \
 && sha256sum --ignore-missing -c checksums.txt \
 && mkdir -p /tmp/ls && tar -xzf "litestream-${LITESTREAM_VERSION}-linux-x86_64.tar.gz" -C /tmp/ls \
 && install -m 0755 "$(find /tmp/ls -type f -name litestream | head -n1)" /usr/local/bin/litestream \
 && rm -rf /tmp/ls /tmp/litestream-* /tmp/checksums.txt \
 && litestream version

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# The full app including dev tools, so `npm run create-admin` etc. work over `fly ssh console`.
COPY --from=build /app ./
COPY litestream.yml /etc/litestream.yml
EXPOSE 3000
CMD ["/app/scripts/docker-entrypoint.sh"]
