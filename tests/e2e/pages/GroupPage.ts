// tests/e2e/pages/GroupPage.ts - Page Object pour la page d'un groupe
import type { Page } from '@playwright/test';

export class GroupPage {
  constructor(private page: Page) {}

  async goto(groupId: string) {
    await this.page.goto(`/group/${groupId}`);
  }

  async getGroupName() {
    return this.page.getByRole('heading', { level: 1 }).textContent();
  }

  async clickAddExpenseButton() {
    await this.page.getByRole('button', { name: /ajouter une dépense|add expense|nouvelle dépense/i }).click();
  }

  async getBalancesPanel() {
    return this.page.locator('[data-testid="balances-panel"]');
  }

  async getMemberBalance(memberName: string) {
    const row = this.page.locator(`[data-testid="balance-${memberName}"]`);
    const text = await row.textContent();
    // Extraire le nombre du texte "Alice: 20€" ou similaire
    const match = text?.match(/([-+]?\d+(?:,\d+|\.\d+)?)/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  async getSettlementsPanel() {
    return this.page.locator('[data-testid="settlements-panel"]');
  }

  async clickSettleButton(index: number = 0) {
    const buttons = await this.page.getByRole('button', { name: /régler|settle/i });
    await buttons.nth(index).click();
  }

  async waitForBalancesLoaded() {
    await this.page.waitForSelector('[data-testid="balances-panel"]', { state: 'attached' });
  }

  async getExpensesList() {
    return this.page.locator('[data-testid="expenses-list"]');
  }
}

