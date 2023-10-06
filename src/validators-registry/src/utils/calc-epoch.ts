import { Epoch, Slot } from '../types';
import { SLOTS_PER_EPOCH } from '../constants';

export const calcEpochBySlot = (slot: Slot): Epoch => Math.floor(slot / SLOTS_PER_EPOCH);
