import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { FetchModuleOptions, FetchService, RequestInfo } from '@catalist-nestjs/fetch';
import { MiddlewareService } from '@catalist-nestjs/middleware';
import { AbortController } from 'node-abort-controller';
import { RequestInit, Response } from 'node-fetch';
import { CONSENSUS_REQUEST_TIMEOUT } from './consensus-provider.constants';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';

@Injectable()
export class ConsensusFetchService extends FetchService {
  constructor(
    options: FetchModuleOptions,
    middlewareService: MiddlewareService<Promise<Response>>,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(options, middlewareService);
  }

  /**
   * Adds timeout to the source method of fetch service
   */
  protected async request(url: RequestInfo, init?: RequestInit, attempt = 0) {
    const controller = new AbortController();
    const { signal } = controller;

    setTimeout(() => {
      controller.abort();
    }, CONSENSUS_REQUEST_TIMEOUT);

    return super.request(url, { ...init, signal }, attempt);
  }
}
