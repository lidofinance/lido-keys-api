// information that shows data relevance
interface BlockMetadata {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
}

// information from staking router module
interface ModuleMetadata {
  // address of module
  stakingModuleAddress: string;
  // module type
  type: string;
  // unique id of the module
  moduleId: number;
  // will be renamed as a nonce
  keysOpIndex: number;
  // reward fee of the module
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

interface Metadata {
  blockMetadata: BlockMetadata;
  moduleMetadata: ModuleMetadata;
}

interface Key {
  index: number;
  used: boolean;
  operatorIndex: number;
  depositSignature: string;
  key: string;
}

interface Operator {
  index: number;
  active: boolean;
  name: string;
  rewardAddress: string;
  stakingLimit: number;
  stoppedValidators: number;
  totalSigningKeys: number;
  usedSigningKeys: number;
}

interface Data<Op extends Operator = Operator, PKey extends Key = Key> {
  keys: PKey[];
  operators: Op[];
  meta: Metadata;
}
