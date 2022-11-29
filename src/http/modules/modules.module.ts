import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  imports: [LoggerModule],
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
