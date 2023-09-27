import { post, file } from 'k6/http';
import { check } from 'k6';

// Test configuration
export const options = {
  duration: '60s',
  vus: 1,
};

export default function test() {
  const data = {
    field: 'this is a standard form field',
    file: file('some data', 'test.bin'),
  };

  console.log('Test unsupported content/type');

  const res = post(`http://localhost:${__ENV.PORT}/v1/keys`, data);

  check(res, {
    'Should return response with status 415': (r) => r.status === 415,
  });
}
