## API

### /keys

**GET** `/v1/keys`

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/keys'
```

:::warning
Response of this endpoint could be very large but we can’t have a pagination here since data could be updated in the process.
:::

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/keys/{pubkey}`

Return key by public key with basic fields. `pubkey` should be in lowercase.

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

Example:

```
curl -X 'GET' 'http://localhost:3005/v1/keys/pubkey'
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

Example:

```
curl -X 'POST' 'http://localhost:3000/v1/keys/find' \
  -H 'Content-Type: application/json' \
  -d '{"pubkeys": ["pubkey0 "]}'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

### /modules

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/modules'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}`

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/modules/1'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

### /modules/keys/

**GET** `/v1/modules/keys/`

Return keys for all modules grouped by staking router module.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/modules/keys?used=true&operatorIndex=1'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}/keys`

`module_id` - staking router module contact address or id;

Endpoint returns list of keys for module.

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

Response:

Response depends on `module type`

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

Example:

```
curl -X 'GET' \
  'http://localhost:3000/v1/modules/1/keys?used=true&operatorIndex=1' \
  -H 'accept: application/json'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

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

Example:

```
curl -X 'POST' \
  'http://localhost:3000/v1/modules/1/keys/find' \
  -H 'Content-Type: application/json' \
  -d '{
  "pubkeys": [
    "pubkey"
  ]
}'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

### /validators

**GET** `/v1/modules/{module_id}/validators/validator-exits-to-prepare/{operator_id}`

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/modules/1/validators/validator-exits-to-prepare/1?percent=10'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}/validators/generate-unsigned-exit-messages/{operator_id}`

`module_id` - staking router module contact address or id;

Return unsigned exit messages for N oldest validators for earliest epoch when voluntary exit can be processed.

Query:

Only one filter is available. If both parameters are provided, `percent` has a high priority.

- `percent` - Percent of validators to exit. Default value is 10.
- `max_amount` - Number of validators to exit. If validators number less than amount, return all validators.

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

Example:

```
curl -X 'GET' \
  'http://localhost:3000/v1/modules/1/validators/generate-unsigned-exit-messages/1?percent=10' \
  -H 'accept: application/json'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

### /operators

**GET** `/v1/operators`

List of operators grouped by staking router module

Query

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/operators'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}/operators/`

`module_id` - staking router module contact address or id;

List of SR module operators

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

Example:

```
curl -X 'GET' 'http://localhost:3000/v1/modules/1/operators'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}/operators/{operator_id}`

`module_id` - staking router module contact address or id;
`operator_id` - operator index;

List of SR module operators

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

Example:

```
curl -X 'GET' 'http://localhost:3005/v1/modules/1/operators/1'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

**GET** `/v1/modules/{module_id}/operators/keys`

`module_id` - staking router module contact address or id;

Query:

- `used` - filter for used/unused keys. Possible values: true/false;
- `operatorIndex` - filter for keys of operator with index `operatorIndex`;

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

Example:

```
curl -X 'GET' 'http://localhost:3005/v1/modules/1/operators/1' -H 'accept: application/json'
```

:::warning
If API returns 425 code, it means database is not ready for work
:::

### /status

**GET** /v1/status

```typescript
class Response {
  // keys api version
  appVersion: string;
  chainId: number;
  elBlockSnapshot: ELBlockSnapshot;
  clBlockSnapshot: CLBlockSnapshot;
}
```
