const { fetchData, baseEndpoint1, baseEndpoint2 } = require('./utils');

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.data && response.meta;
}

describe('validator-exits-to-prepare', () => {
  let response1, response2, status1, status2;

  beforeAll(async () => {
    const resp1 = await fetchData(`${baseEndpoint1}/v1/modules/1/validators/validator-exits-to-prepare/10`);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(`${baseEndpoint2}/v1/modules/1/validators/validator-exits-to-prepare/10`);
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
    expect(response1.meta.clBlockSnapshot.blockHash).toEqual(response2.meta.clBlockSnapshot.blockHash);
  });

  test('the data array has the same length', () => {
    expect(response1.data.length).toEqual(response2.data.length);
  });

  test('compare data', () => {
    const data1 = response1.data;
    const data2 = response2.data;

    data1.sort((a, b) => parseInt(a.validatorIndex, 10) - parseInt(b.validatorIndex, 10));
    data2.sort((a, b) => parseInt(a.validatorIndex, 10) - parseInt(b.validatorIndex, 10));

    // Compare each object in the lists
    for (let i = 0; i < data1.length; i++) {
      expect(data1[i].validatorIndex).toEqual(data2[i].validatorIndex);
      expect(data1[i].key).toEqual(data2[i].key);
    }
  });
});

describe('generate-unsigned-exit-messages', () => {
  let response1, response2, status1, status2;

  beforeAll(async () => {
    const resp1 = await fetchData(`${baseEndpoint1}/v1/modules/1/validators/generate-unsigned-exit-messages/10`);
    response1 = resp1.data;
    status1 = resp1.status;
    const resp2 = await fetchData(`${baseEndpoint2}/v1/modules/1/validators/generate-unsigned-exit-messages/10`);
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
    expect(response1.meta.clBlockSnapshot.blockHash).toEqual(response2.meta.clBlockSnapshot.blockHash);
  });

  test('the data array has the same length', () => {
    expect(response1.data.length).toEqual(response2.data.length);
  });

  test('compare data', () => {
    const data1 = response1.data;
    const data2 = response2.data;

    data1.sort((a, b) => parseInt(a.validator_index, 10) - parseInt(b.validator_index, 10));
    data2.sort((a, b) => parseInt(a.validator_index, 10) - parseInt(b.validator_index, 10));

    // Compare each object in the lists
    for (let i = 0; i < data1.length; i++) {
      expect(data1[i].validator_index).toEqual(data2[i].validator_index);
      expect(data1[i].epoch).toEqual(data2[i].epoch);
    }
  });
});
