import { OperatorEntity, STAKING_MODULE_TYPE } from 'staking-router-modules';
import { CuratedOperatorResponse } from './curated-operator';

export type StakingModuleOperatorResponse = CuratedOperatorResponse;

// idea is to match Response view with module Operator data
// from staking-router-module we get Operator view for module from db
// here we form response

// TODO: Want to describe here something that will strongly map CuratedOperator from Db to CuratedOperator response,
// CommunityOperator from Db (stakign-router-module field ) to CommunityOperator Response

const operatorRespMapper = { [STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE]: CuratedOperatorResponse };

// TODO: manage how to name the Operator in stakign-router-module and in http entities
export const srModuleOperatorMapper = (
  type: STAKING_MODULE_TYPE,
  operator: OperatorEntity,
): StakingModuleOperatorResponse => {
  const operatorRespClass = operatorRespMapper[type];

  return new operatorRespClass(operator);
};
