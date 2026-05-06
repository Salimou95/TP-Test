// src/infrastructure/pg-expense.repository.ts
//
// EXERCICE 4 — À COMPLÉTER
//
// Implémentation Postgres du ExpenseRepository.
// À tester avec Testcontainers (voir SUJET.md exercice 4).

import type { Pool } from 'pg';
import type { Expense } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: Expense): Promise<void> {
    const client = await this.pool.connect();
    try {
      const { id, groupId, description, amount, currency, paidBy, paidAt, split, category, createdAt } = expense;
      
      const query = `
        INSERT INTO expenses (
          id, group_id, description, amount, currency, paid_by, paid_at, 
          split_mode, split_data, category, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `;

      const splitData = this.serializeSplitData(split);
      
      await client.query(query, [
        id,
        groupId,
        description,
        parseFloat(amount.toFixed(2)),
        currency,
        paidBy,
        paidAt,
        split.mode,
        JSON.stringify(splitData),
        category || null,
        createdAt,
      ]);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Expense | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM expenses WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) return null;
      
      return this.rowToExpense(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM expenses WHERE group_id = $1 ORDER BY paid_at DESC';
      const result = await client.query(query, [groupId]);
      
      return result.rows.map(row => this.rowToExpense(row));
    } finally {
      client.release();
    }
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM expenses 
        WHERE group_id = $1 AND paid_at >= $2 AND paid_at <= $3
        ORDER BY paid_at DESC
      `;
      const result = await client.query(query, [groupId, from, to]);
      
      return result.rows.map(row => this.rowToExpense(row));
    } finally {
      client.release();
    }
  }

  private rowToExpense(row: any): Expense {
    return {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: new Date(row.paid_at),
      split: this.deserializeSplitData(row.split_mode, row.split_data),
      category: row.category || undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private serializeSplitData(split: any): any {
    if (split.mode === 'equal') {
      return { beneficiaries: split.beneficiaries };
    } else if (split.mode === 'weighted') {
      return { weights: split.weights };
    } else if (split.mode === 'percentage') {
      return { percentages: split.percentages };
    }
    return split;
  }

  private deserializeSplitData(mode: string, data: any): any {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (mode === 'equal') {
      return { mode: 'equal', beneficiaries: parsed.beneficiaries };
    } else if (mode === 'weighted') {
      return { mode: 'weighted', weights: parsed.weights };
    } else if (mode === 'percentage') {
      return { mode: 'percentage', percentages: parsed.percentages };
    }
    return { mode, ...parsed };
  }
}
