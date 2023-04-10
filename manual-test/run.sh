#!/bin/bash
source .env
npx ts-node manual-test/apiAndContractKeysCheck.ts --contractAddress $REGISTRY_CONTRACT_ADDRESS --contractAbiPath manual-test/registry.json --elProviderUrl $PROVIDER_URL --baseUrl $BASE_URL && 
npx ts-node manual-test/validatorsCheck.ts  --baseUrl $BASE_URL