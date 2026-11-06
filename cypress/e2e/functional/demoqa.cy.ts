import { activeSites } from '../../../config/sites';
import { DemoQaHomePage } from '../../support/pages/demoqa/HomePage';

if (activeSites().some((s) => s.id === 'demoqa')) {
  describe('DemoQA - smoke', () => {
    const home = new DemoQaHomePage();

    it('home page shows all six category cards', () => {
      home.open();
      home.expectLoaded();
      home.expectCategoryCount(6);
    });

    it('Elements card opens the Elements section', () => {
      home.open();
      home.openCard('Elements');
      home.expectUrlMatches(/\/elements$/);
    });

    it('Forms card opens the Forms section', () => {
      home.open();
      home.openCard('Forms');
      home.expectUrlMatches(/\/forms$/);
    });
  });
}
