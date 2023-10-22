const {
  fetchData,
  compareKeys,
  compareOperatorObjects,
  baseEndpoint1,
  baseEndpoint2,
  compareStakingModules,
} = require('./utils');

function checkResponseStructure(response) {
  return response && response.meta && response.data;
}

describe('Comparing Endpoints', () => {
  let response1, response2, status1, status2, operators1, operators2;

  beforeAll(async () => {
    const endpoint1 = `${baseEndpoint1}/v1/modules/1/operators/keys`;
    const endpoint2 = `${baseEndpoint2}/v1/modules/1/operators/keys`;

    const resp1 = await fetchData(endpoint1);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(endpoint2);
    response2 = resp2.data;
    status2 = resp2.status;
  }, 30000);

  test('Both endpoints should return status 200', () => {
    expect(status1).toBe(200);
    expect(status2).toBe(200);
  });

  test('The responses should have the correct structure', () => {
    expect(checkResponseStructure(response1)).toBeTruthy();
    expect(checkResponseStructure(response2)).toBeTruthy();
  });

  test('should have the same "blockHash" property', () => {
    expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
  });

  test('should have equivalent length of data', () => {
    operators1 = response1.data.operators;
    operators2 = response2.data.operators;

    expect(operators1.length).toEqual(operators2.length);
  });

  test('should have equivalent operators', () => {
    operators1.sort((a, b) => a.index - b.index);
    operators2.sort((a, b) => a.index - b.index);

    for (let j = 0; j < operators1.length; j++) {
      expect(compareOperatorObjects(operators1[j], operators2[j])).toBeTruthy();
    }
  });

  test('should have equivalent keys', () => {
    const keys1 = response1.data.keys;
    const keys2 = response2.data.keys;

    keys1.sort((a, b) => a.key.localeCompare(b.key));
    keys2.sort((a, b) => a.key.localeCompare(b.key));

    for (let j = 0; j < keys1.length; j++) {
      expect(compareKeys(keys1[j], keys2[j], ['index', 'moduleAddress'])).toBeTruthy();
    }
  });

  test('should have an equivalent module', () => {
    const module1 = response1.data.module;
    const module2 = response2.data.module;

    expect(compareStakingModules(module1, module2)).toBe(true);
  });
});
