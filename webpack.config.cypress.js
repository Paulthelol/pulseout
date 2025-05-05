const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      fs: false, // 🔧 disables the Node 'fs' module
    },
  },
};
