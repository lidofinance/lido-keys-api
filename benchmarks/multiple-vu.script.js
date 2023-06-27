import http from "k6/http";
import { check, sleep } from "k6";
import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js';

// Test configuration
export const options = {
  duration: "60s",
  vus: 10
};

// sometime get Unable to acquire a connection 
// DriverException: Unable to acquire a connection 

// Simulated user behavior
export default function () {
  // this endpoint process the 
  describe('Test /keys endpoint', () => {
    let res = http.get("http://localhost:3000/v1/keys");
    // Validate response status
    check(res, { "status was 200": (r) => r.status == 200 });
  })
}