import { ConsensusMeta, Validator, ValidatorStatus } from '@lido-nestjs/validators-registry';
import { CLBlockSnapshot } from './common/entities';

export const header = {
  execution_optimistic: false,
  data: {
    root: '0xe38dd3eba0199ae8a22407a2c485fd00ce0c5522d8c7da0cc491caea732807f4',
    canonical: true,
    header: {
      message: {
        slot: '4774624',
        proposer_index: '130400',
        parent_root: '0x6998730c2a5fe8dc03e60e9ffff0f554d5f14d43384dfa9697107bb513765660',
        state_root: '0xb841bbb0ebc4b078d5efde852ff95c7253c2843e9f5364187aa14c782de13231',
        body_root: '0x2cb6e3df1fd314899a06822238939b0faca3c29659a50c9c8fddcdd71691356f',
      },
      signature:
        '0xb4d8b266a7c6bf3cc1efebe6fa85dea914428928e7414f29db6f17b71925a1bbb7213410160717d199b9c287aba64fe4102804f28bfa0c313b1dcf7e687dacde8e7fa70482d8e05f2d4f981bc71b52aff72ade601e107a0fd89db7a0dcbe3c06',
    },
  },
};

export const slot = header.data.header.message.slot;

export const block = {
  version: 'bellatrix',
  execution_optimistic: false,
  data: {
    message: {
      slot: '4774624',
      proposer_index: '130400',
      parent_root: '0x6998730c2a5fe8dc03e60e9ffff0f554d5f14d43384dfa9697107bb513765660',
      state_root: '0xb841bbb0ebc4b078d5efde852ff95c7253c2843e9f5364187aa14c782de13231',
      body: {
        randao_reveal:
          '0x979d121e562f2e5a91a8b4c3fa09c3100b082a846921504b2e161cb329789deb57e7064ed4c52c903ba08621a32c1e0303839b901fac75cef7ff5eaec5226f0c8d98c8de9fb3ee2860593dd9ea4e9b7171bd3d7cce9bb53891528c8abf84a293',
        eth1_data: {
          deposit_root: '0xd4e95fd34dec8960ce6973c762ebf1f80a6577310d98a8004307302f5f4dbf5e',
          deposit_count: '195216',
          block_hash: '0xf7a79965a9caf9a89d6b36a349ec599df48bb3d75dba6a51f8c7015fe1bab2c6',
        },
        graffiti: '0x74656b752f7632322e31322e302b3132372d6733616339323536000000000000',
        proposer_slashings: [],
        attester_slashings: [],
        attestations: [
          /* fake empty */
        ],
        deposits: [],
        voluntary_exits: [],
        sync_aggregate: {
          sync_committee_bits:
            '0xfcdfffdffdfdffbf3ff99fefe5fb95b3fffff7f71e77bf3ff7bf1fd8fdffbf7dffe7ffbfff9acef7ed9ffbbffbf7fdf7faf0bffedfedffbd3ffa3f947ffbd7ff',
          sync_committee_signature:
            '0xa7d49f496e1c8db9bd3292a55e1451175a3cd4adc6f1246b015427fcffbd4eecaf0eead1e96bfa7842bdf662e5082dc31099fedbb21f00f674e9beda8fa08d26826c28121b212a06f33d1d328faff8d95c068fad52078e0e858931205a9e45b9',
        },
        execution_payload: {
          parent_hash: '0x1447e721f3f56cc65899023f67876e86560bf172a3d9913b358f76a3bdd66f41',
          fee_recipient: '0x000095e79eac4d76aab57cb2c1f091d553b36ca0',
          state_root: '0xabc57973b76308d7843ab9dc29967a5c2308034ceb093a1fbc72a86522785da2',
          receipts_root: '0xd1dabf348b90517787732552669d290328a593a7e1bac5a5f648995498bc7fd3',
          logs_bloom:
            '0x040400f11440100000401040001118200200424000000812008b000018890513200000090200421010020030a800200080009424640281488822c2a4042004002240a20c847800c908400028090c90000002800802d2014102012000c002008000441010020210c00100069000000a140d000240206040200022081004080080288080040406680201081001a00801200820158428108000900120021c2000440a090400420002106000293400020040800104002004002020210088802029004922d00240048940142000000803240002210049020200020111090c09002062b09b8002000008300828006b00000027424800d000a84544004a000000801304',
          prev_randao: '0x2409abe67204d5fb2e241c134dd1488f87f2f0d6fb690b8efb6c8248c389f998',
          block_number: '8316773',
          gas_limit: '30000000',
          gas_used: '7972101',
          timestamp: '1673803488',
          extra_data: '0x',
          base_fee_per_gas: '3778',
          block_hash: '0x769ff0798b912b17b5b7ecb32c6110df055c85f2b3e6ae3260c93d7e15cfd2c3',
          transactions: [
            /* fake empty */
          ],
        },
      },
    },
    signature:
      '0xb4d8b266a7c6bf3cc1efebe6fa85dea914428928e7414f29db6f17b71925a1bbb7213410160717d199b9c287aba64fe4102804f28bfa0c313b1dcf7e687dacde8e7fa70482d8e05f2d4f981bc71b52aff72ade601e107a0fd89db7a0dcbe3c06',
  },
};

const epoch = Math.floor(Number(block.data.message.slot) / 32);

export const consensusMetaResp: CLBlockSnapshot = {
  epoch,
  slot: Number(block.data.message.slot),
  root: block.data.message.state_root,
  timestamp: Number(block.data.message.body.execution_payload.timestamp),
  blockNumber: Number(block.data.message.body.execution_payload.block_number),
  blockHash: block.data.message.body.execution_payload.block_hash,
};

export const dvtOpOneReadyForExitValidators = [
  {
    index: '1',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '5',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xb3b9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '6',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xc3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '7',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xd3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '8',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xe3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '9',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xf3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '10',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xa5e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '11',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xb6e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '12',
    balance: '34006594880',
    status: 'pending_queued',
    validator: {
      pubkey: '0xc7e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '13',
    balance: '34006594880',
    status: 'pending_initialized',
    validator: {
      pubkey: '0xd8e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '14',
    balance: '34006594880',
    status: 'exited_unslashed',
    validator: {
      pubkey: '0xe9e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
];

export const curatedOpOneReadyForExitValidators = [
  {
    index: '3',
    balance: '34006594880',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xa554bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
  {
    index: '4',
    balance: '34006594880',
    status: 'exited_unslashed',
    validator: {
      pubkey: '0xb3a9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
      withdrawal_credentials: '0x00fc40352b0a186d83267fc1342ec5da49dbb78e1099a4bd8db16d2c0d223594',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '0',
      activation_epoch: '0',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
  },
];

export const dvtOpOneResp10percent = [
  {
    validatorIndex: 1,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  },
];

export const dvtOpOneRespExitMessages10percent = [
  {
    validator_index: '1',
    epoch: String(epoch),
  },
];

export const dvtOpOneResp20percent = [
  {
    validatorIndex: 1,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  },
  {
    validatorIndex: 5,
    key: '0xb3b9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
];

export const dvtOpOneRespExitMessages20percent = [
  {
    validator_index: '1',
    epoch: String(epoch),
  },
  {
    validator_index: '5',
    epoch: String(epoch),
  },
];

export const dvtOpOneResp5maxAmount = [
  {
    validatorIndex: 1,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  },
  {
    validatorIndex: 5,
    key: '0xb3b9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 6,
    key: '0xc3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 7,
    key: '0xd3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 8,
    key: '0xe3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
];

export const dvtOpOneRespExitMessages5maxAmount = [
  {
    validator_index: '1',
    epoch: String(epoch),
  },
  {
    validator_index: '5',
    epoch: String(epoch),
  },
  {
    validator_index: '6',
    epoch: String(epoch),
  },
  {
    validator_index: '7',
    epoch: String(epoch),
  },
  {
    validator_index: '8',
    epoch: String(epoch),
  },
];

export const dvtOpOneResp100percent = [
  {
    validatorIndex: 1,
    key: '0xa544bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  },
  {
    validatorIndex: 5,
    key: '0xb3b9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 6,
    key: '0xc3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 7,
    key: '0xd3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 8,
    key: '0xe3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 9,
    key: '0xf3e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 10,
    key: '0xa5e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 11,
    key: '0xb6e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 12,
    key: '0xc7e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
  {
    validatorIndex: 13,
    key: '0xd8e9f4e915f9fb9ef9c55da1815071f3f728cc6fc434fba2c11e08db5b5fa22b71d5975cec30ef97e7fc901e5a04ee5b',
  },
];

export const dvtOpOneRespExitMessages100percent = [
  {
    validator_index: '1',
    epoch: String(epoch),
  },
  {
    validator_index: '5',
    epoch: String(epoch),
  },
  {
    validator_index: '6',
    epoch: String(epoch),
  },
  {
    validator_index: '7',
    epoch: String(epoch),
  },
  {
    validator_index: '8',
    epoch: String(epoch),
  },
  {
    validator_index: '9',
    epoch: String(epoch),
  },
  {
    validator_index: '10',
    epoch: String(epoch),
  },
  {
    validator_index: '11',
    epoch: String(epoch),
  },
  {
    validator_index: '12',
    epoch: String(epoch),
  },
  {
    validator_index: '13',
    epoch: String(epoch),
  },
];

export const curatedOpOneResp = [
  {
    validatorIndex: 3,
    key: '0xa554bc44d9eacbf4dd6a2d6087b43f4c67fd5618651b97effcb30997bf49e5d7acf0100ef14e5d087cc228bc78d498e6',
  },
];

export const validators = {
  execution_optimistic: false,
  data: [
    ...dvtOpOneReadyForExitValidators,
    ...curatedOpOneReadyForExitValidators,
    {
      index: '2',
      balance: '34274744045',
      status: 'pending_queued',
      validator: {
        pubkey: '0xad9a0951d00c0988d3b8e719b9e65d6bc3501c9c35392fb6f050fcbbcdd316836a887acee989730bdf093629448bb731',
        withdrawal_credentials: '0x00472bc262a89d741a00806182cf90466d92ed498bb04d6a07620ebf798747db',
        effective_balance: '32000000000',
        slashed: false,
        activation_eligibility_epoch: '0',
        activation_epoch: '0',
        exit_epoch: '18446744073709551615',
        withdrawable_epoch: '18446744073709551615',
      },
    },
  ],
};
