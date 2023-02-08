## Lido Node Operators Keys Service

Simple Lido keys and validators HTTP API. It will be possible to launch it on someone machine and fetch actual Lido keys from all sources. API also provides http methods for Automating Validator Exits.

## How it works

Service is based on modular architecture. We will have separate library for each type of `Staking Router` module: `Curated`, `Community`, `DVT`. These modules data will be stored in separate tables too. For example, we will have `CuratedKey` and `CommunityKey` tables. API will run cron job to update keys in db for all modules to `latest EL block`. At the moment API support only `NodeOperatorRegistry` contract keys.

## Glossary

- SR - Staking Router contract

## API

### /keys

**GET** `/api/v1/keys`

Endpoint returns list of keys for all modules.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

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
}

interface Response {
  data: ModuleKey[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

:::warning
Response of this endpoint could be very large but we can’t have a pagination here since data could be updated in the process.
:::

**GET** `/api/v1/keys/{pubkey}`

Return key by public key with basic fields. `pubkey` should be in lowercase.

```typescript
interface Response {
  data: ModuleKey[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**POST** `/api/v1/keys/find`

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
interface Response {
  data: ModuleKey[];
  meta: {
    elBlockSnapshot: ElBlockSnapshot;
  };
}
```

### /modules

**GET** `/api/v1/modules`

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

interface ELBlockSnapshot {
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
}

interface Reponse {
  data: Module[];
  elBlockSnapshot: ElBlockSnapshot;
}
```

**GET** `/api/v1/modules/{module_id}`

`module_id` - staking router module contact address or id;

Endpoint return information about staking router module;

```typescript
interface Module {
  nonce: number;
  type: string;
  /// @notice unique id of the module
  id: number;
  /// @notice address of module
  stakingModuleAddress: string;
  /// @notice rewarf fee of the module
  moduleFee: number;
  /// @notice treasury fee
  treasuryFee: number;
  /// @notice target percent of total keys in protocol, in BP
  targetShare: number;
  /// @notice module status if module can not accept the deposits or can participate in further reward distribution
  status: number;
  /// @notice name of module
  name: string;
  /// @notice block.timestamp of the last deposit of the module
  lastDepositAt: number;
  /// @notice block.number of the last deposit of the module
  lastDepositBlock: number;
}

interface ELBlockSnapshot {
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
}

interface Reponse {
  data: Module;
  elBlockSnapshot: ElBlockSnapshot;
}
```

### /modules/keys/

**GET** `/api/v1/modules/keys/`

Return keys for all modules grouped by staking router module.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

```typescript
interface Module {
  // current KeyOpIndex
  nonce: number;
  // type of module
  type: string;
  /// @notice unique id of the module
  id: number;
  /// @notice address of module
  stakingModuleAddress: string;
  /// @notice rewarf fee of the module
  moduleFee: number;
  /// @notice treasury fee
  treasuryFee: number;
  /// @notice target percent of total keys in protocol, in BP
  targetShare: number;
  /// @notice module status if module can not accept the deposits or can participate in further reward distribution
  status: number;
  /// @notice name of module
  name: string;
  /// @notice block.timestamp of the last deposit of the module
  lastDepositAt: number;
  /// @notice block.number of the last deposit of the module
  lastDepositBlock: number;
}

interface Response {
  data: {
    keys: Key[];
    module: Module;
  }[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**GET** `/api/v1/modules/{module_id}/keys`

`module_id` - staking router module contact address or id;

Endpoint returns list of keys for module.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

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

interface CommunityKey extends Key {}

interface Response {
  data: {
    keys: RegistryKey[] | CommunityKey[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**POST** `/api/v1/modules/{module_id}/keys/find`

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

interface CommunityKey extends Key {}

interface Response {
  data: {
    keys: RegistryKey[] | CommunityKey[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ElBlockSnapshot;
  };
}
```

### /validators

**GET** `/api/v1/modules/{module_id}/validators/exits_presign/{operator_id}`

`module_id` - staking router module contact address or id;

This endpoint will return N of oldest lido validators for earliest epoch when voluntary exit can be processed for specific node operator and specific `StakingRouter` module. Node operator will use this validators list for preparing pre-sign exit messages. API will find `used` keys of node operator and find for these public keys N oldest validators in `Validator` table. We consider active validators (`active_ongoing` status) or validators in `pending_initialized`, `pending_queued` statuses. Module tables state fetched from `EL` should be newer than `Validator` table state fetched from `CL`. Otherwise API will return error on request.

Query:

Only one filter is available. If both parameters are provided, `percent` has a high priority.

- `percent` - Percent of validators to exit. Default value is 10.
- `max_amount` - Number of validators to exit. If validators number less than amount, return all validators.

```typescript
interface Validator {
  validatorIndex: number;
  key: string;
}

interface CLBlockSnapshot {
  epoch: number;
  root: number;
  slot: number;
  blockNumber: number;
  timestamp: number;
  blockHash: string;
}

interface Response {
  data: Validator[];
  meta: {
    clBlockSnapshot: CLBlockSnapshot;
  };
}
```

**GET** `/api/v1/modules/{module_id}/validators/exits_presign/{operator_id}/messages`

`module_id` - staking router module contact address or id;

Generate pre-sign messages for N oldest validators for earliest epoch when voluntary exit can be processed.

Query:

Only one filter is available. If both parameters are provided, `percent` has a high priority.

- `percent` - Percent of validators to exit. Default value is 10.
- `max_amount` - Number of validators to exit. If validators number less than amount, return all validators.

```typescript
interface ExitPresignMessage {
  validatorIndex: number;
  epoch: number;
}

interface CLBlockSnapshot {
  epoch: number;
  root: string;
  slot: number;
  blockNumber: number;
  timestamp: number;
  blockHash: string;
}

interface Response {
  data: ExitPresignMessage[];
  meta: {
    clBlockSnapshot: CLBlockSnapshot;
  };
}
```

### /operators

**GET** `/api/v1/operators`

List of operators grouped by staking router module

Query

```typescript
interface Operator {
  index: number;
  active: boolean;
}

interface CuratedOperator extends Operator {
  name: string;
  rewardAddress: string;
  stakingLimit: number;
  stoppedValidators: number;
  totalSigningKeys: number;
  usedSigningKeys: number;
}

interface CommunityOperator extends Operator {}

interface Response {
  data: {
    operators: CuratedOperator[] | CommunityOperator[];
    module: Module;
  }[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**GET** `/api/v1/modules/{module_id}/operators/`

`module_id` - staking router module contact address or id;

List of SR module operators

```typescript
interface Response {
  data: {
    operators: CuratedOperator[] | CommunityOperator[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**GET** `/api/v1/modules/{module_id}/operators/{operator_index}`

`module_id` - staking router module contact address or id;
`operator_index` - operator index;

List of SR module operators

```typescript
interface Response {
  data: {
    operators: CuratedOperator | CommunityOperator;
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

**GET** `/api/v1/modules/{module_id}/operators/keys`

`module_id` - staking router module contact address or id;

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

```typescript
interface Response {
  data: {
    keys: RegistryKey[] | CommunityKey[];
    operators: CuratedOperator[] | CommunityOperator[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
```

### /status

**GET** /api/v1/status

```typescript
interface Response {
  // keys api version
  appVersion: string;
  chainId: number;
  elBlockSnapshot: ELBlockSnapshot;
  clBlockSnapshot: CLBlockSnapshot;
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
