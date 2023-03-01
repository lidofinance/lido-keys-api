import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
