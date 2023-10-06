import { QueryOrderMap } from '@mikro-orm/core';

export type FindOptions<T> = {
  orderBy?: QueryOrderMap<T>;
};
