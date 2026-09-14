import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { FetchModuleOptions, FetchService, RequestInfo } from '@lido-nestjs/fetch';
import { MiddlewareService } from '@lido-nestjs/middleware';
import { AbortController } from 'node-abort-controller';
import { Headers, RequestInit, Response } from 'node-fetch';
import { CONSENSUS_REQUEST_TIMEOUT } from './consensus-provider.constants';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { APP_NAME, APP_VERSION } from '../../app/app.constants';

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
   * Adds timeout and User-Agent to the source method of fetch service
   */
  protected async request(url: RequestInfo, init?: RequestInit, attempt = 0) {
    const controller = new AbortController();
    const { signal } = controller;

    setTimeout(() => {
      controller.abort();
    }, CONSENSUS_REQUEST_TIMEOUT);

    // So providers can attribute the traffic. Headers handles every HeadersInit shape a caller
    // may have passed in init.
    const headers = new Headers(init?.headers);
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', `${APP_NAME}/${APP_VERSION}`);
    }

    return super.request(url, { ...init, signal, headers }, attempt);
  }
}
