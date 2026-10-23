import { Operator } from './operator';
import { csmOperatorOne, operatorOneCurated } from '../../db.fixtures';

describe('Operator', () => {
  it('should keep a positive totalWithdrawnKeys', () => {
    const operator = new Operator({ ...csmOperatorOne, totalWithdrawnKeys: 5 });
    expect(operator.totalWithdrawnKeys).toBe(5);
  });

  it('should keep a genuine 0 totalWithdrawnKeys and not turn it into null', () => {
    const operator = new Operator({ ...csmOperatorOne, totalWithdrawnKeys: 0 });
    expect(operator.totalWithdrawnKeys).toBe(0);
    expect(JSON.parse(JSON.stringify(operator)).totalWithdrawnKeys).toBe(0);
  });

  it('should return null when totalWithdrawnKeys is undefined', () => {
    const operator = new Operator({ ...operatorOneCurated, totalWithdrawnKeys: undefined });
    expect(operator.totalWithdrawnKeys).toBeNull();
    expect(JSON.parse(JSON.stringify(operator))).toHaveProperty('totalWithdrawnKeys', null);
  });

  it('should return null when totalWithdrawnKeys is NULL in DB', () => {
    // the DB column is nullable, so a curated (NOR) row comes back with null
    const operator = new Operator({ ...operatorOneCurated, totalWithdrawnKeys: null as unknown as undefined });
    expect(operator.totalWithdrawnKeys).toBeNull();
    expect(JSON.parse(JSON.stringify(operator))).toHaveProperty('totalWithdrawnKeys', null);
  });
});
