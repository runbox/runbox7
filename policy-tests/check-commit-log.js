const exec = require('child_process').exec;

exec('git log --oneline --no-merges 95e518d..', (stdin, stdout, stderr) => {
    const lines = stdout.split('\n');
    for (const line of lines) {
        if (!line) {
            continue;
        }
        const hash = line.split(' ', 1)[0];
        if (hash.startsWith('04d6bdf')) {
            continue;
        }
        const message = line.substr(hash.length + 1);
        // --no-merges is not quite working as advertised
        if (message.match(/^Merge branch/)) {
            continue;
        }
        const match = message.match(/([^\(]+)\(([^\)]+)\): .+/);
        if (!match) {
            throw `Commit message for ${hash} doesn't have the correct format\n` +
                  `\tshould be <type>(<scope>): <subject>\n` +
                  `\tand it is ${message}`;
        }
        const type = match[1];
        const valid_types = ['build', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'style', 'test'];
        const is_valid = valid_types.find(t => t === type);
        if (!is_valid) {
            throw `Commit type for ${hash} ("${type}") is invalid\n` +
                  `\tin commit message "${message}"\n` + 
                  `\tvalid options are: ${valid_types.join(', ')}`;
        }
        if (message.length > 100) {
            throw `Commit message for ${hash} should be no longer than 100 characters\n` +
                  `\tviolated by ${message} (${message.length} characters)`;
        }
    }

    console.log('All commits look OK');
});
