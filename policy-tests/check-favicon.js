const fs = require('fs');

function fail(message) {
    throw new Error(message);
}

function expect(condition, message) {
    if (!condition) {
        fail(message);
    }
}

// Verify that both app entry HTML files reference the bundled favicon
// instead of an external/legacy image (fix for issue #922).
const htmlFiles = ['src/index.html', 'src/index_rmm6.html'];

for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');

    expect(
        content.includes('href="/favicon.ico"'),
        `${file}: favicon link must point to bundled /favicon.ico`
    );

    expect(
        !content.includes('logobox.png'),
        `${file}: favicon must not reference legacy logobox.png image`
    );
}

console.log('favicon policy checks passed');
