import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Block } from '@ethersproject/providers';
import { CHAINS } from '@lido-nestjs/constants';
import { Injectable, Inject } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerService } from '../logger';

@Injectable()
export class ExecutionProviderService {
  constructor(
    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  /**
   * Returns network name
   */
  public async getNetworkName(): Promise<string> {
    const network = await this.provider.getNetwork();
    const name = CHAINS[network.chainId]?.toLocaleLowerCase();
    return name || network.name;
  }

  /**
   * Returns current chain id
   */
  public async getChainId(): Promise<number> {
    const { chainId } = await this.provider.getNetwork();
    return chainId;
  }

  /**
   *
   * Returns block hash
   */
  public async getBlockHash(blockHashOrBlockTag: number | string): Promise<string> {
    const block = await this.provider.getBlock(blockHashOrBlockTag);
    return block.hash;
  }

  /**
   *
   * Returns block
   */
  public async getBlock(
    blockHashOrBlockTag: number | string,
  ): Promise<{ number: number; hash: string; timestamp: number }> {
    const block = await this.provider.getBlock(blockHashOrBlockTag);
    return { number: block.number, hash: block.hash, timestamp: block.timestamp };
  }

  /**
   *
   * Returns full block info
   * null if the node doesn't know the block (e.g. a reorged block or a block it hasn't seen yet)
   */
  public async getFullBlock(blockHashOrBlockTag: number | string): Promise<Block | null> {
    const block: Block | null = await this.provider.getBlock(blockHashOrBlockTag);
    return block;
  }
}
