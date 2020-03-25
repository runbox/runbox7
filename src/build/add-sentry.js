const cp = require('child_process');
const fs = require('fs');

const sentry_code = `
import * as Sentry from "@sentry/browser";

Sentry.init({
      dsn: '${process.env.SENTRY_DSN}'
});
`;

let app = fs.readFileSync('src/app/sentry.ts').toString();
app = app.replace('// ADD SENTRY HERE', sentry_code.trim());
fs.writeFileSync('src/app/sentry.ts', app);
console.log('sentry.ts updated');
