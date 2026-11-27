// Docker HEALTHCHECK: exit 0 when GET /health answers with a 2xx status, 1 otherwise.
// 127.0.0.1, not localhost: the app listens on IPv4 only.
const port = process.env.PORT || 3000;

fetch(`http://127.0.0.1:${port}/health`).then(
  (response) => process.exit(response.ok ? 0 : 1),
  () => process.exit(1),
);
