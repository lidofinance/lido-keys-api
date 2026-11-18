import { PrometheusController as PrometheusControllerSource } from '@willsoto/nestjs-prometheus';
import { Controller } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipCache } from 'common/decorators/skipCache';
import { NoStore } from 'common/decorators/noStore';
import { SkipThrottle } from '@nestjs/throttler';

// A scrape must see the current values: SkipCache for the in-process cache, NoStore for any cache in front.
@Controller()
@ApiExcludeController()
@SkipCache()
@NoStore()
@SkipThrottle()
export class PrometheusController extends PrometheusControllerSource {}
