## Lido Node Operators Keys Service

Service that provides API that allows you to work with Lido keys from different sources.

> 🚧 CI and deploy
>
> After creating repo from the template make sure that you have correctly filled TARGET_WORKFLOW field in:
>
> - .github/workflows/ci-dev.yml
> - .github/workflows/ci-staging.yml
> - .github/workflows/ci-prod.yml

## Installation

```bash
$ yarn install
```

## Usage

## Running the app

````bash
# development
$ yarn start:dev

## Test

```bash
# unit tests
$ yarn test
````

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
