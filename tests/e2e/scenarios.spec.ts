// tests/e2e/scenarios.spec.ts - 4 scénarios E2E avec Page Object Model
import { test, expect, Page } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { GroupPage } from './pages/GroupPage';
import { ExpensePage } from './pages/ExpensePage';

test.describe('Splitto E2E Scenarios', () => {
  let page: Page;
  let dashboard: DashboardPage;
  let groupPage: GroupPage;
  let expensePage: ExpensePage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Réinitialiser l'application avant chaque test
    try {
      await page.request.post('http://localhost:3000/_test/reset');
    } catch (e) {
      // _test/reset peut ne pas exister
    }

    dashboard = new DashboardPage(page);
    groupPage = new GroupPage(page);
    expensePage = new ExpensePage(page);

    await dashboard.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────
  // Scénario 1 : Créer un groupe avec 3 membres
  // ────────────────────────────────────────────────────────────────
  test('Scenario 1: Create group with 3 members', async () => {
    // Étape 1: Cliquer sur "Créer un groupe"
    await dashboard.clickCreateGroupButton();
    
    // Étape 2: Attendre que le formulaire soit chargé
    await page.waitForSelector('[data-testid="group-form"]');
    
    // Étape 3: Remplir le nom du groupe
    await page.getByLabel(/nom du groupe|group name/i).fill('Trip to Rome');
    
    // Étape 4: Ajouter les 3 membres
    const memberButton = page.getByRole('button', { name: /ajouter un membre|add member/i }).first();
    
    // Membre 1
    await memberButton.click();
    await page.getByLabel(/nom du membre|member name/i).first().fill('Alice');
    await page.getByLabel(/email/i).first().fill('alice@example.com');
    
    // Membre 2
    await memberButton.click();
    const nameInputs = page.getByLabel(/nom du membre|member name/i);
    await nameInputs.nth(1).fill('Bob');
    const emailInputs = page.getByLabel(/email/i);
    await emailInputs.nth(1).fill('bob@example.com');
    
    // Membre 3
    await memberButton.click();
    await nameInputs.nth(2).fill('Charlie');
    await emailInputs.nth(2).fill('charlie@example.com');
    
    // Étape 5: Soumettre le formulaire
    await page.getByRole('button', { name: /créer le groupe|create group/i }).click();
    
    // Étape 6: Vérifier que le groupe apparaît dans la liste
    await dashboard.waitForGroupsLoaded();
    expect(await dashboard.hasGroup('Trip to Rome')).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────
  // Scénario 2 : Ajouter une dépense dans un groupe
  // ────────────────────────────────────────────────────────────────
  test('Scenario 2: Add expense to group', async () => {
    // Pré-requis: Créer un groupe avec membres
    await dashboard.clickCreateGroupButton();
    await page.waitForSelector('[data-testid="group-form"]');
    await page.getByLabel(/nom du groupe|group name/i).fill('Weekend Trip');
    
    const memberButton = page.getByRole('button', { name: /ajouter un membre|add member/i }).first();
    await memberButton.click();
    await page.getByLabel(/nom du membre|member name/i).first().fill('Alice');
    await page.getByLabel(/email/i).first().fill('alice@example.com');
    
    await memberButton.click();
    const nameInputs = page.getByLabel(/nom du membre|member name/i);
    await nameInputs.nth(1).fill('Bob');
    const emailInputs = page.getByLabel(/email/i);
    await emailInputs.nth(1).fill('bob@example.com');
    
    await page.getByRole('button', { name: /créer le groupe|create group/i }).click();
    await dashboard.waitForGroupsLoaded();
    
    // Naviguer vers le groupe
    await dashboard.clickGroup('Weekend Trip');
    await groupPage.waitForBalancesLoaded();
    
    // Ajouter une dépense
    await groupPage.clickAddExpenseButton();
    await page.waitForSelector('[data-testid="expense-form"]');
    
    await expensePage.fillDescription('Restaurant dinner');
    await expensePage.fillAmount('60');
    await expensePage.selectPaidBy('Alice');
    await expensePage.selectSplitMode('equal');
    await expensePage.setBeneficiaries(['Alice', 'Bob']);
    
    await expensePage.submitForm();
    await expensePage.waitForSuccess();
    
    // Vérifier que la dépense apparaît dans la liste
    const expensesList = await groupPage.getExpensesList();
    const expenseText = await expensesList.textContent();
    expect(expenseText).toContain('Restaurant dinner');
  });

  // ────────────────────────────────────────────────────────────────
  // Scénario 3 : Voir les soldes mis à jour après une dépense
  // ────────────────────────────────────────────────────────────────
  test('Scenario 3: Balances updated after expense', async () => {
    // Pré-requis: Créer un groupe et ajouter une dépense de 30€
    // payée par Alice pour 3 personnes
    await dashboard.clickCreateGroupButton();
    await page.waitForSelector('[data-testid="group-form"]');
    await page.getByLabel(/nom du groupe|group name/i).fill('House Bills');
    
    const memberButton = page.getByRole('button', { name: /ajouter un membre|add member/i }).first();
    
    for (let i = 0; i < 3; i++) {
      await memberButton.click();
    }
    
    const nameInputs = page.getByLabel(/nom du membre|member name/i);
    const emailInputs = page.getByLabel(/email/i);
    
    await nameInputs.nth(0).fill('Alice');
    await emailInputs.nth(0).fill('alice@example.com');
    await nameInputs.nth(1).fill('Bob');
    await emailInputs.nth(1).fill('bob@example.com');
    await nameInputs.nth(2).fill('Charlie');
    await emailInputs.nth(2).fill('charlie@example.com');
    
    await page.getByRole('button', { name: /créer le groupe|create group/i }).click();
    await dashboard.waitForGroupsLoaded();
    
    // Aller dans le groupe et ajouter la dépense
    await dashboard.clickGroup('House Bills');
    await groupPage.waitForBalancesLoaded();
    
    await groupPage.clickAddExpenseButton();
    await page.waitForSelector('[data-testid="expense-form"]');
    
    await expensePage.fillDescription('Utilities');
    await expensePage.fillAmount('30');
    await expensePage.selectPaidBy('Alice');
    await expensePage.selectSplitMode('equal');
    await expensePage.setBeneficiaries(['Alice', 'Bob', 'Charlie']);
    
    await expensePage.submitForm();
    await expensePage.waitForSuccess();
    
    // Vérifier les soldes
    await groupPage.waitForBalancesLoaded();
    
    const aliceBalance = await groupPage.getMemberBalance('Alice');
    const bobBalance = await groupPage.getMemberBalance('Bob');
    const charlieBalance = await groupPage.getMemberBalance('Charlie');
    
    // Alice paie 30€ pour 3 → Alice +20€, Bob -10€, Charlie -10€
    expect(aliceBalance).toBeCloseTo(20, 0);
    expect(bobBalance).toBeCloseTo(-10, 0);
    expect(charlieBalance).toBeCloseTo(-10, 0);
  });

  // ────────────────────────────────────────────────────────────────
  // Scénario 4 : Marquer un settlement comme réglé
  // ────────────────────────────────────────────────────────────────
  test('Scenario 4: Mark settlement as resolved', async () => {
    // Pré-requis: Créer un groupe avec une dépense pour avoir un settlement
    await dashboard.clickCreateGroupButton();
    await page.waitForSelector('[data-testid="group-form"]');
    await page.getByLabel(/nom du groupe|group name/i).fill('Final Trip');
    
    const memberButton = page.getByRole('button', { name: /ajouter un membre|add member/i }).first();
    
    for (let i = 0; i < 2; i++) {
      await memberButton.click();
    }
    
    const nameInputs = page.getByLabel(/nom du membre|member name/i);
    const emailInputs = page.getByLabel(/email/i);
    
    await nameInputs.nth(0).fill('Alice');
    await emailInputs.nth(0).fill('alice@example.com');
    await nameInputs.nth(1).fill('Bob');
    await emailInputs.nth(1).fill('bob@example.com');
    
    await page.getByRole('button', { name: /créer le groupe|create group/i }).click();
    await dashboard.waitForGroupsLoaded();
    
    // Aller dans le groupe et ajouter une dépense
    await dashboard.clickGroup('Final Trip');
    await groupPage.waitForBalancesLoaded();
    
    await groupPage.clickAddExpenseButton();
    await page.waitForSelector('[data-testid="expense-form"]');
    
    await expensePage.fillDescription('Taxi');
    await expensePage.fillAmount('50');
    await expensePage.selectPaidBy('Alice');
    await expensePage.selectSplitMode('equal');
    await expensePage.setBeneficiaries(['Alice', 'Bob']);
    
    await expensePage.submitForm();
    await expensePage.waitForSuccess();
    
    // Attendre les settlements
    await groupPage.waitForBalancesLoaded();
    const settlementsPanel = await groupPage.getSettlementsPanel();
    await settlementsPanel.waitFor({ state: 'attached' });
    
    // Cliquer sur le bouton "Régler"
    await groupPage.clickSettleButton(0);
    
    // Confirmer l'action (si un dialog existe)
    const confirmButton = page.getByRole('button', { name: /confirmer|oui|validate|ok/i });
    const isVisible = await confirmButton.isVisible().catch(() => false);
    if (isVisible) {
      await confirmButton.click();
    }
    
    // Vérifier que le settlement a disparu de la liste
    const settlementsCount = await page.locator('[data-testid="settlement-item"]').count();
    expect(settlementsCount).toBe(0);
  });
});

