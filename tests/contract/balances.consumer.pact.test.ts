// tests/contract/balances.consumer.pact.test.ts
import { describe, it, beforeAll, afterAll } from 'vitest';
import { PactV3 } from '@pact-foundation/pact';
import { expect } from 'vitest';

describe('Balances Consumer Pact', () => {
  const pact = new PactV3({
    consumer: 'splitto-frontend',
    provider: 'splitto-api',
    dir: './pacts',
  });

  beforeAll(() => {
    return pact.setup();
  });

  afterAll(() => {
    return pact.finalize();
  });

  describe('GET /api/groups/:id/balances', () => {
    it('should return balances when group exists', async () => {
      // Définir l'interaction attendue
      await pact
        .addInteraction()
        .given('group-1 has 3 members and 2 expenses')
        .uponReceiving('a request for group balances')
        .withRequest('GET', '/api/groups/group-1/balances')
        .willRespondWith(200, (builder) => {
          builder
            .jsonBody({
              balances: {
                alice: expect.any(Number),
                bob: expect.any(Number),
                charlie: expect.any(Number),
              },
            });
        });

      // Faire la requête
      const response = await fetch(
        `${pact.mockServerUrl}/api/groups/group-1/balances`
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('balances');
      expect(typeof body.balances.alice).toBe('number');
      expect(typeof body.balances.bob).toBe('number');
      expect(typeof body.balances.charlie).toBe('number');
    });

    it('should return 404 when group does not exist', async () => {
      // Définir l'interaction attendue
      await pact
        .addInteraction()
        .given('no group with id inexistant')
        .uponReceiving('a request for non-existent group balances')
        .withRequest('GET', '/api/groups/inexistant/balances')
        .willRespondWith(404, (builder) => {
          builder.jsonBody({
            error: expect.stringMatching(/not found|does not exist/i),
          });
        });

      // Faire la requête
      const response = await fetch(
        `${pact.mockServerUrl}/api/groups/inexistant/balances`
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('should return balances with correct structure', async () => {
      await pact
        .addInteraction()
        .given('group-1 has 3 members and 2 expenses')
        .uponReceiving('a request for group balances with full structure')
        .withRequest('GET', '/api/groups/group-1/balances')
        .willRespondWith(200, (builder) => {
          builder.jsonBody({
            balances: {
              alice: expect.any(Number),
              bob: expect.any(Number),
              charlie: expect.any(Number),
            },
            groupId: expect.stringMatching(/group-/),
            timestamp: expect.any(Number),
          });
        });

      const response = await fetch(
        `${pact.mockServerUrl}/api/groups/group-1/balances`
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.balances).toBeDefined();
      expect(body.groupId).toBeDefined();
    });
  });
});

