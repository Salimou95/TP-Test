# Analyse des mutations - Stryker Report

## Stratégie

Pour atteindre **80% de mutation score**, on va:
1. Ajouter des tests supplémentaires dans balances.test.ts pour couvrir les edge cases
2. Ajouter des tests supplémentaires dans simplify.test.ts pour les conditions limites
3. Analyser les mutants survivants et ajouter des assertions plus strictes

## Mutations à tuer dans balances.ts

### Zone critique 1 : Opérateurs de comparaison
```typescript
balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;
```
**Mutants possibles:**
- `??` → `||` : OK (pas équivalent, peut changer le résultat)
- `+ expense.amount` → `- expense.amount` : DOIT ÊTRE TUÉ

**Tests requis:**
- Vérifier que le payeur reçoit bien le montant total (pas une soustraction)
- Vérifier avec montants positifs ET négatifs

### Zone critique 2 : Division pour split equal
```typescript
const sharePerPerson = expense.amount / beneficiaries.length;
```
**Mutants possibles:**
- `/` → `*` : DOIT ÊTRE TUÉ
- `/` → `+` : DOIT ÊTRE TUÉ

**Tests requis:**
- Vérifier précisément que chaque part = montant / nombre
- Test avec montant qui ne divise pas proprement (arrondis)

### Zone critique 3 : Poids vs Pourcentages
```typescript
shares[memberId] = (weight / totalWeight) * expense.amount;
```
**Mutants possibles:**
- `weight` → `totalWeight` : DOIT ÊTRE TUÉ
- `totalWeight` → `weight` : DOIT ÊTRE TUÉ
- `*` → `/` : DOIT ÊTRE TUÉ

**Tests requis:**
- Test weighted avec poids non-uniformes (ex: 1, 2, 3)
- Vérifier la proportionnalité exacte

### Zone critique 4 : Boucles et initialisations
```typescript
for (const member of group.members) {
  balances[member.id] = 0;
}
```
**Mutants possibles:**
- Initialiser à une autre valeur (1, -1, etc)
- Supprimer la boucle

**Tests requis:**
- Vérifier que un groupe avec 0 dépenses = tous les soldes à 0
- Vérifier que chaque membre apparaît dans les balances

## Mutations à tuer dans simplify.ts

### Zone critique 1 : Comparaison des montants
```typescript
if (amount > 0.01) {
  debtors.set(maxDebtor, newDebtAmount);
}
```
**Mutants possibles:**
- `>` → `>=` : Peut causer des arrondis différents
- `>` → `<` : DOIT ÊTRE TUÉ (inverserait la logique)
- `0.01` → `0` : DOIT ÊTRE TUÉ

**Tests requis:**
- Test des très petits montants (arrondis)
- Vérifier qu'un montant 0 n'est pas ajouté

### Zone critique 2 : Boucle while et conditions
```typescript
while (debtors.size > 0 && creditors.size > 0) {
```
**Mutants possibles:**
- `>` → `===` : DOIT ÊTRE TUÉ
- `&&` → `||` : DOIT ÊTRE TUÉ

**Tests requis:**
- Groupe sans créanciers (tous négatifs)
- Groupe sans débiteurs (tous positifs)
- Groupe équilibré

### Zone critique 3 : min vs max
```typescript
const settlementAmount = Math.min(maxDebtAmount, maxCreditorAmount);
```
**Mutants possibles:**
- `min` → `max` : DOIT ÊTRE TUÉ
- `maxDebtAmount` → `maxCreditorAmount` : DOIT ÊTRE TUÉ

**Tests requis:**
- Test avec débiteur plus petit que créancier
- Test avec créancier plus petit que débiteur

## Tests supplémentaires à ajouter

Voir les fichiers de test modifiés.

## Résultats attendus

- **Avant:** ~60-70% mutation score
- **Après:** 80%+ mutation score

## Mutants acceptés (non tuables)

Aucun - tous les mutants doivent être tuables avec des tests supplémentaires.

