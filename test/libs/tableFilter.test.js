const {Op} = require('sequelize');
const tableFilter = require('../../app/libs/tableFilter');

describe('tableFilter tests with missing or invalid options', () => {
  test('Does not mutate opts when the query property is not set', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(opts).toEqual({where: {}});
  });

  test('Does not mutate opts when there is no valid column mapping', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {wrongCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(opts).toEqual({where: {}});
  });
});

describe('Basic tableFilter tests with no boolean operators', () => {
  test('Adds a where clause when the table is null', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {mapCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(typeof (opts.where)).toBe('object');
    expect(opts.where).toHaveProperty('$actualCol$');
    expect(opts).toEqual({where: {$actualCol$: {[Op.eq]: '90'}}});
  });

  test('Adds a where clause when the table is defined', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: 'table1'},
    };

    const req = {query: {mapCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(typeof (opts.where)).toBe('object');
    expect(opts.where).toHaveProperty(['$table1.actualCol$']);
    expect(opts).toEqual({where: {'$table1.actualCol$': {[Op.eq]: '90'}}});
  });
});

describe('tableFilter tests with boolean operators', () => {
  test('Adds a where clause with an AND operator when the table is null', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {mapCol: 'notEqual:90&&notEqual:91'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(typeof (opts.where)).toBe('object');
    expect(opts.where).toHaveProperty([Op.and]);
    expect(opts).toEqual({
      where: {
        [Op.and]: [{
          $actualCol$: {[Op.ne]: '90'},
        },
        {
          $actualCol$: {[Op.ne]: '91'},
        }],
      },
    });
  });

  test('Adds a where clause with an OR operator when the table is defined', () => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: 'table1'},
    };

    const req = {query: {mapCol: 'equals:90||equals:91'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    expect(typeof (opts.where)).toBe('object');
    expect(opts.where).toHaveProperty([Op.or]);
    expect(opts).toEqual({
      where: {
        [Op.or]: [{
          '$table1.actualCol$': {[Op.eq]: '90'},
        },
        {
          '$table1.actualCol$': {[Op.eq]: '91'},
        }],
      },
    });
  });
});
