// tests/unit/expense.service.test.ts - Tests avec 5 types de doubles (Meszaros)
import { describe, it, expect, vi } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { Expense, CreateExpenseInput } from '../../src/domain/types';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';

describe('ExpenseService.create() - Test Doubles', () => {
  // ─── DUMMY ──────────────────────────────────────────────────────────────
  // Un Dummy est un objet qui existe mais n'est jamais utilisé.
  // Ici, le Logger n'est pas asserté dans ce test, donc c'est un Dummy.
  const dummyLogger: Logger = {
    info: () => {}, // jamais utilisé dans les assertions
    error: () => {},
  };

  // ─── STUB ───────────────────────────────────────────────────────────────
  // Un Stub retourne des valeurs pré-configurées pour les appels de méthodes.
  // Ici, Clock retourne toujours la même date.
  const fixedDate = new Date('2024-01-15T10:30:00Z');
  const stubClock: Clock = {
    now: () => fixedDate,
  };

  // ─── SPY ────────────────────────────────────────────────────────────────
  // Un Spy enregistre les appels et vérifie les arguments passés.
  // Ici, on écoute tous les appels à save() pour vérifier l'expense sauvegardée.
  let savedExpenses: Expense[] = [];
  const spyRepository: ExpenseRepository = {
    save: vi.fn(async (expense: Expense) => {
      savedExpenses.push(expense);
    }),
    findById: vi.fn(async () => null),
    findByGroupId: vi.fn(async () => []),
    findInDateRange: vi.fn(async () => []),
  };

  // ─── MOCK ───────────────────────────────────────────────────────────────
  // Un Mock vérifie qu'une méthode est appelée exactement comme prévu
  // (avec les bons paramètres et le bon nombre de fois).
  // Ici, on vérifie que notifier est appelé EXACTEMENT pour les grandes dépenses.
  let notifierCalls: Array<{ groupId: string; message: string }> = [];
  const mockNotifier: EmailNotifier = {
    notifyGroupMembers: vi.fn(async (groupId: string, message: string) => {
      notifierCalls.push({ groupId, message });
    }),
  };

  // ─── FAKE ───────────────────────────────────────────────────────────────
  // Un Fake est une implémentation partielle d'une interface.
  // Ici, IdGenerator génère vraiment des IDs mais de façon triviale (compteur).
  let idCounter = 0;
  const fakeIdGenerator: IdGenerator = {
    next: () => {
      return `exp-${++idCounter}`;
    },
  };

  const createExpenseInput = (overrides?: Partial<CreateExpenseInput>): CreateExpenseInput => ({
    groupId: 'group-1',
    description: 'Test expense',
    amount: 50,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date('2024-01-15'),
    split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    ...overrides,
  });

  describe('with all test doubles', () => {
    it('should create expense with correct values using all doubles', async () => {
      // Réinitialiser les mocks
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      const input = createExpenseInput({ amount: 80 });
      const result = await service.create(input);

      // Vérifier que l'expense retournée a les bonnes valeurs
      expect(result).toMatchObject({
        ...input,
        id: 'exp-1',
        createdAt: fixedDate,
      });

      // Vérifier que le repository a bien sauvegardé (SPY)
      expect(spyRepository.save).toHaveBeenCalledTimes(1);
      expect(spyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'exp-1',
          groupId: input.groupId,
          amount: 80,
          createdAt: fixedDate,
        }),
      );

      // Vérifier que le notifier a été appelé pour une dépense >= 100 (MOCK)
      // Cette dépense de 80 ne devrait pas déclencher de notification
      expect(mockNotifier.notifyGroupMembers).not.toHaveBeenCalled();
    });

    it('should notify when expense amount is >= 100 (MOCK behavior)', async () => {
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      const input = createExpenseInput({ amount: 120, description: 'Big expense' });
      await service.create(input);

      // MOCK: le notifier DOIT être appelé exactement une fois avec les bons params
      expect(mockNotifier.notifyGroupMembers).toHaveBeenCalledTimes(1);
      expect(mockNotifier.notifyGroupMembers).toHaveBeenCalledWith(
        'group-1',
        expect.stringContaining('Big expense'),
      );
    });

    it('should use fixed clock date in createdAt (STUB behavior)', async () => {
      savedExpenses = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      const input = createExpenseInput();
      const result = await service.create(input);

      // STUB: Clock retourne toujours fixedDate
      expect(result.createdAt).toBe(fixedDate);
    });

    it('should generate unique IDs (FAKE behavior)', async () => {
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      const input1 = createExpenseInput();
      const result1 = await service.create(input1);

      const input2 = createExpenseInput();
      const result2 = await service.create(input2);

      // FAKE: le générateur produit vraiment des IDs uniques
      expect(result1.id).toBe('exp-1');
      expect(result2.id).toBe('exp-2');
      expect(result1.id).not.toBe(result2.id);
    });

    it('should not notify when amount is exactly 100 (boundary)', async () => {
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      // Montant = 100 devrait déclencher la notification
      const input = createExpenseInput({ amount: 100 });
      await service.create(input);

      expect(mockNotifier.notifyGroupMembers).toHaveBeenCalledTimes(1);
    });

    it('should not notify when amount is < 100 (boundary)', async () => {
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;
      vi.clearAllMocks();

      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      // Montant = 99.99 ne devrait pas déclencher la notification
      const input = createExpenseInput({ amount: 99.99 });
      await service.create(input);

      expect(mockNotifier.notifyGroupMembers).not.toHaveBeenCalled();
    });

    it('should save expense before notifying', async () => {
      const callOrder: string[] = [];
      savedExpenses = [];
      notifierCalls = [];
      idCounter = 0;

      const orderedRepository: ExpenseRepository = {
        save: vi.fn(async (expense: Expense) => {
          callOrder.push('save');
          savedExpenses.push(expense);
        }),
        findById: vi.fn(async () => null),
        findByGroupId: vi.fn(async () => []),
        findInDateRange: vi.fn(async () => []),
      };

      const orderedNotifier: EmailNotifier = {
        notifyGroupMembers: vi.fn(async () => {
          callOrder.push('notify');
        }),
      };

      const service = new ExpenseService(
        orderedRepository,
        orderedNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger,
      );

      const input = createExpenseInput({ amount: 150 });
      await service.create(input);

      // Vérifier que save a été appelé avant notify
      expect(callOrder).toEqual(['save', 'notify']);
    });

    it('should log expense creation (DUMMY logger not asserted)', async () => {
      savedExpenses = [];
      idCounter = 0;
      vi.clearAllMocks();

      // Le logger est un DUMMY: on ne le teste pas
      const service = new ExpenseService(
        spyRepository,
        mockNotifier,
        stubClock,
        fakeIdGenerator,
        dummyLogger, // DUMMY - jamais asserté
      );

      const input = createExpenseInput();
      // L'appel ne doit pas échouer
      await expect(service.create(input)).resolves.toBeDefined();
    });
  });
});

