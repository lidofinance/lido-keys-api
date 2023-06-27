import http from "k6/http";
import { check, sleep } from "k6";
import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js';

// Test configuration
export const options = {
  thresholds: {
    // http request will be crossed with 
    http_req_duration: ["p(10) > 30000"],
  },
  // better to make it longer to cross with validators update
  // we will need this benchmark to check how long 1 request is handled depends on kapi job execution
  duration: "80s",
  vus: 1
};

// Simulated user behavior
export default function () {
  // this endpoint process the 
  describe('Test /keys endpoint', () => {
    let res = http.get("http://localhost:3000/v1/keys");
    // Validate response status
    check(res, { "status was 200": (r) => r.status == 200 });
  })
}