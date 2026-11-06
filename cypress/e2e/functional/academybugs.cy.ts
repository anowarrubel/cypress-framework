import { activeSites } from '../../../config/sites';
import { AcademyBugsHomePage } from '../../support/pages/academybugs/HomePage';

if (activeSites().some((s) => s.id === 'academybugs')) {
  describe('Academy Bugs - smoke', () => {
    const home = new AcademyBugsHomePage();

    it('home page shows the bug examples and main navigation', () => {
      home.open();
      home.expectLoaded();
    });

    it('Find Bugs link opens the Find Bugs page', () => {
      home.open();
      home.openFindBugs();
      home.expectUrlMatches(/\/find-bugs\/?$/);
    });
  });
}
