const {parseReportSortQuery} = require('../../app/libs/queryOperations');

describe('Parsing report sort query tests', () => {
  test('PatientId, biopsyName, and diagnosis', () => {
    const sortQuery = 'patientId:asc,biopsyName:desc,diagnosis:asc';

    const results = parseReportSortQuery(sortQuery);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    expect(results.shift()).toEqual(['patientId', 'asc']);
    expect(results.shift()).toEqual(['biopsyName', 'desc']);

    const [rest] = results;
    rest.shift();

    expect(rest).toEqual(['diagnosis', 'asc']);
  });

  test('Physician, state, caseType', () => {
    const sortQuery = 'physician:asc,state:asc,caseType:desc';

    const results = parseReportSortQuery(sortQuery);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);

    const rest = results.shift();
    rest.shift();

    expect(rest).toEqual(['physician', 'asc']);
    expect(results.shift()).toEqual(['state', 'asc']);

    const [rest2] = results;
    rest2.shift();

    expect(rest2).toEqual(['caseType', 'desc']);
  });

  test('AlternateIdentifier', () => {
    const sortQuery = 'alternateIdentifier:desc';

    const results = parseReportSortQuery(sortQuery);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);

    expect(results.shift()).toEqual(['alternateIdentifier', 'desc']);
  });
});
