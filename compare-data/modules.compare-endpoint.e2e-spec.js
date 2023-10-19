const dotenv = require('dotenv');
const { fetchData, compareModuleObjects } = require('./utils');

dotenv.config();

let baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

let baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;
if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

// Function to check the structure of the response
function checkResponseStructure(response) {
  return response && response.data && response.elBlockSnapshot;
}

const testScenarios = [
  { desc: 'Comparing /modules/1/keys endpoints with used query parameter:', path: 'v1/modules/1' },
  { desc: 'Comparing /modules endpoints with unused query parameter:', path: 'v1/modules', query: '?used=false' },
];

testScenarios.forEach((scenario) => {
  describe(scenario.desc, () => {
    let response1, response2;

    beforeAll(async () => {
      const endpoint1 = `${baseEndpoint1}/${scenario.path}${scenario.query || ''}`;
      const endpoint2 = `${baseEndpoint2}/${scenario.path}${scenario.query || ''}`;

      response1 = await fetchData(endpoint1);
      response2 = await fetchData(endpoint2);

      // Check the structure of the responses
      if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
        console.log('The responses have an incorrect structure.');
        return;
      }
    });

    test('should have a 200 status code', async () => {
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('should have the same "blockHash" property', () => {
      expect(response1.elBlockSnapshot.blockHash).toEqual(response2.elBlockSnapshot.blockHash);
    });

    if (Array.isArray(response1.data)) {
      test('should have arrays of the same length', () => {
        expect(response1.data.length).toEqual(response2.data.length);
      });

      test('should have equivalent module objects', () => {
        for (let i = 0; i < response1.data.length; i++) {
          expect(compareModuleObjects(response1.data[i], response2.data[i])).toBe(true);
        }
      });
    } else {
      test('should have equivalent module objects', () => {
        expect(compareModuleObjects(response1.data, response2.data)).toBe(true);
      });
    }
  });
});
