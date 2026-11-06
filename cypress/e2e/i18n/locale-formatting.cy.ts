// Not tied to any site: shows how to check locale-sensitive formatting in the
// browser the tests run in, which is where it matters.
describe('Locale formatting in the browser', () => {
  const amount = 1234567.89;

  const cases = [
    { locale: 'en-US', number: '1,234,567.89', currency: '$1,234,567.89' },
    { locale: 'de-DE', number: '1.234.567,89', currency: '1.234.567,89 €' },
    { locale: 'fr-FR', number: '1 234 567,89', currency: '1 234 567,89 €' },
  ];

  for (const { locale, number, currency } of cases) {
    it(`${locale} formats numbers and currency`, () => {
      cy.window().then((win) => {
        const code = new win.Intl.NumberFormat(locale, { style: 'currency', currency: locale === 'en-US' ? 'USD' : 'EUR' });
        expect(new win.Intl.NumberFormat(locale).format(amount)).to.equal(number);
        expect(code.format(amount)).to.equal(currency);
      });
    });
  }

  it('Arabic locale resolves to right-to-left text', () => {
    cy.window().then((win) => {
      const info = new win.Intl.Locale('ar-SA') as Intl.Locale & { textInfo?: { direction: string }; getTextInfo?: () => { direction: string } };
      const direction = (info.getTextInfo?.() ?? info.textInfo)?.direction;
      // Not every browser exposes textInfo yet; when it does, it must say rtl.
      if (direction) expect(direction).to.equal('rtl');
    });
  });
});
