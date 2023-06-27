import http from "k6/http";
import { check, sleep } from "k6";
import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js';

// Test configuration
export const options = {
  duration: "60s",
};

const url = 'http://localhost:3000/v1/keys'
const parallelRequestsNum = 5;

// Simulated user behavior
export default function () {
  // always get OOM error with this test
  // if decrease duration to 30s, will not get OOM error 
  describe('Test parallel requests to /keys', () => {
    let requests = Array(parallelRequestsNum).fill(['GET', url])
    let responses = http.batch(requests)
    // Validate response status
    for (let resp of responses) {
      check(resp, { "status was 200": (r) => r.status == 200 });
    }
  })
}