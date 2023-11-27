import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';

@Injectable()
export class RegistryStorageService implements OnModuleDestroy {
  constructor(private readonly orm: MikroORM) {}

  async onModuleDestroy(): Promise<void> {
    await this.orm.close();
  }
}
