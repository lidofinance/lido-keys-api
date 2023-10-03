const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

let baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

let baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;
if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

async function fetchData(endpoint, method = 'get', data = null) {
  try {
    const response = await axios({
      method,
      url: endpoint,
      data,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
}

function compareOperatorObjects(obj1, obj2) {
  // Create copies of objects with 'moduleAddress' removed
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  delete strippedObj1.moduleAddress;
  delete strippedObj2.moduleAddress;

  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
}

function compareModuleObjects(obj1, obj2) {
  // Compare module objects excluding certain fields
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  delete strippedObj1.moduleAddress;
  delete strippedObj2.moduleAddress;
  delete strippedObj1.exitedValidatorsCount;
  delete strippedObj2.exitedValidatorsCount;
  delete strippedObj1.active;
  delete strippedObj2.active;

  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
}

function checkResponseStructure(response) {
  return response && response.meta && response.data;
}

async function compareOperatorsEndpoints(path = '') {
  const endpoint1 = `${baseEndpoint1}/${path}`;
  const endpoint2 = `${baseEndpoint2}/${path}`;

  const response1 = await fetchData(endpoint1);
  const response2 = await fetchData(endpoint2);

  if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
    console.log('The responses have an incorrect structure.');
    return;
  }

  if (response1.meta.elBlockSnapshot.blockHash !== response2.meta.elBlockSnapshot.blockHash) {
    console.log('The "blockHash" property in the "meta" field is different.');
    return;
  }

  if (Array.isArray(response1.data)) {
    if (!Array.isArray(response2.data)) {
      console.log('The responses are incorrect,  one of them is array, another one is not');
      return;
    }

    const operatorsAndModules1 = response1.data;
    const operatorsAndModules2 = response2.data;

    if (operatorsAndModules1.length != operatorsAndModules2.length) {
      console.log('The "data" arrays have different lengths.');
      return;
    }

    for (let i = 0; i < operatorsAndModules1; i++) {
      const module1 = operatorsAndModules1.module;
      const module2 = operatorsAndModules2.module;

      if (!compareModuleObjects(module1[i], module2[i])) {
        console.log(`Module at index ${i} is different.`);
        return;
      }

      const operators1 = operatorsAndModules1.operators;
      const operators2 = operatorsAndModules2.operators;

      operators1.sort((a, b) => a.index - b.index);
      operators2.sort((a, b) => a.index - b.index);

      if (operators1.operators.length !== operators2.length) {
        console.log('The lists of operators have different lengths.');
        return;
      }

      for (let j = 0; j < operators1.length; j++) {
        if (!compareOperatorObjects(operators1.operators[j], operators2.operators[j])) {
          console.log(`Operator at index ${j} is different.`);
          console.log(operators1[j], operators2[j]);
          return;
        }
      }
    }
  } else if (response1.data.operators) {
    const operatorsAndModule1 = response1.data;
    const operatorsAndModule2 = response2.data;

    const operators1 = operatorsAndModule1.operators;
    const operators2 = operatorsAndModule2.operators;

    operators1.sort((a, b) => a.index - b.index);
    operators2.sort((a, b) => a.index - b.index);

    for (let j = 0; j < operators1.length; j++) {
      if (!compareOperatorObjects(operators1[j], operators2[j])) {
        console.log(`Operator at index ${j} is different.`);
        console.log(operators1[j], operators2[j]);
        return;
      }
    }

    const module1 = operatorsAndModule1.module;
    const module2 = operatorsAndModule2.module;

    if (!compareModuleObjects(module1, module2)) {
      console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
      console.log(module1, module2);
      return;
    }
  } else {
    const operatorAndModule1 = response1.data;
    const operatorAndModule2 = response2.data;

    const operator1 = operatorAndModule1.operator;
    const operator2 = operatorAndModule2.operator;

    if (!compareOperatorObjects(operator1, operator2)) {
      console.log(`Operator are different`);
      console.log(operator1, operator2);
      return;
    }

    const module1 = operatorAndModule1.module;
    const module2 = operatorAndModule2.module;

    if (!compareModuleObjects(module1, module2)) {
      console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
      console.log(module1, module2);
      return;
    }
  }

  console.log('The data and module structures are equivalent.');
}

async function compareEndpoints() {
  console.log('Comparing /operators endpoints:');
  await compareOperatorsEndpoints('v1/operators');

  console.log('Comparing /modules/1/operators endpoints:');
  await compareOperatorsEndpoints('v1/modules/1/operators');

  console.log('Comparing /modules/1/operators/1 endpoints:');
  await compareOperatorsEndpoints('v1/modules/1/operators/1');
}

compareEndpoints();
