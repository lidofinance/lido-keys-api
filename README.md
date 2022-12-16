## Lido Node Operators Keys Service

Simple Lido keys and validators API. It will be possible to launch it on someone machine and fetch actual Lido keys from all sources. API also provides http methods for Automating Validator Exits.

## How it works

Service is based on modular architecture. We will have separate library for each type of `Staking Router` module: `Curated`, `Community`, `DVT`. These modules data will be stored in separate tables too. For example, we will have `CuratedKey` and `CommunityKey` tables. API will run cron job to update keys in db for all modules to `latest EL block`. At the moment API support only `NodeOperatorRegistry` contract keys.

## API

**GET** `/v1/keys`

Endpoint returns list of keys for all modules.

Query:
  - fields - add fields to response. Possible values: depositSignature

Response:
```json
{
  "data": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "key": "string",
        "depositSignature": "string"
      },
      "required": ["key"]
    }
  },
  "meta": {
    "type": "object",
    "properties": {
      "blockNumber": "number",
      "blockHash": "string"
    },
    "required": ["blockNumber", "blockHash"]
  }
}
```

**POST** `/v1/keys/find`

Returns all keys found in db.

Request body:
```json
{
  "pubkeys": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "example": ["0x.", "0x."]
  }
}
```

Query:
  
  - fields - add fields to response. Possible values: depositSignature

Response:
```json
{
  "data": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "key": "string",
        "depositSignature": "string"
      },
      "required": ["key"]
    }
  },
  "meta": {
    "type": "object",
    "properties": {
      "blockNumber": "number",
      "blockHash": "string"
    },
    "required": ["blockNumber", "blockHash"]
  }
}
```

**GET** `/v1/modules`

Endpoint returns list of modules.

```json
{
  "data": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "address": "string",
        "type": {
          "type": "string",
          "enum": ["Curated", "Community", "DVT"]
        },
        "description": "string"
      },
      "required": ["address", "type", "description"]
    }
  }
}

```

**GET** `/v1/keys/{module_address}`

Endpoint returns list of keys for module.
`module_address` - contract address

Query:
  - fields - add fields to response. Possible values depend on `module_address`. For Curated module: depositSignature, operatorIndex, used, index.
  - used - filter for used/unused keys. Possible values: true/false 

Response:

Response depends on `module type`

```json
{
  "data": {
    "type": "array",
    "items": {
      "oneOf": [{
        "type": "object",
        "properties": {
          "key": "string",
          "depositSignature": "string",
          "used": "boolean",
          "operatorIndex": "number",
          "index": "number"
        },
        "required": ["key"]
      }]
    }
  },
  "meta": {
    "type": "object",
    "properties": {
      "moduleAddress": "string",
      "blockNumber": "number",
      "blockHash": "string",
      "keyOpIndex": "number",
      "timestamp": "number"
    }
  }
}
```

**POST** `/v1/keys/{module_address}/find`

Returns all keys found in db.

Request body:
```json
{
  "pubkeys": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "example": ["0x.", "0x."]
  }
}
```

Query:
  
  - fields - add fields to response. Possible values depend on `module_address`. For Curated module: depositSignature, operatorIndex, used, index.

Response:
```json
{
  "data": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "key": "string",
        "depositSignature": "string",
        "used": "boolean",
        "operatorIndex": "number",
        "index": "number"
      },
      "required": ["key"]
    }
  },
  "meta": {
    "type": "object",
    "properties": {
      "moduleAddress": "string",
      "blockNumber": "number",
      "blockHash": "string",
      "keyOpIndex": "number",
      "timestamp": "number"
    },
    "required": ["blockNumber", "blockHash"]
  }
}
```

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
