FROM node:24.22.1-alpine3.23 AS building

WORKDIR /app

# Manifests before source, so a source change does not bust the dependency layer
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean

COPY ./tsconfig*.json ./
COPY ./src ./src

RUN yarn typechain && yarn build

# Production-only dependency tree for the runtime stage
FROM node:24.22.1-alpine3.23 AS proddeps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production && yarn cache clean

FROM node:24.22.1-alpine3.23

WORKDIR /app

COPY --from=building /app/dist ./dist
COPY --from=proddeps /app/node_modules ./node_modules
COPY ./package.json ./

# npm, yarn and corepack are only needed to install and build in the stages above; in the runtime image they are
# only a CVE surface (npm bundles tar). The app is started with node directly.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack

# Read at startup for the build_info labels. The Harbor workflow passes these as build args; regenerate
# build-info.json from them. Builds without the args keep the file from the checkout. Last, as the commit
# changes on every build and would invalidate the layers after it.
ARG BUILD_VERSION
ARG BUILD_BRANCH
ARG BUILD_COMMIT
COPY build-info.json ./
RUN if [ -n "$BUILD_COMMIT" ]; then \
      printf '{"version":"%s","branch":"%s","commit":"%s"}\n' \
        "$BUILD_VERSION" "$BUILD_BRANCH" "$BUILD_COMMIT" > build-info.json; \
    fi

USER node

# 127.0.0.1, not localhost: BusyBox wget takes ::1 first when /etc/hosts has it, and the app listens on IPv4 only
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD sh -c "wget -nv -t1 --spider http://127.0.0.1:$PORT/health" || exit 1

# node directly instead of `yarn start:prod`: yarn writes its cache at startup, which fails on a read-only root
# filesystem. Same flags as start:prod; benchmarks/ is not copied into the image, so the build output is dist/main.js
CMD ["node", "--max-old-space-size=4096", "dist/main"]
