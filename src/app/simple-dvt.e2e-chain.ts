import { createSDK, SDK, StoryResult } from 'nse-test';

jest.setTimeout(100_000);

describe('Simple DVT', () => {
  // TODO: move to nse
  let sdk: SDK;
  // TODO: get story type
  // let initialState: StoryResult<'std/accounts'>;
  let initialState: any;
  beforeAll(async () => {
    sdk = await createSDK('http://localhost:8001');

    const { port } = await sdk.env.hardhat({});
    initialState = await sdk.story('simple-dvt-mock/initial-state', {
      sessionKey: port,
    });
  });

  test('initial state created', () => {
    console.log(initialState);
  });
});
