const dotenv = require('dotenv');
const { fetchData, compareKeys, baseEndpoint1, baseEndpoint2 } = require('./utils');

dotenv.config();

function checkResponseStructure(response) {
  return response && response?.data && response?.meta;
}

const pubkey = process.env.PUBKEY_FOR_TEST;
const testCases = [
  { desc: 'Comparing endpoints with used query parameter', path: 'v1/keys/', query: '?used=true' },
  { desc: 'Comparing endpoints with unused query parameter', path: 'v1/keys/', query: '?used=false' },
  { desc: 'Comparing endpoints without query parameter', path: 'v1/keys/', query: '' },
  { desc: 'Compare for pubkey search', path: 'v1/keys/', query: pubkey },
  {
    desc: 'Compare for pubkeys find method',
    path: 'v1/keys/find',
    query: '',
    method: 'post',
    data: { pubkeys: [pubkey] },
  },
];

testCases.forEach(({ description, path, query = '', method = 'get', data = null }) => {
  describe(description, () => {
    let response1, response2, status1, status2, keys1, keys2;

    beforeAll(async () => {
      const resp1 = await fetchData(`${baseEndpoint1}/${path}${query}`, method, data);
      response1 = resp1.data;
      status1 = resp1.status;
      const resp2 = await fetchData(`${baseEndpoint2}/${path}${query}`, method, data);
      response2 = resp2.data;
      status2 = resp2.status;
    });

    test('Both endpoints should return status 200', () => {
      expect(status1).toBe(200);
      expect(status2).toBe(200);
    });

    test('The responses should have the correct structure', () => {
      expect(checkResponseStructure(response1)).toBeTruthy();
      expect(checkResponseStructure(response2)).toBeTruthy();
    });

    test('lists should have the same length', () => {
      keys1 = response1.data;
      keys2 = response2.data;
      expect(keys1.length).toEqual(keys2.length);
    });

    test('"blockHash" property in the "meta" field should be the same', () => {
      expect(response1.meta.elBlockSnapshot.blockHash).toEqual(response2.meta.elBlockSnapshot.blockHash);
    });

    test('all objects in the lists should be equivalent', () => {
      keys1.sort((a, b) => a.key.localeCompare(b.key));
      keys2.sort((a, b) => a.key.localeCompare(b.key));

      for (let i = 0; i < keys1.length; i++) {
        expect(compareKeys(keys1[i], keys2[i], ['index'])).toBe(true);
      }
    });
  });
});
