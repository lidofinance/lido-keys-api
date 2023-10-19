const axios = require('axios');
const dotenv = require('dotenv');
const { fetchData, compareKeyObjects, compareModuleObjects } = require('./utils');

dotenv.config();

let baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

let baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;
if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

function checkResponseStructure(response) {
  return response && response.meta && response.data;
}

describe('Comparing Endpoints', () => {
  let response1, response2;

  beforeAll(async () => {
    const endpoint1 = `${baseEndpoint1}/v1/modules/1/operators/keys`;
    const endpoint2 = `${baseEndpoint2}/v1/modules/1/operators/keys`;

    response1 = await fetchData(endpoint1);
    response2 = await fetchData(endpoint2);

    // Check the structure of the responses
    if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
      console.log('The responses have an incorrect structure.');
      return;
    }
  });

  test('should have a 200 status code', () => {
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  test('should have the same "blockHash" property', () => {
    expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
  });

  test('should have equivalent operators', () => {
    const operators1 = response1.data.operators;
    const operators2 = response2.data.operators;

    operators1.sort((a, b) => a.index - b.index);
    operators2.sort((a, b) => a.index - b.index);

    for (let j = 0; j < operators1.length; j++) {
      expect(compareOperatorObjects(operators1[j], operators2[j])).toBe(true);
    }
  });

  test('should have equivalent keys', () => {
    const keys1 = response1.data.keys;
    const keys2 = response2.data.keys;

    keys1.sort((a, b) => a.key.localeCompare(b.key));
    keys2.sort((a, b) => a.key.localeCompare(b.key));

    for (let j = 0; j < keys1.length; j++) {
      expect(compareKeyObjects(keys1[j], keys2[j], ['index', 'moduleAddress'])).toBe(true);
    }
  });

  test('should have an equivalent module', () => {
    const module1 = response1.data.module;
    const module2 = response2.data.module;

    expect(compareModuleObjects(module1, module2)).toBe(true);
  });
});
