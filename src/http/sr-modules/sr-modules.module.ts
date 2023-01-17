import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { SRModulesController } from './sr-modules.controller';
import { SRModulesService } from './sr-modules.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesController],
  providers: [SRModulesService],
})
export class SRModulesModule {}
