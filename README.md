## Lido Node Operators Keys Service

Simple Lido keys and validators HTTP API. It will be possible to launch it on someone machine and fetch actual Lido keys from all sources. API also provides http methods for Automating Validator Exits.

## How it works

Service is based on modular architecture. We will have separate library for each type of `Staking Router` module: `Curated`, `Community`, `DVT`. These modules data will be stored in separate tables too. For example, we will have `CuratedKey` and `CommunityKey` tables. API will run cron job to update keys in db for all modules to `latest EL block`. At the moment API support only `NodeOperatorRegistry` contract keys.

## Glossary 

- SR - Staking Router contract

## API

**GET** `/v1/keys`

Endpoint returns list of keys for all modules.

Query:
  - `used` - filter for used/unused keys. Possible values: true/false.
  - `operatorIndex` - filter

```typescript

interface ELBlockSnapshot {
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
}

interface Key {
  key: string;
  depositSignature: string;
  used: boolean;
  operatorIndex: number;
}

interface ModuleKey extends Key {
  moduleAddress: string;
};

interface Response {
  data: ModuleKey[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot
  };
};

```

**GET** `/v1/keys/{pubkey}`

Return key by public key with basic fields. `pubkey` should be in lowercase.

```typescript

interface Response {
  data: ModuleKey[];
  meta: {
      elBlockSnapshot: ELBlockSnapshot
  };
}
```

**POST** `/v1/keys/find`

Returns all keys found in db.

Request body:
```typescript
interface RequestBody {
  // public keys in lowercase
  pubkeys: string[];
}
```

```typescript
interface Response {
  data: ModuleKey[];
  meta: {
      elBlockSnapshot: ElBlockSnapshot
  };
}
```

**GET** `/v1/modules`

Endpoint returns list of staking router modules.

```typescript

interface Module {
    nonce: number;
    type: string;
    // unique id of the module
    id: number;
    // address of module
    stakingModuleAddress: string;
    // rewarf fee of the module
    moduleFee: number;
    // treasury fee
    treasuryFee: number;
    // target percent of total keys in protocol, in BP
    targetShare: number;
    // module status if module can not accept the deposits or can participate in further reward distribution
    status: number;
    // name of module
    name: string;
    // block.timestamp of the last deposit of the module
    lastDepositAt: number;
    // block.number of the last deposit of the module
    lastDepositBlock: number;
}

interface Reponse {
  data: Module[];
  elBlockSnapshot: ElBlockSnapshot;
}
```

**GET** `/v1/modules/{module_id}`

`module_id` - staking router module contact address or id;

Endpoint return information about staking router module;

```typescript

interface Reponse {
  data: Module;
  elBlockSnapshot: ElBlockSnapshot;
}
```

**GET** `/v1/modules/keys/`

Return keys for all modules grouped by staking router module.

- `used` - filter for used/unused keys. Possible values: true/false.
- `operatorIndex` - filter

```typescript
interface Response{
  data: {
      keys: Key[],
      module: Module
  }[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot
  };
}
```

**GET** `/v1/modules/{module_id}/keys`

`module_id` - staking router module contact address or id;

Endpoint returns list of keys for module.

Query:
  - used - filter for used/unused keys. Possible values: true/false.
  - operatorIndex - filter

Response:

Response depends on `module type`

```typescript

interface Key {
  key: string;
  depositSignature: string;
  used: boolean;
  operatorIndex: number;
}

interface RegistryKey extends Key {    
}

interface CommunityKey extends Key {    
}

interface Response {
  data: {
      keys: RegistryKey[] | CommunityKey[],
      module: Module,
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot
  };
}

```

 **GET** `/v1/modules/{module_id}/keys`

`module_id` - staking router module contact address or id;

Endpoint returns list of keys for module.

Query:
  - used - filter for used/unused keys. Possible values: true/false.
  - operatorIndex - filter

Response:

Response depends on `module type`

```typescript
interface Key {
  key: string;
  depositSignature: string;
  used: boolean;
  operatorIndex: number;
}

interface RegistryKey extends Key { 
  index: number;
}

interface CommunityKey extends Key {    
}

interface Response {
  data: {
      keys: RegistryKey[] | CommunityKey[],
      module: Module,
  },
  meta: {
    elBlockSnapshot: ELBlockSnapshot
  }
}

```

**POST** `/v1/modules/{module_id}/keys/find`

`module_id` - staking router module contact address or id;

Returns all keys found in db.

Request body:
```typescript

interface RequestBody {
  // public keys in lowercase
  pubkeys: string[];
}
```

Response:

```typescript

interface Key {
  key: string;
  depositSignature: string;
  used: boolean;
  operatorIndex: number;
}

interface RegistryKey extends Key {
  index: number; 
}

interface CommunityKey extends Key {    
}

interface Response {
  data: {
      keys: RegistryKey[] | CommunityKey[],
      module: Module,
  },
  meta: {
    elBlockSnapshot: ElBlockSnapshot
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
