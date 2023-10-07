import { Injectable } from '@nestjs/common';
import { FetchModuleOptions, FetchService, RequestInfo } from '@lido-nestjs/fetch';
import { MiddlewareService } from '@lido-nestjs/middleware';
import { AbortController } from 'node-abort-controller';
import { RequestInit, Response } from 'node-fetch';
import { CONSENSUS_REQUEST_TIMEOUT } from './consensus-provider.constants';

@Injectable()
export class ConsensusFetchService extends FetchService {
  constructor(options: FetchModuleOptions, middlewareService: MiddlewareService<Promise<Response>>) {
    super(options, middlewareService);
  }

  /**
   * Adds timeout to the source method of fetch service
   */
  protected async request(url: RequestInfo, init?: RequestInit, attempt = 0) {
    const controller = new AbortController();
    const { signal } = controller;

    // setTimeout(() => {
    //   console.log('time to abort');
    //   controller.abort();
    // }, 5*CONSENSUS_REQUEST_TIMEOUT);

    return super.request(url, { ...init, signal }, attempt);
  }
}
