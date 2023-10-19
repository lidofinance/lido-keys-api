const axios = require('axios');
const dotenv = require('dotenv');
const { fetchData, compareKeys } = require('./utils');

dotenv.config();

let baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
let baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;

if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

function checkResponseStructure(response) {
  return response && response.hasOwnProperty('data') && response.hasOwnProperty('meta');
}

const pubkey = process.env.PUBKEY_FOR_TEST;
const testScenarios = [
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

testScenarios.forEach((scenario) => {
  describe(scenario.desc, () => {
    let data1, data2;

    beforeAll(async () => {
      const endpoint1 = `${baseEndpoint1}/${scenario.path}${scenario.query}`;
      const endpoint2 = `${baseEndpoint2}/${scenario.path}${scenario.query}`;

      const response1 = await fetchData(endpoint1, scenario.method || 'get', scenario.data);
      const response2 = await fetchData(endpoint2, scenario.method || 'get', scenario.data);
    });

    test('should have a 200 status code', async () => {
      const status1 = await axios.get(`${baseEndpoint1}/${scenario.path}${scenario.query}`);
      const status2 = await axios.get(`${baseEndpoint2}/${scenario.path}${scenario.query}`);
      expect(status1.status).toBe(200);
      expect(status2.status).toBe(200);
    });

    test('should have correct response structure', () => {
      expect(checkResponseStructure(data1)).toBe(true);
      expect(checkResponseStructure(data2)).toBe(true);
    });

    test('lists should have the same length', () => {
      expect(data1.length).toEqual(data2.length);
    });

    test('"blockHash" property in the "meta" field should be the same', () => {
      expect(data1.meta.elBlockSnapshot.blockHash).toEqual(data2.meta.elBlockSnapshot.blockHash);
    });

    test('all objects in the lists should be equivalent', () => {
      data1 = response1.data;
      data2 = response2.data;

      data1.sort((a, b) => a.key.localeCompare(b.key));
      data2.sort((a, b) => a.key.localeCompare(b.key));

      const keys1 = response1.data.keys;
      const keys2 = response2.data.keys;

      keys1.sort((a, b) => a.key.localeCompare(b.key));
      keys2.sort((a, b) => a.key.localeCompare(b.key));

      for (let i = 0; i < data1.length; i++) {
        expect(compareKeys(data1[i], data2[i], ['index'])).toBe(true);
      }
    });
  });
});
