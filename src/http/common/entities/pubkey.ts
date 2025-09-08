import { IsPubkey } from 'common/decorators/isPubkey';

export class Pubkey {
  @IsPubkey()
  pubkey!: string;
}
