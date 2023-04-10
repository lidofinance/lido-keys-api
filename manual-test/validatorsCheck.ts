import { ethers } from 'ethers';
import yargs from 'yargs';
import fetch from 'node-fetch';
import * as fs from 'fs';
import { makeRequest } from './utils';

const red = '\x1b[31m';
const green = '\x1b[32m';
const reset = '\x1b[0m';

// Define the command line arguments
const argv = yargs(process.argv.slice(2)).options({
  baseUrl: { type: 'string', demandOption: true },
}).argv;

const baseUrl = argv.baseUrl.replace(/\/$/, '');

// want to check validators endpoint work and synchronized

async function checkValidatorsEndpoint() {
  console.log('test /validators endpoint synced with ');
  const url = `${baseUrl}/v1/modules/1/validators/validator-exits-to-prepare/1`;
  const response = await makeRequest(url);

  if (!response.ok) {
    console.log(`Something wrong with /validators endpoint ${response.status}`);
    process.exit(1);
  }

  const { data, meta } = await response.json();

  console.log(`Successfully finished. meta:`, meta);
}

checkValidatorsEndpoint();
