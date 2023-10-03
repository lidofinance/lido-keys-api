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

function compareKeyObjects(obj1, obj2) {
  // Create copies of objects without the "index" field
  const strippedObj1 = { ...obj1 };
  const strippedObj2 = { ...obj2 };
  // remove index from new
  delete strippedObj1.index;
  delete strippedObj2.index;
  delete strippedObj1.moduleAddress;
  delete strippedObj2.moduleAddress;

  // Convert objects to JSON strings and compare
  for (const key in strippedObj1) {
    if (strippedObj1[key] !== strippedObj2[key]) {
      return false;
    }
  }

  return true;
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

  const data1 = response1.data;
  const data2 = response2.data;

  const operators1 = data1.operators;
  const operators2 = data2.operators;

  operators1.sort((a, b) => a.index - b.index);
  operators2.sort((a, b) => a.index - b.index);

  for (let j = 0; j < operators1.length; j++) {
    if (!compareOperatorObjects(operators1[j], operators2[j])) {
      console.log(`Operator at index ${j} is different.`);
      console.log(operators1[j], operators2[j]);
      return;
    }
  }

  const keys1 = data1.keys;
  const keys2 = data2.keys;

  keys1.sort((a, b) => a.key.localeCompare(b.key));
  keys2.sort((a, b) => a.key.localeCompare(b.key));

  for (let j = 0; j < keys1.length; j++) {
    if (!compareKeyObjects(keys1[j], keys2[j])) {
      console.log(`Key at index ${j} is different.`);
      console.log(keys1[j], keys2[j]);
      return;
    }
  }

  const module1 = data1.module;
  const module2 = data2.module;

  if (!compareModuleObjects(module1, module2)) {
    console.log(`Module is different , id of module1 ${module1.id} id of module2 ${module2.id}`);
    console.log(module1, module2);
    return;
  }

  console.log('The data and module structures are equivalent.');
}

async function compareEndpoints() {
  console.log('Comparing /modules/1/operators/keys endpoints:');
  await compareOperatorsEndpoints('v1/modules/1/operators/keys');
}

compareEndpoints();
