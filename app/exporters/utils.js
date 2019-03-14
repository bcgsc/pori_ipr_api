const fs = require('fs');

const unlinkAndWrite = (filename, contents) => {
  fs.unlinkSync(filename);
  fs.writeFileSync(filename, contents);
};

module.exports = {
  unlinkAndWrite,
};
