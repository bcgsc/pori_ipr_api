const fs = require('fs');

module.exports = {
  unlinkAndWrite: (filename, contents) => {
    fs.unlinkSync(filename);
    fs.writeFileSync(filename, contents);
  },
};
