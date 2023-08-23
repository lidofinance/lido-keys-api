import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { StakingRouterModule } from '../../staking-router-modules';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [
    LoggerModule,
    // TODO: dont like to add here such a lot of dependencies
    // for example we add here also deps for reading from blockchain
    // but use only methods for reading data from db
    StakingRouterModule.forFeatureAsync(),
  ],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
