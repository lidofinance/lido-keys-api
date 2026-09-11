import { PrometheusController as PrometheusControllerSource } from '@willsoto/nestjs-prometheus';
import { Controller } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@ApiExcludeController()
@SkipThrottle()
export class PrometheusController extends PrometheusControllerSource {}
