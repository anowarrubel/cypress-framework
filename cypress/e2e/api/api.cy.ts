import { activeSites } from '../../../config/sites';
import { label, urlFor } from '../../support/run';

// Plain HTTP calls, no page involved, so one browser is enough.
for (const site of activeSites().filter((s) => s.api)) {
  const api = site.api!;
  const maxMs = api.maxResponseMs ?? 3000;

  describe(`API - ${label(site)}`, { browser: '!firefox' }, () => {
    for (const endpoint of api.endpoints) {
      it(endpoint.title, () => {
        cy.request({
          method: endpoint.method ?? 'GET',
          url: urlFor(site, `${api.basePath ?? ''}${endpoint.path}`),
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status, 'HTTP status').to.equal(endpoint.status);
          expect(String(res.headers['content-type'] ?? ''), 'content type').to.contain('application/json');
          expect(res.duration, `took ${res.duration} ms`).to.be.lessThan(maxMs);

          for (const key of endpoint.keys ?? []) {
            expect(res.body, `response has "${key}"`).to.have.property(key);
          }

          if (endpoint.list) {
            const { arrayAt, itemKeys, minItems = 1 } = endpoint.list;
            const items = arrayAt ? res.body[arrayAt] : res.body;
            expect(Array.isArray(items), `${arrayAt || 'response'} is a list`).to.equal(true);
            expect(items.length, 'number of items').to.be.at.least(minItems);
            for (const item of items) {
              for (const key of itemKeys) expect(item, `item has "${key}"`).to.have.property(key);
            }
          }
        });
      });
    }
  });
}
