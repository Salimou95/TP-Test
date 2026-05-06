// src/domain/balances.ts — calcul des soldes d'un groupe
//
// EXERCICE 1 — À COMPLÉTER
//
// Spec : voir SUJET.md, exercice 1
//
// Cette fonction est PURE : pas d'effets de bord, pas d'I/O.
// Elle prend un groupe et ses dépenses, retourne les soldes.

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  // Initialiser tous les soldes à 0
  const balances: Balances = {};
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  // Traiter chaque dépense
  for (const expense of expenses) {
    // Le payeur augmente son solde du montant total
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;

    // Calculer les parts selon le mode de split
    let shares: Record<string, number> = {};

    if (expense.split.mode === 'equal') {
      // Répartition égale
      const beneficiaries = expense.split.beneficiaries;
      const sharePerPerson = expense.amount / beneficiaries.length;
      for (const beneficiary of beneficiaries) {
        shares[beneficiary] = sharePerPerson;
      }
    } else if (expense.split.mode === 'weighted') {
      // Répartition pondérée
      const weights = expense.split.weights;
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      for (const [memberId, weight] of Object.entries(weights)) {
        shares[memberId] = (weight / totalWeight) * expense.amount;
      }
    } else if (expense.split.mode === 'percentage') {
      // Répartition en pourcentages
      const percentages = expense.split.percentages;
      for (const [memberId, percentage] of Object.entries(percentages)) {
        shares[memberId] = (percentage / 100) * expense.amount;
      }
    }

    // Soustraire les parts des bénéficiaires
    for (const [memberId, share] of Object.entries(shares)) {
      balances[memberId] = (balances[memberId] ?? 0) - share;
    }
  }

  return balances;
}
