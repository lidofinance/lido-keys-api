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

`$ yarn install`

## Running

`$ yarn start:dev`

For running locally in container run

1. `docker-compose -f docker-compose.yml build`
2. `docker-compose -f docker-compose.yml up`
3. `docker-compose -f docker-compose.metrics.yml up`

To configure grafana go to `http://localhost:8000/dashboards` and dashboards from `./grafana` folder.

For running KAPI, one can also use the image from this page https://docs.lido.fi/guides/tooling#keys-api. Please always use the SHA256 hash of the Docker image for the latest release: lidofinance/lido-keys-api@<latest-hash>.

## E2E tests

`$ yarn test:e2e`

## Environment variable

Check `sample.env` file.

Pay attention that API by default running job for fetching and updating Validators. If you are not planning to use `validators` endpoints, you could disable this job by setting `VALIDATOR_REGISTRY_ENABLE=false`.

## Release flow

To create new release:

1. Merge all changes to the `main` branch
1. Navigate to Repo => Actions
1. Run action "Prepare release" action against `main` branch
1. When action execution is finished, navigate to Repo => Pull requests
1. Find pull request named "chore(release): X.X.X" review and merge it with "Rebase and merge" (or "Squash and merge")
1. After merge release action will be triggered automatically
1. Navigate to Repo => Actions and see last actions logs for further details

## License

API Template is [MIT licensed](LICENSE).
