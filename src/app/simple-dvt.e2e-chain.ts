import { createSDK, nse } from 'nse-test';

jest.setTimeout(100_000);

describe('Simple DVT', () => {
  let sdk: nse.SDK;
  let session: nse.Session;
  let initialState: nse.StoryResult<'simple-dvt-mock/initial-state'>;
  beforeAll(async () => {
    sdk = await createSDK('http://localhost:8001');

    session = await sdk.env.hardhat({});
    initialState = await session.story('simple-dvt-mock/initial-state', {});
  });

  test('initial state created', () => {
    console.log(initialState);
  });
});
