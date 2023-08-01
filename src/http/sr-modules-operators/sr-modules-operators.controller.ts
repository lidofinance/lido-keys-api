import { Controller, Get, Version, Param, HttpStatus, NotFoundException, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { ModuleId } from 'http/common/entities/';
import { SRModulesOperatorsService } from './sr-modules-operators.service';
import { OperatorIdParam } from 'http/common/entities/operator-id-param';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { IsolationLevel } from '@mikro-orm/core';

@Controller('/')
@ApiTags('operators')
export class SRModulesOperatorsController {
  constructor(
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
  async get(@Res() reply?: FastifyReply) {
    await this.entityManager.transactional(
      async () => {
        const { operatorsGeneratorsByModules, meta } = await this.srModulesOperators.getAll();

        const jsonStream = JSONStream.stringify('{ "meta": ' + JSON.stringify(meta) + ', "data": [', ',', ']}');

        reply && reply.type('application/json').send(jsonStream);

        for (const { operatorsGenerator, module } of operatorsGeneratorsByModules) {
          const operatorsData = { module, operators: [] as any[] };

          for await (const operatorsBatch of operatorsGenerator) {
            operatorsData.operators.push(operatorsBatch);
          }

          jsonStream.write(operatorsData);
        }

        jsonStream.end();
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
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
    await this.entityManager.transactional(
      async () => {
        const { operatorsGenerator, module, meta } = await this.srModulesOperators.getByModule(moduleId);

        const jsonStream = JSONStream.stringify(
          '{ "meta": ' + JSON.stringify(meta) + ', "data": { "module": ' + JSON.stringify(module) + ', "operators": [',
          ',',
          ']}}',
        );

        reply && reply.type('application/json').send(jsonStream);

        for await (const operatorsBatch of operatorsGenerator) {
          jsonStream.write(operatorsBatch);
        }

        jsonStream.end();
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
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
