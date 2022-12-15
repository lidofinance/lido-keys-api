import { ApiProperty } from '@nestjs/swagger';
import { StakingRouterModule } from './staking-router-module';

export class StakingRouterModuleResponse {
  @ApiProperty({
    type: () => [StakingRouterModule],
  })
  data: StakingRouterModule[];
}
