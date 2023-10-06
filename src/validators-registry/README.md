# Validators registry Module

NestJS Validators registry Module for Lido Finance projects.
Part of [Lido NestJS Modules](https://github.com/lidofinance/lido-nestjs-modules/#readme)

## Install

```bash
yarn add @lido-nestjs/validators-registry
```

## Interface

Package exports `ValidatorsRegistry` that implements the following interface:

```typescript
export interface ValidatorsRegistryInterface {
    /**
     * Update internal state of validators in the registry to the Consensus Layer (CL) state
     * according to `blockId`.
     *
     * @param {BlockId} blockId - Values: 'head', 'genesis', 'finalized', <slot>, <hex encoded blockRoot with 0x prefix>
     *
     * If the registry internal state is newer or the same to the CL state - does nothing.
     */
    update(blockId: BlockId): Promise<ConsensusMeta>;

    /**
     * Get Metadata from registry internal state
     */
    getMeta(): Promise<ConsensusMeta | null>;

    /**
     * Get Validators and metadata from registry internal state
     */
    getValidators(
        pubkeys?: string[],
        where?: FilterQuery<ConsensusValidatorEntity>,
        options?: FindOptions<ConsensusValidatorEntity>,
    ): Promise<ConsensusValidatorsAndMetadata>;
}
```

## Usage 

```typescript
// my.module.ts
import { Module } from '@nestjs/common';
import {
    StorageModule,
    ValidatorsRegistryModule,
} from '@lido-nestjs/validators-registry';
import { ConsensusModule } from '@lido-nestjs/consensus';
import { FetchModule } from '@lido-nestjs/fetch';
import { MyService } from './my.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
    imports: [
        MikroOrmModule.forRoot({
            dbName: ':memory:',
            type: 'sqlite',
            entities: [...StorageModule.entities], // optional
            migrations: {
                /* migrations data */
            },
        }),
        FetchModule.forRoot({
            baseUrls: ['http://consensus-node:4001'],
        }),
        ConsensusModule.forRoot(),
        ValidatorsRegistryModule.forFeature(),
    ],
    providers: [MyService],
    exports: [MyService],
})
export class MyModule {}



// my.service.ts
import { Injectable } from '@nestjs/common';
import { ValidatorsRegistryInterface } from '@lido-nestjs/validators-registry';

@Injectable()
export class MyService {
    public constructor(
        private readonly validatorsRegistry: ValidatorsRegistryInterface,
    ) {}

    public async myMethod() {
        await this.validatorsRegistry.update('finalized');

        const metaAndValidators = await this.validatorsRegistry.getValidators();

        return metaAndValidators;
    }
}
```

## Migrations

Database migrations are placed in `./src/migrations/` folder.

Please DO NOT edit migrations, if you want to change the migration,
please make another one with the needed database schema transitions.
