import { Injectable } from '@nestjs/common';

@Injectable()
export class ModuleTypeRegistry {
  private byAddress = new Map<string, string>();

  set(moduleAddress: string, type: string): void {
    this.byAddress.set(moduleAddress.toLowerCase(), type);
  }

  get(moduleAddress: string): string | undefined {
    return this.byAddress.get(moduleAddress.toLowerCase());
  }
}
