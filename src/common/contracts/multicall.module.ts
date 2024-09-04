import { Module } from '@nestjs/common';
import { MulticallService } from './multicall.service';

@Module({
  providers: [MulticallService],
  exports: [MulticallService],
})
export class MulticallModule {}
