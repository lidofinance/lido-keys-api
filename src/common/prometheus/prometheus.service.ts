import { getOrCreateMetric } from '@willsoto/nestjs-prometheus';
import { Options, Metrics, Metric } from './interfaces';
import { METRICS_PREFIX } from './prometheus.constants';

export class PrometheusService {
  protected prefix = METRICS_PREFIX;

  protected getOrCreateMetric<T extends Metrics, L extends string>(type: T, options: Options<L>): Metric<T, L> {
    const prefixedName = options.prefix ? this.prefix + options.name : options.name;

    return getOrCreateMetric(type, {
      ...options,
      name: prefixedName,
    }) as Metric<T, L>;
  }

  public httpRequestDuration = this.getOrCreateMetric('Histogram', {
    prefix: false,
    name: 'http_requests_duration_seconds',
    help: 'Duration of http requests',
    buckets: [0.01, 0.1, 0.2, 0.5, 1, 1.5, 2, 5],
    labelNames: ['statusCode', 'method'],
  });

  public buildInfo = this.getOrCreateMetric('Gauge', {
    prefix: false,
    name: 'build_info',
    help: 'Build information',
    labelNames: ['name', 'version', 'env', 'network'],
  });

  public elRpcRequestDuration = this.getOrCreateMetric('Histogram', {
    name: 'el_rpc_requests_duration_seconds',
    help: 'EL RPC request duration',
    buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5],
    labelNames: ['result'],
  });

  public clApiRequestDuration = this.getOrCreateMetric('Histogram', {
    prefix: false,
    name: 'cl_api_requests_duration_seconds',
    help: 'CL API request duration',
    buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5, 10],
    labelNames: ['result', 'status'],
  });

  public jobDuration = this.getOrCreateMetric('Histogram', {
    prefix: true,
    name: 'job_duration_seconds',
    help: 'Job execution duration',
    buckets: [0.2, 0.6, 1, 2, 3, 5, 8, 13, 30, 60, 120, 180],
    labelNames: ['result', 'job'],
  });

  public registryLastUpdate = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'last_update_timestamp',
    help: 'Block timestamp for which the last update was made.',
  });

  public validatorsRegistryLastTimestampUpdate = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'validators_registry_last_update_block_timestamp',
    help: 'Block timestamp for which the last ValidatorsRegistry update was made.',
  });

  public registryNumberOfKeysBySRModuleAndOperator = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'keys_by_sr_module_and_operator',
    help: 'Amount of keys by sr module and operator id',
    labelNames: ['operator', 'srModuleId', 'used'],
  });

  public registryNonce = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'nonce_value',
    help: 'Nonce of Staking Router module  during last update',
    labelNames: ['srModuleId'],
  });

  public registryBlockNumber = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'last_block_number',
    help: 'Block number for which the last update was made.',
  });

  public validatorsRegistryLastBlockNumber = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'validators_registry_last_block_number',
    help: 'Block number for which the last ValidatorsRegistry update was made.',
  });

  public validatorsRegistryLastSlot = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'validators_registry_last_slot',
    help: 'Slot for which the last ValidatorsRegistry update was made.',
  });

  public validatorsEnabled = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'validators_registry_enabled',
    help: 'Validators registry is enabled',
  });
}
