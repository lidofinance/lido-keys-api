## Lido Node Operators Keys Service

Simple Lido keys and validators HTTP API.

## Glossary

- SR - Staking Router contract

## API

You can familiarize yourself with the REST API by accessing it [here](rest-api.md).

## Requirements

1. 2 core CPU
2. 5 GB RAM
   - Keys-API-DB — 500MB
   - Keys-API — 4GB
3. EL Full node
4. CL node for applications like Ejector that use [validators API](https://hackmd.io/fv8btyNTTOGLZI6LqYyYIg?view#validators). KAPI currently doesn't work with Nimbus client. If you use Teku client, please use archive mode.

## Installation

1. `$ yarn install`
2. `$ yarn typechain`

## Running

`$ yarn start:dev`

For running locally in container run

1. `docker-compose -f docker-compose.yml build`
2. `docker-compose -f docker-compose.yml up`

For running KAPI, one can also use the image from this page https://docs.lido.fi/guides/tooling#keys-api. Please always use the SHA256 hash of the Docker image for the latest release: lidofinance/lido-keys-api@<latest-hash>.

## Metrics and alerts

To launch Prometheus, Grafana, and Alertmanager, execute the following command:

```
docker-compose -f docker-compose.metrics.yml up
```

For configuring Grafana, navigate to http://localhost:8000/dashboards. Here, you can import dashboards from the ./grafana folder.

To view the list of alerts in Prometheus, visit http://localhost:9090/alerts. For checking the list of fired alerts in Alertmanager, go to http://localhost:9093/#/alerts.

## Update CSM module ABI

Execute the command in the CSM module repository

```sh
forge build --force
```
Copy CSModule.json

```sh
cp community-staking-module/out/CSModule.sol/CSModule.json ./artifacts/CSMModule.json
```

Execute the ABI preparation command

```sh
yarn prepare:csm
```

## E2E tests

`$ yarn test:e2e:docker`

## Environment variable

Check `sample.env` file.

Pay attention that API by default running job for fetching and updating Validators. If you are not planning to use `validators` endpoints, you could disable this job by setting `VALIDATOR_REGISTRY_ENABLE=false`.

## Run KAPI on fork

For running KAPI on fork setup environment variables:

```
CHAIN_ID=1
CHRONIX_PROVIDER_MAINNET_URL=YOUR-MAINNET-PROVIDER
CHRONIX_SESSION_PORT=8002
PROVIDERS_URLS = http://127.0.0.1:8002
```

1. Run chronix `yarn chronix:start`
2. Init chronix: `yarn fork:init`
3. Start kapi: yarn start:dev

Keep in mind `PROVIDERS_URLS` should contain chronix session url.

## Benchmarks

This part of document outlines running benchmarks and collecting Prometheus metrics using K6.

At first install [k6](https://k6.io/docs/get-started/installation/).

Run `yarn build`.
Run KAPI `yarn start:dev`.

Running Benchmarks: Execute this command to run benchmarks and save results in benchmarks/output.json:

```bash
k6 run -e PORT=<KAPI-PORT> --out json=benchmarks/output.json --tag testid=<UNIQUE-ID> dist/benchmarks/<TEST-NAME>.script.js
```

Replace <UNIQUE-ID> with your unique test identifier.

Collecting Prometheus Metrics: For collecting benchmarks' Prometheus metrics, set the Prometheus server URL:

```bash
export K6_PROMETHEUS_RW_SERVER_URL=http://<PROMETHEUS-SERVER-URL>/api/v1/write
```

Replace <PROMETHEUS-SERVER-URL> with your Prometheus server's address. Then, execute benchmarks and collect Prometheus metrics:

```bash
k6 run -e PORT=<KAPI-PORT> --out json=benchmarks/output.json -o experimental-prometheus-rw --tag testid=<UNIQUE-ID> dist/benchmarks/<TEST-NAME>.script.js
```

Once again, use <UNIQUE-ID> to differentiate your test run in the results.

## Release flow

To create a new release:

1. Merge all changes to the `main` branch.
1. After the merge, the `Prepare release draft` action will run automatically. When the action is complete, a release draft is created.
1. When you need to release, go to Repo → Releases.
1. Publish the desired release draft manually by clicking the edit button - this release is now the `Latest Published`.
1. After publication, the action to create a release bump will be triggered automatically.

## License

API Template is [MIT licensed](LICENSE).
