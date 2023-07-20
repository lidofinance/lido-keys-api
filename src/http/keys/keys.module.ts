import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { StakingRouterModule } from 'staking-router-modules';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [LoggerModule, StakingRouterModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
