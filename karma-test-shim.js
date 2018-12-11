Error.stackTraceLimit = Infinity;
jasmine.DEFAULT_TIMEOUT_INTERVAL= 10*1000;

// Cancel Karma's synchronous start,
// we will call `__karma__.start()` later, once all the specs are loaded.
__karma__.loaded = function() {};

function loadSystem() {
    let RealSystem = System;
    let config;
    System = { config: (conf) => config = conf };

    // Rewrite systemjs config
    let scriptelm = document.createElement("script");
    scriptelm.src = "base/systemjs.config.js";
    scriptelm.onload = () => {
        System = RealSystem;
        config.baseURL = "/base/";
        
        System.config(config);
        System.import('tests/test1')
        .catch(function(err) { console.error(err); })
        .then(() => __karma__.start());        
    };
    document.body.appendChild(scriptelm);
};

loadSystem();



