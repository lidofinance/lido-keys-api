import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [LoggerModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
