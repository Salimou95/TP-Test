// tests/e2e/pages/DashboardPage.ts - Page Object pour la page d'accueil
import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async clickCreateGroupButton() {
    await this.page.getByRole('button', { name: /créer un groupe|create group|nouveau groupe/i }).click();
  }

  async getGroupsList() {
    return this.page.locator('[data-testid="groups-list"]');
  }

  async clickGroup(groupName: string) {
    await this.page.getByRole('link', { name: groupName }).click();
  }

  async hasGroup(groupName: string) {
    const element = this.page.getByText(groupName);
    return element.isVisible();
  }

  async waitForGroupsLoaded() {
    await this.page.waitForSelector('[data-testid="groups-list"]', { state: 'attached' });
  }
}

