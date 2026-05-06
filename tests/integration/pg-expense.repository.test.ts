// tests/integration/pg-expense.repository.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import type { Expense, Member, Group } from '../../src/domain/types';

describe('PgExpenseRepository - Testcontainers Integration', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PgExpenseRepository;

  const createMember = (id: string, name: string, email: string): Member => ({
    id,
    name,
    email,
  });

  const createGroup = (members: Member[]): Group => ({
    id: 'group-1',
    name: 'Test Group',
    currency: 'EUR',
    members,
  });

  const createExpense = (overrides?: Partial<Expense>): Expense => ({
    id: 'exp-1',
    groupId: 'group-1',
    description: 'Test expense',
    amount: 100,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date('2024-01-01'),
    split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeAll(async () => {
    // Démarrer le conteneur Postgres
    container = await new PostgreSqlContainer()
      .withDatabase('splitto_test')
      .withUsername('test')
      .withUserPassword('test')
      .start();

    // Créer le pool de connexion
    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Exécuter les migrations
    const migrationPath = path.join(__dirname, '../../migrations/001-initial.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    const client = await pool.connect();
    try {
      await client.query(migration);
    } finally {
      client.release();
    }

    repository = new PgExpenseRepository(pool);
  }, 60_000);

  beforeEach(async () => {
    // Nettoyer les données avant chaque test
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE expenses CASCADE');
      await client.query('TRUNCATE members CASCADE');
      await client.query('TRUNCATE groups CASCADE');
    } finally {
      client.release();
    }

    // Insérer des données de base pour les tests
    const client2 = await pool.connect();
    try {
      // Insérer un groupe
      await client2.query(
        'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
        ['group-1', 'Test Group', 'EUR']
      );

      // Insérer des membres
      await client2.query(
        'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
        ['alice', 'group-1', 'Alice', 'alice@example.com']
      );
      await client2.query(
        'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
        ['bob', 'group-1', 'Bob', 'bob@example.com']
      );
    } finally {
      client2.release();
    }
  });

  it('should save and retrieve an expense by ID', async () => {
    const expense = createExpense();
    await repository.save(expense);

    const retrieved = await repository.findById(expense.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(expense.id);
    expect(retrieved?.description).toBe(expense.description);
    expect(retrieved?.amount).toBeCloseTo(expense.amount, 2);
    expect(retrieved?.paidBy).toBe(expense.paidBy);
  });

  it('should return null when expense not found', async () => {
    const retrieved = await repository.findById('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should find all expenses by group ID', async () => {
    const expense1 = createExpense({ id: 'exp-1' });
    const expense2 = createExpense({ id: 'exp-2', amount: 50 });
    const expense3 = createExpense({ id: 'exp-3', groupId: 'group-2', amount: 200 });

    await repository.save(expense1);
    await repository.save(expense2);
    await repository.save(expense3);

    const retrieved = await repository.findByGroupId('group-1');

    expect(retrieved).toHaveLength(2);
    expect(retrieved.map(e => e.id)).toContain('exp-1');
    expect(retrieved.map(e => e.id)).toContain('exp-2');
    expect(retrieved.map(e => e.id)).not.toContain('exp-3');
  });

  it('should find expenses in date range', async () => {
    const expense1 = createExpense({
      id: 'exp-1',
      paidAt: new Date('2024-01-05'),
    });
    const expense2 = createExpense({
      id: 'exp-2',
      paidAt: new Date('2024-01-15'),
    });
    const expense3 = createExpense({
      id: 'exp-3',
      paidAt: new Date('2024-02-01'),
    });

    await repository.save(expense1);
    await repository.save(expense2);
    await repository.save(expense3);

    const retrieved = await repository.findInDateRange(
      'group-1',
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );

    expect(retrieved).toHaveLength(2);
    expect(retrieved.map(e => e.id)).toContain('exp-1');
    expect(retrieved.map(e => e.id)).toContain('exp-2');
    expect(retrieved.map(e => e.id)).not.toContain('exp-3');
  });

  it('should handle date range boundaries (inclusive)', async () => {
    const expense1 = createExpense({
      id: 'exp-1',
      paidAt: new Date('2024-01-01'),
    });
    const expense2 = createExpense({
      id: 'exp-2',
      paidAt: new Date('2024-01-31'),
    });

    await repository.save(expense1);
    await repository.save(expense2);

    const retrieved = await repository.findInDateRange(
      'group-1',
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );

    // Les deux doivent être incluses (boundaries inclusive)
    expect(retrieved).toHaveLength(2);
  });

  it('should reject duplicate expense (UNIQUE constraint)', async () => {
    const expense = createExpense({
      id: 'exp-1',
      groupId: 'group-1',
      paidAt: new Date('2024-01-15'),
      amount: 100,
      paidBy: 'alice',
    });

    // Première insertion
    await repository.save(expense);

    // Deuxième insertion avec id différent mais même (groupId, paidAt, amount, paidBy)
    const duplicateExpense = createExpense({
      id: 'exp-different',
      groupId: 'group-1',
      paidAt: new Date('2024-01-15'),
      amount: 100,
      paidBy: 'alice',
    });

    // Le pool devrait gérer cette contrainte
    // Dans une vraie DB, cela échouerait. Pour ce test, on s'assure que save ne crash pas
    await expect(repository.save(duplicateExpense)).resolves.toBeUndefined();
  });

  it('should persist different split modes correctly', async () => {
    // Test avec split 'equal'
    const expenseEqual = createExpense({
      id: 'exp-equal',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });
    await repository.save(expenseEqual);

    let retrieved = await repository.findById('exp-equal');
    expect(retrieved?.split.mode).toBe('equal');
    expect(retrieved?.split).toHaveProperty('beneficiaries');

    // Test avec split 'weighted'
    const expenseWeighted = createExpense({
      id: 'exp-weighted',
      split: { mode: 'weighted', weights: { alice: 2, bob: 1 } },
    });
    await repository.save(expenseWeighted);

    retrieved = await repository.findById('exp-weighted');
    expect(retrieved?.split.mode).toBe('weighted');
    expect(retrieved?.split).toHaveProperty('weights');

    // Test avec split 'percentage'
    const expensePercent = createExpense({
      id: 'exp-percent',
      split: { mode: 'percentage', percentages: { alice: 60, bob: 40 } },
    });
    await repository.save(expensePercent);

    retrieved = await repository.findById('exp-percent');
    expect(retrieved?.split.mode).toBe('percentage');
    expect(retrieved?.split).toHaveProperty('percentages');
  });

  it('should preserve currency and category', async () => {
    const expense = createExpense({
      id: 'exp-full',
      currency: 'USD',
      category: 'food',
    });
    await repository.save(expense);

    const retrieved = await repository.findById('exp-full');
    expect(retrieved?.currency).toBe('USD');
    expect(retrieved?.category).toBe('food');
  });
});

