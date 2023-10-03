const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const baseEndpoint1 = process.env.KAPI_HOST_NEW_VERSION;
// Define the URLs of the endpoints you want to compare
if (baseEndpoint1.endsWith('/')) {
  baseEndpoint1 = baseEndpoint1.slice(0, -1);
}

const baseEndpoint2 = process.env.KAPI_HOST_OLD_VERSION;
// Define the URLs of the endpoints you want to compare
if (baseEndpoint2.endsWith('/')) {
  baseEndpoint2 = baseEndpoint2.slice(0, -1);
}

// Function to recursively check if an object and its nested objects have the required fields
function deepCheckForRequiredFields(obj) {
  return (
    obj.hasOwnProperty('appVersion') &&
    obj.hasOwnProperty('chainId') &&
    obj.hasOwnProperty('elBlockSnapshot') &&
    obj.hasOwnProperty('clBlockSnapshot') &&
    obj.elBlockSnapshot.hasOwnProperty('blockNumber') &&
    obj.elBlockSnapshot.hasOwnProperty('blockHash') &&
    obj.elBlockSnapshot.hasOwnProperty('timestamp') &&
    obj.clBlockSnapshot.hasOwnProperty('epoch') &&
    obj.clBlockSnapshot.hasOwnProperty('root') &&
    obj.clBlockSnapshot.hasOwnProperty('slot') &&
    obj.clBlockSnapshot.hasOwnProperty('blockNumber') &&
    obj.clBlockSnapshot.hasOwnProperty('timestamp') &&
    obj.clBlockSnapshot.hasOwnProperty('blockHash')
  );
}

// Function to check an endpoint and validate the response deeply
async function deepCheckEndpoint(endpoint) {
  try {
    const response = await axios.get(endpoint);
    const responseData = response.data;

    if (deepCheckForRequiredFields(responseData)) {
      console.log(`Endpoint ${endpoint} has all required fields.`);
    } else {
      console.log(`Endpoint ${endpoint} is missing some required fields.`);
    }
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
  }
}

// Check both endpoints
deepCheckEndpoint(`${baseEndpoint1}/v1/status`);
deepCheckEndpoint(`${baseEndpoint2}/v1/status`);
