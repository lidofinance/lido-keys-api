const { fetchData, baseEndpoint1, baseEndpoint2, compareStakingModules, compareOperatorObjects } = require('./utils');

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.data && response.meta;
}

describe('v1/operators', () => {
  let response1, response2, status1, status2;

  beforeAll(async () => {
    const resp1 = await fetchData(`${baseEndpoint1}/v1/operators`);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(`${baseEndpoint2}/v1/operators`);
    response2 = resp2.data;
    status2 = resp2.status;
  }, 20000);

  test('Both endpoints should return status 200', async () => {
    expect(status1).toBe(200);
    expect(status2).toBe(200);
  });

  test('The responses should have the correct structure', () => {
    expect(checkResponseStructure(response1)).toBeTruthy();
    expect(checkResponseStructure(response2)).toBeTruthy();
  });

  test('the data array has the same length', () => {
    expect(response1.data.length).toEqual(response2.data.length);
  });

  test('should have the same "blockHash" property', () => {
    expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
  });

  test('compare operators and modules', () => {
    const data1 = response1.data;
    const data2 = response2.data;

    data1.sort((a, b) => a.module.id - b.module.id);
    data2.sort((a, b) => a.module.id - b.module.id);

    for (let i = 0; i < data1.length; i++) {
      const module1 = data1[i].module;
      const module2 = data2[i].module;
      expect(compareStakingModules(module1, module2)).toBeTruthy();

      const operators1 = data1[i].operators;
      const operators2 = data2[i].operators;

      operators1.sort((a, b) => a.index - b.index);
      operators2.sort((a, b) => a.index - b.index);

      for (let j = 0; j < operators1.length; j++) {
        expect(compareOperatorObjects(operators1[j], operators2[j])).toBeTruthy();
      }
    }
  });
});

describe('v1/modules/1/operators', () => {
  let response1, response2, status1, status2;

  beforeAll(async () => {
    const resp1 = await fetchData(`${baseEndpoint1}/v1/modules/1/operators`);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(`${baseEndpoint2}/v1/modules/1/operators`);
    response2 = resp2.data;
    status2 = resp2.status;
  }, 20000);

  test('Both endpoints should return status 200', async () => {
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

  test('modules are the same', () => {
    const module1 = response1.data.module;
    const module2 = response2.data.module;

    expect(compareStakingModules(module1, module2)).toBeTruthy();
  });

  test('the operators array has the same length', () => {
    expect(response1.data.operators.length).toEqual(response2.data.operators.length);
  });

  test('compare operators', () => {
    const operators1 = response1.data.operators;
    const operators2 = response2.data.operators;

    operators1.sort((a, b) => a.index - b.index);
    operators2.sort((a, b) => a.index - b.index);

    for (let j = 0; j < operators1.length; j++) {
      expect(compareOperatorObjects(operators1[j], operators2[j])).toBeTruthy();
    }
  });
});

describe('v1/modules/1/operators/1', () => {
  let response1, response2, status1, status2;

  beforeAll(async () => {
    const resp1 = await fetchData(`${baseEndpoint1}/v1/modules/1/operators/1`);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(`${baseEndpoint2}/v1/modules/1/operators/1`);
    response2 = resp2.data;
    status2 = resp2.status;
  }, 30000);

  test('Both endpoints should return status 200', async () => {
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

  test('modules are the same', () => {
    const module1 = response1.data.module;
    const module2 = response2.data.module;

    expect(compareStakingModules(module1, module2)).toBeTruthy();
  });

  test('compare operators', () => {
    const operators1 = response1.data.operator;
    const operators2 = response2.data.operator;
    expect(compareOperatorObjects(operators1, operators2)).toBeTruthy();
  });
});
