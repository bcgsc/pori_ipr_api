const {assert} = require('chai');
const {Op} = require('sequelize');
const tableFilter = require('../../app/libs/tableFilter');

describe('tableFilter tests with missing or invalid options', () => {
  it('Does not mutate opts when the query property is not set', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isEmpty(opts.where);
    assert.deepEqual(opts, {where: {}});

    done();
  });

  it('Does not mutate opts when there is no valid column mapping', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {wrongCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isEmpty(opts.where);
    assert.deepEqual(opts, {where: {}});

    done();
  });
});

describe('Basic tableFilter tests with no boolean operators', () => {
  it('Adds a where clause when the table is null', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {mapCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isObject(opts.where);
    assert.property(opts.where, '$actualCol$');
    assert.isNotEmpty(opts.where);
    assert.deepEqual(opts, {where: {$actualCol$: {[Op.eq]: 90}}});

    done();
  });

  it('Adds a where clause when the table is defined', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: 'table1'},
    };

    const req = {query: {mapCol: 'equals:90'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isObject(opts.where);
    assert.property(opts.where, '$table1.actualCol$');
    assert.isNotEmpty(opts.where);
    assert.deepEqual(opts, {where: {'$table1.actualCol$': {[Op.eq]: 90}}});

    done();
  });
});

describe('tableFilter tests with boolean operators', () => {
  it('Adds a where clause with an AND operator when the table is null', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: null},
    };

    const req = {query: {mapCol: 'notEqual:90&&notEqual:91'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isObject(opts.where);
    assert.property(opts.where, Op.and);
    assert.deepEqual(opts, {
      where: {
        [Op.and]: [{
          $actualCol$: {[Op.neq]: 90},
        },
        {
          $actualCol$: {[Op.neq]: 91},
        }],
      },
    });

    done();
  });

  it('Adds a where clause with an OR operator when the table is defined', (done) => {
    const columnDef = {
      mapCol: {column: 'actualCol', table: 'table1'},
    };

    const req = {query: {mapCol: 'equal:90||equal:91'}};
    let opts = {where: {}};

    opts = tableFilter(req, opts, columnDef);

    assert.isObject(opts.where);
    assert.property(opts.where, Op.or);
    assert.deepEqual(opts, {
      where: {
        [Op.or]: [{
          '$table1.$actualCol$': {[Op.eq]: 90},
        },
        {
          '$table1.$actualCol$': {[Op.eq]: 91},
        }],
      },
    });

    done();
  });
});
