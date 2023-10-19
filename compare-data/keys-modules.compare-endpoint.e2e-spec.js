const {
  fetchData,
  compareKeyObjects,
  compareModuleObjects,
  checkResponseStructure,
  baseEndpoint1,
  baseEndpoint2,
} = require('./utils');

dotenv.config();

function checkResponseStructure(response) {
  return response && response?.data && response?.meta && Array.isArray(response.data);
}

const testCases = [
  {
    description: 'Comparing /modules/keys endpoints with used query parameter',
    path: 'v1/modules/keys',
    query: '?used=true',
  },
  {
    description: 'Comparing /modules/keys endpoints with unused query parameter',
    path: 'v1/modules/keys',
    query: '?used=false',
  },
  { description: 'Comparing /modules/keys endpoints without query parameter', path: 'v1/modules/keys' },
  {
    description: 'Compare v1/modules/1/keys/find',
    path: 'v1/modules/1/keys/find',
    method: 'post',
    data: { pubkeys: [process.env.PUBKEY_FOR_TEST] },
  },
];

testCases.forEach(({ description, path, query = '', method = 'get', data = null }) => {
  describe(description, () => {
    let response1, response2, keys1, keys2, module1, module2;

    beforeAll(async () => {
      response1 = await fetchData(`${baseEndpoint1}/${path}${query}`, method, data);
      response2 = await fetchData(`${baseEndpoint2}/${path}${query}`, method, data);
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
        expect(compareKeyObjects(keyObj, keys2[index], ['index', 'moduleAddress'])).toBeTruthy();
      });
    });

    test('The module structures should be equivalent', () => {
      module1 = response1.data.module;
      module2 = response2.data.module;
      expect(compareModuleObjects(module1, module2)).toBeTruthy();
    });
  });
});
