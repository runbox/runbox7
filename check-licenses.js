const fs = require('fs');

function should_check(filename) {
    const excluded_files = [
        'src/test.ts',
        'src/polyfills.ts',
        'src/typings.d.ts',
        'src/app/buildtimestamp.ts',
    ];
    if (excluded_files.indexOf(filename) != -1) {
        return false;
    }
    return filename.match(/\.ts$/);
}

function check_file(filename) {
    const pattern = /Copyright \(C\) 2016-2... Runbox Solutions AS \(runbox\.com\)/;
    console.log("Checking", filename);
    fs.readFile(filename, 'utf-8', (err, content) => {
        if (!content.match(pattern)) {
            throw "No valid license in " + filename;
        }
    });
}

function check_directory(dir) {
    fs.readdir(dir, { withFileTypes: true }, (err, filenames) => {
        if (!filenames) return;

        filenames.forEach(item => {
            const path = dir + '/' + item.name;
            if (item.isDirectory()) {
                check_directory(path);
            } else {
                if (should_check(path)) {
                    check_file(path);
                }
            }
        });
    });
}

check_directory('src');
