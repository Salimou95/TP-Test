// tests/unit/balances.test.ts - Tests unitaires de computeBalances()
import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

const createGroup = (members: Array<{ id: string; name: string; email: string }> = []): Group => ({
  id: 'group-1',
  name: 'Test Group',
  currency: 'EUR',
  members: members.map(m => ({ ...m })),
});

const createExpense = (overrides?: Partial<Expense>): Expense => ({
  id: 'exp-1',
  groupId: 'group-1',
  description: 'Test expense',
  amount: 100,
  currency: 'EUR',
  paidBy: 'alice',
  paidAt: new Date('2024-01-01'),
  split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('computeBalances', () => {
  // Test 1: Groupe vide → tous les soldes sont 0
  it('should return empty object for group with no expenses', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
    ]);
    const expenses: Expense[] = [];

    const balances = computeBalances(group, expenses);

    expect(balances).toEqual({
      alice: 0,
      bob: 0,
    });
  });

  // Test 2: Une dépense 'equal' entre 3 personnes (le payeur inclus)
  it('should split equal expense among 3 people including payer', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 90,
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Alice paie 90, devrait recevoir 30 × 2 = 60 de Bob et Charlie
    // Alice: 90 - 30 (sa part) = 60 (créditrice)
    // Bob: -30 (débiteur)
    // Charlie: -30 (débiteur)
    expect(balances.alice).toBeCloseTo(60, 2);
    expect(balances.bob).toBeCloseTo(-30, 2);
    expect(balances.charlie).toBeCloseTo(-30, 2);
    expect(balances.alice + balances.bob + balances.charlie).toBeCloseTo(0, 2);
  });

  // Test 3: Une dépense 'equal' entre 3 personnes (le payeur PAS bénéficiaire)
  it('should split equal expense when payer is not beneficiary', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 60,
        split: { mode: 'equal', beneficiaries: ['bob', 'charlie'] },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Alice paie 60 pour Bob et Charlie
    // Alice: 60 (créditrice)
    // Bob: -30 (débiteur)
    // Charlie: -30 (débiteur)
    expect(balances.alice).toBeCloseTo(60, 2);
    expect(balances.bob).toBeCloseTo(-30, 2);
    expect(balances.charlie).toBeCloseTo(-30, 2);
    expect(balances.alice + balances.bob + balances.charlie).toBeCloseTo(0, 2);
  });

  // Test 4: Plusieurs dépenses qui se compensent partiellement
  it('should handle multiple expenses with partial compensation', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 100,
        split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
      }),
      createExpense({
        id: 'exp-2',
        paidBy: 'bob',
        amount: 30,
        split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Exp1: Alice paie 100 pour 2 → Alice: +50, Bob: -50
    // Exp2: Bob paie 30 pour 2 → Bob: +15, Alice: -15
    // Total: Alice: 50 - 15 = 35, Bob: -50 + 15 = -35
    expect(balances.alice).toBeCloseTo(35, 2);
    expect(balances.bob).toBeCloseTo(-35, 2);
    expect(balances.alice + balances.bob).toBeCloseTo(0, 2);
  });

  // Test 5: Une dépense 'weighted' avec poids non-uniformes
  it('should handle weighted split', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 100,
        split: { mode: 'weighted', weights: { alice: 1, bob: 2, charlie: 2 } },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Total weights = 5
    // Alice: 100/5 = 20
    // Bob: 200/5 = 40
    // Charlie: 200/5 = 40
    // Alice paie 100 et doit recevoir 20 → 80 créditrice
    expect(balances.alice).toBeCloseTo(80, 2);
    expect(balances.bob).toBeCloseTo(-40, 2);
    expect(balances.charlie).toBeCloseTo(-40, 2);
    expect(balances.alice + balances.bob + balances.charlie).toBeCloseTo(0, 2);
  });

  // Test 6: Une dépense 'percentage' avec arrondis
  it('should handle percentage split with rounding', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 100,
        split: { mode: 'percentage', percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 } },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Alice paie 100, sa part = 33.33 → 66.67 créditrice
    // Bob part = 33.33 → -33.33
    // Charlie part = 33.34 → -33.34
    expect(balances.alice).toBeCloseTo(66.67, 1);
    expect(balances.bob).toBeCloseTo(-33.33, 1);
    expect(balances.charlie).toBeCloseTo(-33.34, 1);
    // La somme doit être très proche de 0
    expect(Math.abs(balances.alice + balances.bob + balances.charlie)).toBeLessThan(0.01);
  });

  // Test 7: Dépense d'un seul membre avec lui-même comme bénéficiaire
  it('should handle single member beneficiary', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
    ]);
    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'alice',
        amount: 50,
        split: { mode: 'equal', beneficiaries: ['alice'] },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Alice paie pour elle-même → solde 0
    expect(balances.alice).toBeCloseTo(0, 2);
  });

  // Test 8: Grand nombre de membres
  it('should handle many members', () => {
    const memberCount = 10;
    const members = Array.from({ length: memberCount }, (_, i) => ({
      id: `member-${i}`,
      name: `Member ${i}`,
      email: `member${i}@example.com`,
    }));
    const group = createGroup(members);
    const beneficiaryIds = members.map(m => m.id);

    const expenses = [
      createExpense({
        id: 'exp-1',
        paidBy: 'member-0',
        amount: 1000,
        split: { mode: 'equal', beneficiaries: beneficiaryIds },
      }),
    ];

    const balances = computeBalances(group, expenses);

    // Chaque membre doit 100, sauf le payeur qui est créditeur de 900
    expect(balances['member-0']).toBeCloseTo(900, 2);
    for (let i = 1; i < memberCount; i++) {
      expect(balances[`member-${i}`]).toBeCloseTo(-100, 2);
    }
  });

  // Test 9: La somme des balances doit être ≈ 0
  it('should ensure sum of balances is approximately zero', () => {
    const group = createGroup([
      { id: 'alice', name: 'Alice', email: 'alice@example.com' },
      { id: 'bob', name: 'Bob', email: 'bob@example.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' },
    ]);
    const expenses = [
      createExpense({ id: 'exp-1', paidBy: 'alice', amount: 150, split: { mode: 'equal', beneficiaries: ['alice', 'bob'] } }),
      createExpense({ id: 'exp-2', paidBy: 'bob', amount: 200, split: { mode: 'weighted', weights: { alice: 2, bob: 1, charlie: 1 } } }),
      createExpense({ id: 'exp-3', paidBy: 'charlie', amount: 75, split: { mode: 'percentage', percentages: { alice: 50, bob: 25, charlie: 25 } } }),
    ];

    const balances = computeBalances(group, expenses);
    const sum = Object.values(balances).reduce((acc, val) => acc + val, 0);

    expect(Math.abs(sum)).toBeLessThan(0.01);
  });
});

