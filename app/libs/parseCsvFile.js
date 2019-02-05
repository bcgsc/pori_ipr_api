const fs = require('fs');
const csv = require('csv-parse/lib/sync');
    //csv = require('csv-parse')

const readFromCSV = async (file) => {
    
    const parser = csv({delimiter: ',', columns: true});
    fs.createReadStream(file).pipe(parser);
  }
module.exports = {
  readFromCSV,
}
