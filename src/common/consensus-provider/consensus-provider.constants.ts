export const CONSENSUS_POOL_INTERVAL_MS = 10_000;

export const CONSENSUS_RETRY_DELAY = 1_000;
export const CONSENSUS_RETRY_ATTEMPTS = 3;
// Require a substantial timeout period due to the large volume of data being streamed from the consensus layer and subsequently written into the database
export const CONSENSUS_REQUEST_TIMEOUT = 1_320_000;
