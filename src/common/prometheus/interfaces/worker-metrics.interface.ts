type JobDurationSecondsMessage = {
  type: 'metric';
  data: {
    name: 'job_duration_seconds';
    labels: {
      job: string;
      result: string;
    };
    value: number;
  };
};

type ClApiRequestsDurationSecondsMessage = {
  type: 'metric';
  data: {
    name: 'cl_api_requests_duration_seconds';
    labels: {
      result: string;
      status: number | string;
    };
    value: number;
  };
};

type ValidatorsRegistryMessage = {
  type: 'metric';
  data: {
    name:
      | 'validators_registry_last_block_number'
      | 'validators_registry_last_update_block_timestamp'
      | 'validators_registry_last_slot';
    value: number;
  };
};

export type WorkerMetricMessage =
  | JobDurationSecondsMessage
  | ClApiRequestsDurationSecondsMessage
  | ValidatorsRegistryMessage;

function isJobDurationSecondsMessage(message: any): message is JobDurationSecondsMessage {
  return (
    message.type === 'metric' &&
    message.data &&
    message.data.name === 'job_duration_seconds' &&
    typeof message.data.value === 'number' &&
    message.data.labels &&
    typeof message.data.labels.job === 'string' &&
    typeof message.data.labels.result === 'string'
  );
}

function isClApiRequestsDurationSecondsMessage(message: any): message is ClApiRequestsDurationSecondsMessage {
  return (
    message.type === 'metric' &&
    message.data &&
    message.data.name === 'cl_api_requests_duration_seconds' &&
    typeof message.data.value === 'number' &&
    message.data.labels &&
    typeof message.data.labels.result === 'string' &&
    (typeof message.data.labels.status === 'string' || typeof message.data.labels.status === 'number')
  );
}

function isValidatorsRegistryMessage(message: any): message is ValidatorsRegistryMessage {
  return (
    message.type === 'metric' &&
    message.data &&
    [
      'validators_registry_last_block_number',
      'validators_registry_last_update_block_timestamp',
      'validators_registry_last_slot',
    ].includes(message.data.name) &&
    typeof message.data.value === 'number'
  );
}

export function isWorkerMetricMessage(message: any): message is WorkerMetricMessage {
  return (
    isJobDurationSecondsMessage(message) ||
    isClApiRequestsDurationSecondsMessage(message) ||
    isValidatorsRegistryMessage(message)
  );
}
