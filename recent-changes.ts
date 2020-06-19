// run with: npx ts-node -O '{"module":"commonjs"}'
// remember about: node src/build/build-changelog.js

import { changelog, ChangelogEntry, EntryType } from './src/app/changelog/changes';
import * as moment from 'moment';

const numDays = parseInt(process.argv[2] || '7')

if (isNaN(numDays)) {
    console.log('Usage:', process.argv.slice(0, 2).join(' '), '[number of days]');
    process.exit(1);
}

const lastWeek = moment().subtract(numDays, 'days');
console.log(`Changes since ${lastWeek.format('DD.MM')}:`);

const types = {};
types[EntryType.FEAT] = 'New feature';
types[EntryType.FIX] = 'Bugfix';
types[EntryType.PERF] = 'Performance fix';
types[EntryType.STYLE] = 'Visual fix';

function format(entry: ChangelogEntry) {
    console.log(`  ${types[entry.type]} (${entry.component}): ${entry.description}`);
}

const entries = changelog.filter(e => e.epoch > lastWeek.unix());

for (const entry of entries.filter(e => !!types[e.type])) {
    format(entry);
}

console.log(`...and ${entries.filter(e => !types[e.type]).length} internal changes`);
