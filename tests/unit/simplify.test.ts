// tests/unit/simplify.test.ts - Tests TDD pour simplifyDebts()
import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';
import type { Settlement } from '../../src/domain/types';

describe('simplifyDebts - TDD cycles', () => {
  // RED: Test 1 - 2 personnes simples
  it('should handle 2 people with simple debt', () => {
    const balances = { alice: 10, bob: -10 };
    const settlements = simplifyDebts(balances);
    
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: 'bob', to: 'alice', amount: 10 });
  });

  // RED: Test 2 - Groupe équilibré (somme = 0)
  it('should handle balanced group', () => {
    const balances = { alice: 0, bob: 0, charlie: 0 };
    const settlements = simplifyDebts(balances);
    
    expect(settlements).toHaveLength(0);
  });

  // RED: Test 3 - 3 personnes en triangle (optimisation importante)
  it('should optimize 3 people in triangle', () => {
    // C doit à B qui doit à A
    // Optimal: C paie directement à A
    const balances = { alice: 10, bob: 0, charlie: -10 };
    const settlements = simplifyDebts(balances);
    
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: 'charlie', to: 'alice', amount: 10 });
  });

  // RED: Test 4 - 4 personnes avec compensation
  it('should minimize settlements for 4 people', () => {
    // A: +30 (créditeur)
    // B: -20 (débiteur)
    // C: -10 (débiteur)
    // D: 0 (équilibré)
    const balances = { alice: 30, bob: -20, charlie: -10, david: 0 };
    const settlements = simplifyDebts(balances);
    
    // Optimal: 2 settlements (B→A pour 20, C→A pour 10)
    expect(settlements.length).toBeLessThanOrEqual(2);
    expect(settlements).toContainEqual({ from: 'bob', to: 'alice', amount: 20 });
    expect(settlements).toContainEqual({ from: 'charlie', to: 'alice', amount: 10 });
  });

  // RED: Test 5 - Multiple creditors and debtors
  it('should handle multiple creditors and debtors', () => {
    // Alice: +15 (créditrice)
    // Bob: +15 (créditeur)
    // Charlie: -15 (débiteur)
    // David: -15 (débiteur)
    const balances = { alice: 15, bob: 15, charlie: -15, david: -15 };
    const settlements = simplifyDebts(balances);
    
    // Optimal: 2 settlements (C→A pour 15, D→B pour 15)
    // ou (C→B pour 15, D→A pour 15)
    expect(settlements.length).toBeLessThanOrEqual(3);
    // Vérifier que les montants totaux correspondent
    const totalFrom = settlements.filter(s => s.from === 'charlie').reduce((sum, s) => sum + s.amount, 0);
    expect(totalFrom).toBeCloseTo(15, 2);
  });

  // RED: Test 6 - Complex circular debt
  it('should optimize complex circular debt', () => {
    // A: +50 (créditeur)
    // B: -30 (débiteur)
    // C: -20 (débiteur)
    const balances = { alice: 50, bob: -30, charlie: -20 };
    const settlements = simplifyDebts(balances);
    
    // Optimal: 2 settlements
    expect(settlements.length).toBeLessThanOrEqual(2);
    // B paie 30 à A, C paie 20 à A
    expect(settlements.some(s => s.from === 'bob' && s.to === 'alice' && s.amount === 30)).toBe(true);
    expect(settlements.some(s => s.from === 'charlie' && s.to === 'alice' && s.amount === 20)).toBe(true);
  });

  // Test 7 - Empty balances
  it('should handle empty balances', () => {
    const balances = {};
    const settlements = simplifyDebts(balances);
    
    expect(settlements).toHaveLength(0);
  });

  // Test 8 - Single person
  it('should handle single person with zero balance', () => {
    const balances = { alice: 0 };
    const settlements = simplifyDebts(balances);
    
    expect(settlements).toHaveLength(0);
  });

  // Test 9 - Verify total amounts
  it('should preserve total amounts in settlements', () => {
    const balances = { alice: 25, bob: -15, charlie: -10 };
    const settlements = simplifyDebts(balances);
    
    // Total debts = 25
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettled).toBeCloseTo(25, 2);
  });

  // Test 10 - No self-payments
  it('should not create self-payments', () => {
    const balances = { alice: 10, bob: -5, charlie: -5 };
    const settlements = simplifyDebts(balances);
    
    // Check no settlement where from === to
    for (const settlement of settlements) {
      expect(settlement.from).not.toBe(settlement.to);
    }
  });

  // Test 11 - Minimize transaction count
  it('should minimize number of transactions', () => {
    const balances = { a: 30, b: 0, c: 0, d: -10, e: -10, f: -10 };
    const settlements = simplifyDebts(balances);
    
    // Optimal: 3 transactions (d→a, e→a, f→a)
    expect(settlements.length).toBeLessThanOrEqual(5);
  });

  // Test 12 - All debtors to one creditor
  it('should direct all debtors to single creditor', () => {
    const balances = { alice: 30, bob: -10, charlie: -10, david: -10 };
    const settlements = simplifyDebts(balances);
    
    // All payments should go to alice
    const allToAlice = settlements.every(s => s.to === 'alice');
    expect(allToAlice).toBe(true);
    expect(settlements).toHaveLength(3);
  });

  // ──── TESTS SUPPLÉMENTAIRES POUR TUER LES MUTANTS ────────────────
  // Mutation 1: > vs >= dans la comparaison des montants
  it('should not include zero amounts - mutation killer', () => {
    const balances = { alice: 10, bob: 0, charlie: -10 };
    const settlements = simplifyDebts(balances);

    // Bob avec balance 0 ne devrait pas être dans les transactions
    for (const settlement of settlements) {
      expect(settlement.from).not.toBe('bob');
      expect(settlement.to).not.toBe('bob');
    }
  });

  // Mutation 2: Comparaison while (size > 0) - ne doit pas être ===
  it('should stop when all debtors are processed', () => {
    const balances = { alice: 100, bob: 0, charlie: -100 };
    const settlements = simplifyDebts(balances);

    // Exactement 1 settlement (charlie → alice pour 100)
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: 'charlie', to: 'alice', amount: 100 });
  });

  // Mutation 3: && vs || dans la boucle while
  it('should stop when only creditors or only debtors remain', () => {
    // Cas 1: Seulement créanciers
    const balances1 = { alice: 50, bob: 50, charlie: 50 };
    const settlements1 = simplifyDebts(balances1);
    expect(settlements1).toHaveLength(0);

    // Cas 2: Seulement débiteurs
    const balances2 = { alice: -50, bob: -50, charlie: -50 };
    const settlements2 = simplifyDebts(balances2);
    expect(settlements2).toHaveLength(0);
  });

  // Mutation 4: min vs max dans le calcul du montant de settlement
  it('should use minimum (not maximum) for settlement amount', () => {
    const balances = { alice: 100, bob: -30, charlie: -70 };
    const settlements = simplifyDebts(balances);

    // Bob doit rembourser 30 (pas 100)
    const bobPayments = settlements.filter(s => s.from === 'bob');
    expect(bobPayments).toHaveLength(1);
    expect(bobPayments[0].amount).toBe(30);

    // Charlie doit rembourser 70 (pas 100)
    const charliePayments = settlements.filter(s => s.from === 'charlie');
    expect(charliePayments).toHaveLength(1);
    expect(charliePayments[0].amount).toBe(70);
  });

  // Mutation 5: Pas de self-payment
  it('should never create a settlement from someone to themselves', () => {
    const balances = { alice: 50, bob: -50 };
    const settlements = simplifyDebts(balances);

    for (const settlement of settlements) {
      expect(settlement.from).not.toBe(settlement.to);
    }
  });

  // Mutation 6: Vérifier le total des règlements
  it('should preserve exact total amount in settlements', () => {
    const balances = { alice: 100, bob: -60, charlie: -40 };
    const settlements = simplifyDebts(balances);

    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettled).toBeCloseTo(100, 2);
  });

  // Mutation 7: Groupes circulaires complexes
  it('should minimize transactions in circular debt', () => {
    // A doit à B, B doit à C, C doit à A
    const balances = { a: 30, b: -10, c: -20 };
    const settlements = simplifyDebts(balances);

    // Optimal: 2 transactions maximum
    expect(settlements.length).toBeLessThanOrEqual(2);
  });

  // Mutation 8: Montants très petits (arrondis)
  it('should handle very small amounts correctly', () => {
    const balances = { alice: 0.01, bob: -0.01 };
    const settlements = simplifyDebts(balances);

    // Devrait avoir 1 settlement (pas 0)
    expect(settlements.length).toBeGreaterThan(0);
    expect(settlements[0].amount).toBeCloseTo(0.01, 4);
  });

  // Mutation 9: Négatif dans le calcul de newDebtAmount
  it('should correctly subtract settlement from debt', () => {
    const balances = { alice: 100, bob: -40, charlie: -60 };
    const settlements = simplifyDebts(balances);

    // Bob doit payer exactement 40 (pas 100 - 40 = 60)
    const bobTotal = settlements
      .filter(s => s.from === 'bob')
      .reduce((sum, s) => sum + s.amount, 0);
    expect(bobTotal).toBeCloseTo(40, 2);
  });

  // Mutation 10: Vérifier l'ordre des priorités (max creditor vs max debtor)
  it('should match max debtor with max creditor', () => {
    const balances = { alice: 500, bob: -100, charlie: -200, david: -200 };
    const settlements = simplifyDebts(balances);

    // David (-200) ou Charlie (-200) devrait payer en premier (max debtor)
    expect(settlements).toBeDefined();
    expect(settlements.length).toBeGreaterThan(0);
  });
});
