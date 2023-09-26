export default {
  engine: {
    port: 8001,
  },
  commands: {
    test: 'jest --config  jest-e2e-onchain.json',
  },
  plugins: ['simple-dvt-v1'],
};
