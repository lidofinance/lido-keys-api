import fetch from 'node-fetch';

export async function makeRequest(url, queryParams = {}, method = 'GET', body = {}) {
  const queryString = Object.keys(queryParams)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  const headers = {
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (method === 'POST') {
    options['body'] = JSON.stringify(body);
  }

  try {
    const response = await fetch(fullUrl, options);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(`Error occurred during request to ${url}`);
  }
}
