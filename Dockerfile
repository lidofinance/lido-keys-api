FROM node:20.20-alpine3.23 AS building

WORKDIR /app

# Manifests before source, so a source change does not bust the dependency layer
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean

COPY ./tsconfig*.json ./
COPY ./src ./src

RUN yarn typechain && yarn build

# Production-only dependency tree for the runtime stage
FROM node:20.20-alpine3.23 AS proddeps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production && yarn cache clean

FROM node:20.20-alpine3.23

WORKDIR /app

COPY --from=building /app/dist ./dist
COPY --from=proddeps /app/node_modules ./node_modules
COPY ./package.json ./

# Rewritten by the shared build pipeline in the checkout; read at startup for build_info labels
COPY build-info.json ./

USER node

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD sh -c "wget -nv -t1 --spider http://localhost:$PORT/health" || exit 1

CMD ["yarn", "start:prod"]
