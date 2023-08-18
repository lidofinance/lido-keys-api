import * as avro from 'avsc';
import type { FastifyReply } from 'fastify';
import {
  Controller,
  Get,
  Version,
  Param,
  HttpStatus,
  NotFoundException,
  Res,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { EntityManager } from '@mikro-orm/postgresql';
import { ModuleId } from 'http/common/entities/';
import { SRModulesOperatorsService } from './sr-modules-operators.service';
import { OperatorIdParam } from 'http/common/entities/operator-id-param';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';
import { IsolationLevel } from '@mikro-orm/core';
import { moduleOperatorsTypeV1 } from 'staking-router-modules/schemas/operator.schema';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';

@Controller('/')
@ApiTags('operators')
export class SRModulesOperatorsController {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly srModulesOperators: SRModulesOperatorsService,
    protected readonly entityManager: EntityManager,
  ) {}

  @Version('1')
  @ApiOperation({ summary: 'Get operators for all modules grouped by staking router module.' })
  @ApiResponse({
    status: 200,
    description: 'Operators for all modules grouped by staking router module.',
    type: () => GroupedByModuleOperatorListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @Get('/operators')
  get() {
    return this.srModulesOperators.getAll();
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operators.' })
  @ApiResponse({
    status: 200,
    description: 'List of all SR module operators',
    type: SRModuleOperatorListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  @Get('modules/:module_id/operators')
  async getModuleOperators(@Param('module_id') moduleId: ModuleId, @Res() reply?: FastifyReply) {
    const encoder = new avro.streams.BlockEncoder(moduleOperatorsTypeV1);

    function write(data: any) {
      const end = new Promise((resolve) => {
        if (!encoder.write(data)) {
          encoder.once('drain', () => resolve(true));
        } else {
          process.nextTick(() => resolve(true));
        }
      });

      return end;
    }

    await this.entityManager.transactional(
      async () => {
        const { meta, module, operatorsStream } = await this.srModulesOperators.getByModule(moduleId);

        await write({
          meta: meta.elBlockSnapshot,
          module,
          operator: null,
        });

        try {
          for await (const operator of operatorsStream) {
            await write({
              meta: null,
              module: null,
              operator,
            });
          }
        } catch (error) {
          this.logger.error('Error while streaming operators', { error });
        } finally {
          encoder.end();
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );

    reply && reply.type('application/octet-stream').send(encoder);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operator.' })
  @ApiResponse({
    status: 200,
    description: 'SR module operator',
    type: SRModuleOperatorResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  @Get('modules/:module_id/operators/:operator_id')
  // here should be validaton
  getModuleOperator(@Param('module_id') moduleId: ModuleId, @Param() operator: OperatorIdParam) {
    return this.srModulesOperators.getModuleOperator(moduleId, operator.operator_id);
  }
}
