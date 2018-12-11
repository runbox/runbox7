var NGMakeLib = require('ngmakelib').NGMakeLib;

// Initialize NGMakeLib with entry point source file and module name
var ngMakeLib = new NGMakeLib('src/app/lib.module.ts', 'runbox7lib');
ngMakeLib.setREADME('README-library.md');

console.log('Exports for Runbox7 library has no dependencies - removing them from the exported package.json');
ngMakeLib.packageJSONConfig.dependencies = {};
ngMakeLib.packageJSONConfig.devDependencies = {};
ngMakeLib.rollupOutputOptions.format = 'cjs';

// Create the library and watch for changes
if(process.argv[process.argv.length-1] === '--watch') {
    ngMakeLib.watch();
} else {
    ngMakeLib.build();
}