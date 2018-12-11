const fs = require('fs');
fs.writeFileSync('src/app/buildtimestamp.ts',"export const BUILD_TIMESTAMP = '" + new Date().toJSON() + "';\n")