import { PrometheusController as PrometheusControllerSource } from '@willsoto/nestjs-prometheus';
import { Controller } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipCache } from 'common/decorators/skipCache';

// SkipCache: a scrape must see the current values, and the same flag routes the no-store
// Cache-Control header here.
@Controller()
@ApiExcludeController()
@SkipCache()
export class PrometheusController extends PrometheusControllerSource {}
