const { fetchData, baseEndpoint1, baseEndpoint2 } = require('./utils');

function deepCheckForRequiredFields(obj) {
  return (
    obj.appVersion &&
    obj.chainId &&
    (!obj.elBlockSnapshot ||
      (obj.elBlockSnapshot.blockNumber && obj.elBlockSnapshot.blockHash && obj.elBlockSnapshot.timestamp)) &&
    (!obj.clBlockSnapshot ||
      (obj.clBlockSnapshot.epoch &&
        obj.clBlockSnapshot.root &&
        obj.clBlockSnapshot.slot &&
        obj.clBlockSnapshot.blockNumber &&
        obj.clBlockSnapshot.timestamp &&
        obj.clBlockSnapshot.blockHash))
  );
}

test('Endpoints return responses with the same structure', async () => {
  const resp1 = await fetchData(`${baseEndpoint1}/v1/status`);
  const resp2 = await fetchData(`${baseEndpoint2}/v1/status`);

  expect(resp1.status).toBe(200);
  expect(resp2.status).toBe(200);

  expect(deepCheckForRequiredFields(resp1.data)).toBeTruthy();
  expect(deepCheckForRequiredFields(resp2.data)).toBeTruthy();
});
