# Docker Hardened Images: a pull needs `docker login dhi.io`. Only the -dev stages have a shell.
FROM dhi.io/node:24.22.1-debian13-dev@sha256:0fbf99f9c6874344b8c9a2bc80ea63c9f0058f01814f1ea23bf7ddad1b130a95 AS building

WORKDIR /app

# Manifests before source, so a source change does not bust the dependency layer
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean

COPY ./tsconfig*.json ./
COPY ./src ./src

RUN yarn typechain && yarn build

# Production-only dependency tree for the runtime stage
FROM dhi.io/node:24.22.1-debian13-dev@sha256:0fbf99f9c6874344b8c9a2bc80ea63c9f0058f01814f1ea23bf7ddad1b130a95 AS proddeps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production && yarn cache clean

# Read at startup for the build_info labels. The Harbor workflow passes these as build args; regenerate
# build-info.json from them. Builds without the args keep the file from the checkout. A separate stage, as the
# runtime image has no shell and the commit changes on every build.
FROM dhi.io/node:24.22.1-debian13-dev@sha256:0fbf99f9c6874344b8c9a2bc80ea63c9f0058f01814f1ea23bf7ddad1b130a95 AS buildinfo

WORKDIR /app

COPY build-info.json ./
COPY docker/write-build-info.js ./docker/

ARG BUILD_VERSION
ARG BUILD_BRANCH
ARG BUILD_COMMIT
RUN if [ -n "$BUILD_COMMIT" ]; then \
      node docker/write-build-info.js "$BUILD_VERSION" "$BUILD_BRANCH" "$BUILD_COMMIT"; \
    fi

FROM dhi.io/node:24.22.1-debian13@sha256:71356ce43d68bcffe928007fd22557f316ceb0ccd28f5e48fd89f2e98c9daa0c

WORKDIR /app

COPY --from=building /app/dist ./dist
COPY --from=proddeps /app/node_modules ./node_modules
COPY ./package.json ./
COPY docker/healthcheck.js ./docker/
# Last, as it changes on every build and would invalidate the layers after it
COPY --from=buildinfo /app/build-info.json ./

# The node user of the base image, by number so that a runAsNonRoot check can verify it without runAsUser
USER 1000:1000

HEALTHCHECK --interval=60s --timeout=10s --retries=3 CMD ["node", "docker/healthcheck.js"]

# node directly instead of `yarn start:prod`: yarn writes its cache at startup, which fails on a read-only root
# filesystem. Same flags as start:prod; benchmarks/ is not copied into the image, so the build output is dist/main.js
CMD ["node", "--max-old-space-size=4096", "dist/main"]
