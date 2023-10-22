const { fetchData, compareKeys, compareStakingModules, baseEndpoint1, baseEndpoint2 } = require('./utils');

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
];

testCases.forEach(({ description, path, query = '', method = 'get', data = null }) => {
  describe(description, () => {
    let response1, response2, status1, status2;

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

    test('Compare keys by modules', () => {
      const data1 = response1.data;
      const data2 = response2.data;

      if (data1.length !== data2.length) {
        expect(data1.length).toEqual(data2.length);
      }

      // Sort data arrays by "module.id"
      data1.sort((a, b) => a.module.id - b.module.id);
      data2.sort((a, b) => a.module.id - b.module.id);

      for (let i = 0; i < data1.length; i++) {
        const module1 = data1[i].module;
        const module2 = data2[i].module;

        expect(compareStakingModules(module1, module2)).toBeTruthy();

        const keys1 = data1[i].keys;
        const keys2 = data2[i].keys;

        // Sort keys arrays by "key"
        keys1.sort((a, b) => a.key.localeCompare(b.key));
        keys2.sort((a, b) => a.key.localeCompare(b.key));

        // Check if the lists of keys have the same length
        if (keys1.length !== keys2.length) {
          expect(keys1.length).toEqual(keys2.length);
        }

        // Compare each key in the lists (assuming they are strings)
        for (let j = 0; j < keys1.length; j++) {
          expect(compareKeys(keys1[j], keys2[j])).toBeTruthy();
        }
      }
    });
  });
});
