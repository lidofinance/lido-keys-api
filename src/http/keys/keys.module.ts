import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { StakingRouterModule } from 'staking-router-modules';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule, StakingRouterModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
