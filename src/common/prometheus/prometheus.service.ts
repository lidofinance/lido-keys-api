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
    labelNames: ['name', 'version', 'env'],
  });

  public elRpcRequestDuration = this.getOrCreateMetric('Histogram', {
    name: 'el_rpc_requests_duration_seconds',
    help: 'EL RPC request duration',
    buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5],
    labelNames: ['result'],
  });

  public elRpcErrors = this.getOrCreateMetric('Counter', {
    name: 'el_rpc_requests_errors_total',
    help: 'Number of EL RPC requests errors',
  });

  public jobDuration = this.getOrCreateMetric('Histogram', {
    prefix: true,
    name: 'job_duration_seconds',
    help: 'Job execution duration',
    buckets: [0.2, 0.6, 1, 2, 3, 5, 8, 13, 30, 60],
    labelNames: ['result', 'job'],
  });

  public registryLastUpdate = this.getOrCreateMetric('Gauge', {
    prefix: true,
    name: 'registry_last_update_timestamp',
    help: 'Registry last update timestamp',
    labelNames: [],
  });
}
