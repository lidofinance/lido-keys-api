import { get } from 'k6/http';
import { check } from 'k6';

// Test configuration
export const options = {
  thresholds: {
    http_req_duration: ['p(10) > 30000'],
  },
  // better to make it longer to cross with validators update
  duration: '80s',
  vus: 1,
};

// Simulated user behavior
export default function test() {
  const res = get(`http://localhost:${__ENV.PORT}/v1/keys`);
  // Validate response status
  check(res, { 'Should return response with status 200': (r) => r.status == 200 });
}
