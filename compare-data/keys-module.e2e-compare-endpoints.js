const { fetchData, compareKeys, compareStakingModules, baseEndpoint1, baseEndpoint2 } = require('./utils');
const dotenv = require('dotenv');
dotenv.config();

function checkResponseStructure(response) {
  return response && response?.data && response?.meta && response.data?.keys && response.data?.module;
}

const testCases = [
  {
    description: 'Comparing /modules/1/keys endpoints with used query parameter',
    path: 'v1/modules/1/keys',
    query: '?used=true',
  },
  {
    description: 'Comparing /modules/1/keys endpoints with unused query parameter',
    path: 'v1/modules/1/keys',
    query: '?used=false',
  },
  { description: 'Comparing /modules/1/keys endpoints without query parameter', path: 'v1/modules/1/keys' },
  {
    description: 'Compare v1/modules/1/keys/find',
    path: 'v1/modules/1/keys/find',
    method: 'post',
    data: { pubkeys: [process.env.PUBKEY_FOR_TEST] },
  },
];

testCases.forEach(({ description, path, query = '', method = 'get', data = null }) => {
  describe(description, () => {
    let response1, response2, status1, status2, keys1, keys2, module1, module2;

    beforeAll(async () => {
      const resp1 = await fetchData(`${baseEndpoint1}/${path}${query}`, method, data);
      response1 = resp1.data;
      status1 = resp1.status;
      const resp2 = await fetchData(`${baseEndpoint2}/${path}${query}`, method, data);
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

    test('The "blockHash" property in the "meta" field should match', () => {
      expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
    });

    test('The lists of keys should have the same length', () => {
      keys1 = response1.data.keys;
      keys2 = response2.data.keys;

      expect(keys1.length).toEqual(keys2.length);
    });

    test('All keys should be equivalent', () => {
      keys1.sort((a, b) => a.key.localeCompare(b.key));
      keys2.sort((a, b) => a.key.localeCompare(b.key));

      keys1.forEach((keyObj, index) => {
        // old version doesn't have a moduleAddress
        expect(compareKeys(keyObj, keys2[index], ['moduleAddress'])).toBeTruthy();
      });
    });

    test('The module structures should be equivalent', () => {
      module1 = response1.data.module;
      module2 = response2.data.module;

      expect(compareStakingModules(module1, module2)).toBeTruthy();
    });
  });
});
