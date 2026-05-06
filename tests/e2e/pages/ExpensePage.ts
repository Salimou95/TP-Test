// tests/e2e/pages/ExpensePage.ts - Page Object pour le formulaire de dépense
import type { Page } from '@playwright/test';

export class ExpensePage {
  constructor(private page: Page) {}

  async goto(groupId: string) {
    await this.page.goto(`/group/${groupId}/expense/new`);
  }

  async fillDescription(description: string) {
    await this.page.getByLabel(/description/i).fill(description);
  }

  async fillAmount(amount: string) {
    await this.page.getByLabel(/montant|amount/i).fill(amount);
  }

  async selectPaidBy(memberName: string) {
    await this.page.getByLabel(/payé par|paid by/i).selectOption(memberName);
  }

  async selectSplitMode(mode: 'equal' | 'weighted' | 'percentage') {
    await this.page.getByLabel(/répartition|mode|split/i).selectOption(mode);
  }

  async setBeneficiaries(memberNames: string[]) {
    for (const name of memberNames) {
      await this.page.getByLabel(new RegExp(name, 'i')).check();
    }
  }

  async submitForm() {
    await this.page.getByRole('button', { name: /valider|créer|créer dépense/i }).click();
  }

  async getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]').textContent();
  }

  async waitForSuccess() {
    await this.page.waitForURL(/\/group\//, { waitUntil: 'networkidle' });
  }
}

