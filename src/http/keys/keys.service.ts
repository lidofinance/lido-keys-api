import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { FIELDS, Key, KeysResponse } from './entities';
import { RegistryKey } from '@lido-nestjs/registry';
import { RegistryService } from 'jobs/registry.service';

// import { MikroORM } from '@mikro-orm/core';
// import { ConfigService } from 'common/config';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    private keyRegistryService: RegistryService, // private configService: ConfigService
  ) {}

  // нужно указать конфигурации micro orm  ниже в entitymanager
  // при старте апишки в appModule уже инициализируется microorm ,
  // что происходит во время инициализации ?
  // как дальше репы для каждой сущности исп  orm = await MikroORM.init

  // private entityManager = new EntityManager();

  // const orm = await MikroORM.init({
  //       dbName: this.configService.get('DB_NAME'),
  //       host: this.configService.get('DB_HOST'),
  //       port: this.configService.get('DB_PORT'),
  //       user: this.configService.get('DB_USERNAME'),
  //       password: this.configService.get('DB_PASSWORD'),
  //       type: 'postgresql',
  //     }
  // );

  async getAll(fields: string[]): Promise<KeysResponse> {
    // add transaction

    // const { registryKeys, meta } = await this.entityManager.transactional(async () => {
    const registryKeys = await this.keyRegistryService.getAllKeysFromStorage();
    const meta = await this.keyRegistryService.getMetaDataFromStorage();

    //   return { registryKeys, meta };
    // });

    const withSignature = fields.includes(FIELDS.SIGNATURE);
    const keys = registryKeys.map((key) => this.transformKey(key, withSignature));

    return {
      // swagger ui не справляется с выводом всех значений
      // стоит ли добавить пагинацию ? на основе бд или на основе работы с данными в памяти
      data: keys,
      meta: {
        blockNumber: meta.blockNumber,
        blockHash: meta.blockHash,
      },
    };
  }

  async getByPubKeys(fields: string[], pubkeys: string[]): Promise<KeysResponse> {
    // add transaction

    // const { registryKeys, meta } = await this.entityManager.transactional(async () => {
    const registryKeys = await this.keyRegistryService.getOperatorKeys(pubkeys);
    const meta = await this.keyRegistryService.getMetaDataFromStorage();

    //   return { registryKeys, meta };
    // });

    const withSignature = fields.includes(FIELDS.SIGNATURE);

    const keys = registryKeys.map((key) => this.transformKey(key, withSignature));

    return {
      data: keys,
      meta: {
        blockNumber: meta.blockNumber,
        blockHash: meta.blockHash,
      },
    };
  }

  private transformKey(registryKey: RegistryKey, withSignature: boolean): Key {
    if (withSignature) {
      return { key: registryKey.key, depositSignature: registryKey.depositSignature };
    }
    return { key: registryKey.key };
  }
}
