const dotenv = require('dotenv');
const { fetchData, baseEndpoint1, baseEndpoint2, compareStakingModules } = require('./utils');

dotenv.config();

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.data && response.elBlockSnapshot;
}

const testCases = [
  { desc: 'Comparing /modules/1 endpoints', path: 'v1/modules/1' },
  { desc: 'Comparing /modules endpoints', path: 'v1/modules' },
];

testCases.forEach(({ description, path }) => {
  describe(description, () => {
    let response1, response2, status1, status2;

    beforeAll(async () => {
      const resp1 = await fetchData(`${baseEndpoint1}/${path}`);
      response1 = resp1.data;
      status1 = resp1.status;
      const resp2 = await fetchData(`${baseEndpoint2}/${path}`);
      response2 = resp2.data;
      status2 = resp2.status;
    }, 5000);

    test('Both endpoints should return status 200', () => {
      expect(status1).toBe(200);
      expect(status2).toBe(200);
    });

    test('The responses should have the correct structure', () => {
      expect(checkResponseStructure(response1)).toBeTruthy();
      expect(checkResponseStructure(response2)).toBeTruthy();
    });

    test('should have the same "blockHash" property', () => {
      expect(response1.elBlockSnapshot.blockHash).toEqual(response2.elBlockSnapshot.blockHash);
    });

    test('compare data', () => {
      if (Array.isArray(response1.data)) {
        expect(response1.data.length).toEqual(response2.data.length);

        for (let i = 0; i < response1.data.length; i++) {
          expect(compareStakingModules(response1.data[i], response2.data[i])).toBeTruthy();
        }
      } else {
        expect(compareStakingModules(response1.data, response2.data)).toBeTruthy();
      }
    });
  });
});
