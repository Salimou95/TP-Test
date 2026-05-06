// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Créer des copies des balances pour ne pas les modifier
  const debtors = new Map<string, number>();
  const creditors = new Map<string, number>();
  
  // Séparer débiteurs et créanciers
  for (const [memberId, balance] of Object.entries(balances)) {
    if (balance > 0) {
      creditors.set(memberId, balance);
    } else if (balance < 0) {
      debtors.set(memberId, -balance);
    }
  }
  
  // Greedy algorithm: appareiller les débiteurs et créanciers
  while (debtors.size > 0 && creditors.size > 0) {
    // Prendre le plus grand débiteur et le plus grand créancier
    let maxDebtor = '';
    let maxDebtAmount = 0;
    for (const [memberId, amount] of debtors) {
      if (amount > maxDebtAmount) {
        maxDebtAmount = amount;
        maxDebtor = memberId;
      }
    }
    
    let maxCreditor = '';
    let maxCreditorAmount = 0;
    for (const [memberId, amount] of creditors) {
      if (amount > maxCreditorAmount) {
        maxCreditorAmount = amount;
        maxCreditor = memberId;
      }
    }
    
    if (maxDebtor === '' || maxCreditor === '') break;
    
    // Appareiller pour le montant minimum
    const settlementAmount = Math.min(maxDebtAmount, maxCreditorAmount);
    settlements.push({
      from: maxDebtor,
      to: maxCreditor,
      amount: settlementAmount,
    });
    
    // Mettre à jour les montants
    const newDebtAmount = maxDebtAmount - settlementAmount;
    if (newDebtAmount > 0.01) {
      debtors.set(maxDebtor, newDebtAmount);
    } else {
      debtors.delete(maxDebtor);
    }
    
    const newCreditorAmount = maxCreditorAmount - settlementAmount;
    if (newCreditorAmount > 0.01) {
      creditors.set(maxCreditor, newCreditorAmount);
    } else {
      creditors.delete(maxCreditor);
    }
  }
  
  return settlements;
}
