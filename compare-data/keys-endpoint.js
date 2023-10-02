const axios = require('axios'); // You may need to install axios using npm or yarn

// Define the URLs of the endpoints you want to compare
const endpoint1 = 'http://127.0.0.01:3002/v1/keys'; // new
const endpoint2 = 'http://127.0.0.01:3001/v1/keys'; // old

// Function to fetch data from an endpoint
async function fetchData(endpoint) {
  try {
    const response = await axios.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
}

// Function to compare two objects, excluding the "index" field
function compareObjects(obj1, obj2) {
    // Create copies of objects without the "index" field
    const strippedObj1 = { ...obj1 };
    const strippedObj2 = { ...obj2 };
    delete strippedObj1.index;
    delete strippedObj2.index;
  
    // Convert objects to JSON strings and compare
    return JSON.stringify(strippedObj1) === JSON.stringify(strippedObj2);
}

  // Function to check the structure of the response
function checkResponseStructure(response) {
    return response && response.hasOwnProperty('data') && response.hasOwnProperty('meta');
}

// Main function to compare endpoints
async function compareEndpoints() {
  const response1 = await fetchData(endpoint1);
  const response2 = await fetchData(endpoint2);

  // Check the structure of the responses
  if (!checkResponseStructure(response1) || !checkResponseStructure(response2)) {
    console.log('The responses have an incorrect structure.');
    return;
  }

  const data1 = response1.data;
  const data2 = response2.data;

  // Sort data arrays by "key"
  data1.sort((a, b) => a.key.localeCompare(b.key));
  data2.sort((a, b) => a.key.localeCompare(b.key));

  // Check if the lists have the same length
  if (data1.length !== data2.length) {
    console.log('The lists have different lengths.');
    return;
  }

  // Compare each object in the lists
  for (let i = 0; i < data1.length; i++) {
    if (!compareObjects(data1[i], data2[i])) {
      console.log(`Object at index ${i} is different.`);

      console.log(data1[i], data2[i]);
      return;
    }
  }

  console.log('The lists are equivalent.');
}

// Call the main function to start the comparison
compareEndpoints();