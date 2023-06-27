import http from "k6/http";
import { check } from "k6";
import { describe } from 'https://jslib.k6.io/expect/0.0.4/index.js';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

// Test configuration
export const options = {
  duration: "60s",
  vus: 8 
};

export default function () {
  describe('Test unsupported content/type', () => {
    const fd = new FormData();
    fd.append('text', http.file('test', 'test.txt', 'text/plain'));

    const params = {
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + fd.boundary
      },
    };

    let res = http.post("http://localhost:3000/v1/keys", fd.body(), params);    
    
    check(res, {
      'is status 415': (r) => r.status === 415,
    });
  })
}