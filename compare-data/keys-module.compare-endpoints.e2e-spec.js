const { fetchData, compareKeys, compareModuleObjects } = require('./utils');
const dotenv = require('dotenv');
dotenv.config();

const baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION.endsWith('/')
  ? process.env.KAPI_HOST_NEW_VERSION.slice(0, -1)
  : process.env.KAPI_HOST_NEW_VERSION;
const baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION.endsWith('/')
  ? process.env.KAPI_HOST_OLD_VERSION.slice(0, -1)
  : process.env.KAPI_HOST_OLD_VERSION;

function checkResponseStructure(response) {
  return (
    response &&
    response.hasOwnProperty('data') &&
    response.hasOwnProperty('meta') &&
    response.data.hasOwnProperty('keys') &&
    response.data.hasOwnProperty('module')
  );
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
    let response1, response2, keys1, keys2, module1, module2;

    beforeAll(async () => {
      response1 = await fetchData(`${baseEndpoint1}/${path}${query}`, method, data);
      response2 = await fetchData(`${baseEndpoint2}/${path}${query}`, method, data);

      keys1 = response1.data.keys;
      keys2 = response2.data.keys;

      keys1.sort((a, b) => a.key.localeCompare(b.key));
      keys2.sort((a, b) => a.key.localeCompare(b.key));

      module1 = response1.data.module;
      module2 = response2.data.module;
    });

    test('Both endpoints should return status 200', () => {
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('The responses should have the correct structure', () => {
      expect(checkResponseStructure(response1)).toBeTruthy();
      expect(checkResponseStructure(response2)).toBeTruthy();
    });

    test('The "blockHash" property in the "meta" field should match', () => {
      expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
    });

    test('The lists of keys should have the same length', () => {
      expect(keys1.length).toEqual(keys2.length);
    });

    test('All keys should be equivalent', () => {
      keys1.forEach((keyObj, index) => {
        expect(compareKeys(keyObj, keys2[index], ['moduleAddress'])).toBeTruthy();
      });
    });

    test('The module structures should be equivalent', () => {
      expect(compareModuleObjects(module1, module2)).toBeTruthy();
    });
  });
});
