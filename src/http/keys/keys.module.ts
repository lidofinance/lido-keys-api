import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  // TODO: transfer the desired method from KeysUpdateModule
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
