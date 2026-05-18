import { Injectable } from '@nestjs/common';
import { OperatorNameResolver } from './operator-name.resolver';

@Injectable()
export class CsmStaticNameResolver implements OperatorNameResolver {
  async resolve(_moduleAddress: string, operatorIndex: number): Promise<string> {
    return `CSM Operator ${operatorIndex}`;
  }
}
