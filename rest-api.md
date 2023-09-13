## API

### Keys of staking modules

> :warning: If API returns 425 code, it means database is not ready for work

#### List keys

Path: `/v1/keys`

Endpoint returns list of keys for all modules.

:::warning
Response of this endpoint could be very large. However, due to the possibility of updates occurring during processing, pagination is not supported.
:::

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter keys by operator index;

Request example:

`curl http://localhost:3000/v1/keys`

Response:

```typescript
interface ELBlockSnapshot {
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
}

interface Key {
  index: number;
  key: string;
  depositSignature: string;
  used: boolean;
  operatorIndex: number;
  moduleAddress: string;
}

class Response {
  data: Key[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}
interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}
```

#### Find key with duplicates

Path: `/v1/keys/{pubkey}`

Return key by public key. `pubkey` should be in lowercase.

Param:

- `pubkey` - public key

Request example:

`curl http://localhost:3005/v1/keys/pubkey`

Response:

```typescript
class Response {
  data: Key[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

#### Find keys by list of public keys

Path: `/v1/keys/find`

Returns all keys found in db.

Request body:

```typescript
interface RequestBody {
  // public keys in lowercase
  pubkeys: string[];
}
```

Request example:

`curl -X POST http://localhost:3000/v1/keys/find -H 'Content-Type: application/json' -d '{"pubkeys":["pubkey0 "]}'`

Response:

```typescript
class Response {
  data: Key[];
  meta: {
    elBlockSnapshot: ElBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}
```

### Staking modules

#### List of staking modules

Path: `/v1/modules`

Endpoint returns list of staking modules.

Request example:

`curl http://localhost:3000/v1/modules`

Response:

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

class Reponse {
  data: Module[];
  elBlockSnapshot: ElBlockSnapshot;
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}
```

#### Find staking module

Path: `/v1/modules/{module_id}`

Endpoint returns staking module'd details;

Parameters:

- `module_id` - staking module contact address or id;

Request example:

`curl http://localhost:3000/v1/modules/1`

Response:

```typescript
interface Module {
  nonce: number;
  type: string;
  /// @notice unique id of the module
  id: number;
  /// @notice address of module
  stakingModuleAddress: string;
  /// @notice reward fee of the module
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

class Reponse {
  data: Module;
  elBlockSnapshot: ElBlockSnapshot;
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundResponse implements HttpException {
  statusCode: number = 404;
}
```

### Keys of staking module

#### List keys grouped by modules

Path: `/v1/modules/keys/`

Return keys for all modules grouped by staking router module.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter keys by operator index;

Request example:

`curl http://localhost:3000/v1/modules/keys?used=true&operatorIndex=1`

Response:

```typescript
class Response {
  data: {
    keys: Key[];
    module: Module;
  }[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

#### List keys of staking module

The endpoint returns a list of staking module keys.

Path: `/v1/modules/{module_id}/keys`

Parameters:

- `module_id` - staking module contact address or id;

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter keys by operator index;

Request example:

`curl http://localhost:3000/v1/modules/1/keys?used=true&operatorIndex=1`

Response:

```typescript
class Response {
  data: {
    keys: Key[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

#### Find keys of staking module by list of public keys

Path: `/v1/modules/{module_id}/keys/find`

Returns all keys found in db.

Parameters:

`module_id` - staking module contact address or id;

Request body:

```typescript
interface RequestBody {
  // public keys in lowercase
  pubkeys: string[];
}
```

Request example:

`curl -X POST http://localhost:3000/v1/modules/1/keys/find -d '{"pubkeys": ["pubkey"]}'`

Response:

```typescript
class Response {
  data: {
    keys: Key[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ElBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

### Validators

#### Lists N oldest lido validators

Path: `/v1/modules/{module_id}/validators/validator-exits-to-prepare/{operator_id}`

Parameters:

- `module_id` - staking module contact address or id;
- `operator_id` - operator index;

This endpoint will return N of oldest lido validators for earliest epoch when voluntary exit can be processed for specific node operator and specific `StakingRouter` module. Node operator will use this validators list for preparing pre-sign exit messages. API will find `used` keys of node operator and find for these public keys N oldest validators. We consider active validators (`active_ongoing` status) or validators in `pending_initialized`, `pending_queued` statuses. `block_number` fetched from `EL` should be newer or equal to `slot` fetched from `CL`. Otherwise API will return error on request.

Query:

Only one filter is available. If both parameters are provided, `percent` has a high priority.

- `percent` - Percent of validators to exit. Default value is 10.
- `max_amount` - Number of validators to exit. If validators number less than amount, return all validators.

Request Example:

`curl http://localhost:3000/v1/modules/1/validators/validator-exits-to-prepare/1?percent=10`

Response:

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

class Response {
  data: Validator[];
  meta: {
    clBlockSnapshot: CLBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}

class InternalServerErrorExceptionNotActualData implements HttpException {
  statusCode: number = 500;
  message: string = 'Last Execution Layer block number in our database older than last Consensus Layer';
}

class InternalServerErrorExceptionDisable implements HttpException {
  statusCode: number = 500;
  message: string = 'Validators Registry is disabled. Check environment variables';
}
```

#### Returns unsigned exit messages for N oldest validators

Path: `/v1/modules/{module_id}/validators/generate-unsigned-exit-messages/{operator_id}`

Parameters:

- `module_id` - staking router module contact address or id;

Returns unsigned exit messages for N oldest validators for earliest epoch when voluntary exit can be processed.

Query:

Only one filter is available. If both parameters are provided, `percent` has a high priority.

- `percent` - Percent of validators to exit. Default value is 10.
- `max_amount` - Number of validators to exit. If validators number less than amount, return all validators.

Request example:

`curl http://localhost:3000/v1/modules/1/validators/generate-unsigned-exit-messages/1?percent=10`

Response:

```typescript
interface ExitPresignMessage {
  validator_index: string;
  epoch: string;
}

interface CLBlockSnapshot {
  epoch: number;
  root: string;
  slot: number;
  blockNumber: number;
  timestamp: number;
  blockHash: string;
}

class Response {
  data: ExitPresignMessage[];
  meta: {
    clBlockSnapshot: CLBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}

class InternalServerErrorExceptionNotActualData implements HttpException {
  statusCode: number = 500;
  message: string = 'Last Execution Layer block number in our database older than last Consensus Layer';
}

class InternalServerErrorExceptionDisable implements HttpException {
  statusCode: number = 500;
  message: string = 'Validators Registry is disabled. Check environment variables';
}
```

### Operators

#### List all operators for all staking modules

Path: `/v1/operators`

Returns operators grouped by staking module

Request example:

`curl http://localhost:3000/v1/operators`

Response:

```typescript
interface Operator {
  index: number;
  active: boolean;
  name: string;
  rewardAddress: string;
  stakingLimit: number;
  stoppedValidators: number;
  totalSigningKeys: number;
  usedSigningKeys: number;
  moduleAddress: string;
}

class Response {
  data: {
    operators: Operator[];
    module: Module;
  }[];
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}
```

#### List operators of staking module

Path: `/v1/modules/{module_id}/operators/`

Returns list of staking module operators.

Query:

- `module_id` - staking module contact address or id;

Request example:

`curl http://localhost:3000/v1/modules/1/operators`

Response:

```typescript
class Response {
  data: {
    operators: Operator[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

#### Find staking module operator

Path: `/v1/modules/{module_id}/operators/{operator_id}`

Return staking module operator by operator index.

Query:

- `module_id` - staking module contact address or id;
- `operator_id` - operator index;

Request example:

`curl http://localhost:3005/v1/modules/1/operators/1`

Response:

```typescript
class Response {
  data: {
    operators: Operator;
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

### Staking module operators and keys

#### List staking module operators and keys

Path: `/v1/modules/{module_id}/operators/keys`

Parameters:

- `module_id` - staking module contact address or id;

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - operator index;

Request example:

`curl 'http://localhost:3000/v1/modules/1/operators/1`

Response:

```typescript
class Response {
  data: {
    keys: Key[];
    operators: Operator[];
    module: Module;
  };
  meta: {
    elBlockSnapshot: ELBlockSnapshot;
  };
}

interface HttpException {
  statusCode: number;
  message: string;
}

class TooEarlyResponse implements HttpException {
  statusCode: number = 425;
  message: string = 'Too early response';
}

class NotFoundException implements HttpException {
  statusCode: number = 404;
}
```

### KAPI status

#### Return KAPI status

Path: /v1/status

Request example:

`curl https://keys-api.infra-staging.org/v1/status`

Response:

```typescript
class Response {
  // keys api version
  appVersion: string;
  chainId: number;
  elBlockSnapshot: ELBlockSnapshot;
  clBlockSnapshot: CLBlockSnapshot;
}
```
