// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
// 
// This file is part of Runbox 7.
// 
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
// 
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { AsyncSubject, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

declare var Module;
declare var WebAssembly;

let _xapianLoadedSubject: AsyncSubject<any> = null;

function loadXapian() {
    if (_xapianLoadedSubject) {
        return _xapianLoadedSubject;
    }
    _xapianLoadedSubject = new AsyncSubject<any>();
    if (typeof WebAssembly === 'object') {
        console.log('Loading Xapian webassembly binary');

        const startTime = new Date().getTime();
        const scriptelm = document.createElement('script');
        scriptelm.src = 'xapianasm.js';
        scriptelm.onload = () => {
            Module['onRuntimeInitialized'] = () => {
                patchMEMFS();
                patchIDBFS();
                console.log('Xapian boot time', (new Date().getTime() - startTime), 'ms');
                _xapianLoadedSubject.next(true);
                _xapianLoadedSubject.complete();
            };
        };
        document.body.appendChild(scriptelm);
    } else {
        console.log('No webassembly support');
        _xapianLoadedSubject.next(false);
        _xapianLoadedSubject.complete();
    }
    return _xapianLoadedSubject;
}

export const xapianLoadedSubject = of(true).pipe(mergeMap(() => loadXapian()));

declare var IDBFS;
declare var FS;
declare var PATH;
declare var assert;
declare var MEMFS;
declare var window;

/* eslint-disable curly */
/* eslint-disable no-var */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable @typescript-eslint/no-shadow */

function getFileDataAsTypedArray(node, callback) {
    if (!node.contents) {
        callback(new Uint8Array());
        return;
    }
    if (node.contents.subarray) {
        callback(node.contents.subarray(0, node.usedBytes)); // Make sure to not return excess unused bytes.
        return;
    }
    const ret = new Uint8Array(node.contents.length);

    const chunksize = 256 * 1024;
    let ndx = 0;

    const copyChunk = () => {

        const chunk = node.contents.slice(ndx, ndx + chunksize);

        ret.set(chunk, ndx);
        ndx += chunk.length;

        if (ndx < node.contents.length) {
            setTimeout(() => copyChunk(), 0);
        } else {
            callback(ret);
        }
    };
    setTimeout(() => copyChunk(), 0);
}

/**
 * Patch emscripten filesystem so that it won't hang when persisting index files to IndexedDB
 */
function patchMEMFS() {
    MEMFS.expandFileStorage = (node, newCapacity) => {
        if (node.contents && newCapacity > node.contents.length) {
            // console.log('expand file storage', node.name, node.contents.length, newCapacity);
            const newarr = new Uint8Array(Math.round(newCapacity * 1.05));
            newarr.set(node.contents, 0);
            node.contents = newarr;
        } else if (!node.contents) {
            node.contents = new Uint8Array(newCapacity);
        }
    };
}

function patchIDBFS() {
    IDBFS = {
        dbs: {},
        indexedDB: function() {

        if (typeof indexedDB !== 'undefined') return indexedDB;

        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
        },
        DB_VERSION: 21,
        DB_STORE_NAME: 'FILE_DATA',
        mount: function(mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
        },
        syncfs: function(mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
            if (err) return callback(err);

            IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);

            var src = populate ? remote : local;
            var dst = populate ? local : remote;

            IDBFS.reconcile(src, dst, callback);
            });
        });
        },
        getDB: function(name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
            return callback(null, db);
        }

        var req;
        try {
            req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
            return callback(e);
        }
        if (!req) {
            return callback("Unable to connect to IndexedDB");
        }
        req.onupgradeneeded = function(e) {
            var db = e.target.result;
            var transaction = e.target.transaction;

            var fileStore;

            if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
            } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
            }

            if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
        req.onsuccess = function() {
            db = req.result;

            // add to the cache
            IDBFS.dbs[name] = db;
            callback(null, db);
        };
        req.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
        };
        },
        getLocalSet: function(mount, callback) {
        var entries = {};

        function isRealDir(p) {
            return p !== '.' && p !== '..';
        }

        function toAbsolute(root) {
            return function(p) {
                return PATH.join2(root, p);
            };
        }

        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));

        while (check.length) {
            var path = check.pop();
            var stat;

            try {
            stat = FS.stat(path);
            } catch (e) {
            return callback(e);
            }

            if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
            }

            entries[path] = { timestamp: stat.mtime };
        }

        return callback(null, { type: 'local', entries: entries });
        },
        getRemoteSet: function(mount, callback) {
        var entries = {};

        IDBFS.getDB(mount.mountpoint, function(err, db) {
            if (err) return callback(err);

            try {
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
            transaction.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };

            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            var index = store.index('timestamp');

            index.openKeyCursor().onsuccess = function(event) {
                var cursor = event.target.result;

                if (!cursor) {
                return callback(null, { type: 'remote', db: db, entries: entries });
                }

                entries[cursor.primaryKey] = { timestamp: cursor.key };

                cursor.continue();
            };
            } catch (e) {
            return callback(e);
            }
        });
        },
        loadLocalEntry: function(path, callback) {
            var stat, node;

            try {
                var lookup = FS.lookupPath(path);
                node = lookup.node;
                stat = FS.stat(path);
            } catch (e) {
                return callback(e);
            }

            if (FS.isDir(stat.mode)) {
                return callback(null, { timestamp: stat.mtime, mode: stat.mode });
            } else if (FS.isFile(stat.mode)) {
                // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
                // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.

                getFileDataAsTypedArray(node, (arr) => {
                    node.contents = arr;
                    callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
                });
                return;
            } else {
                return callback(new Error('node type not supported'));
            }
        },
        storeLocalEntry: function(path, entry, callback) {
        try {
            if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
            } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { canOwn: true });
            } else {
            return callback(new Error('node type not supported'));
            }

            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
            return callback(e);
        }

        callback(null);
        },
        removeLocalEntry: function(path, callback) {
        try {
            var stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
            } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
            }
        } catch (e) {
            return callback(e);
        }

        callback(null);
        },
        loadRemoteEntry: function(store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
        };
        },
        storeRemoteEntry: function(store, path, entry, callback) {
            const startTime = new Date().getTime();
            console.log('store remote entry', path);
            var req = store.put(entry, path);
            req.onsuccess = function() {
                console.log('stored remote entry', path, (new Date().getTime() - startTime));
                callback(null);
            };
            req.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };
        },
        removeRemoteEntry: function(store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
        };
        },
        reconcile: function(src, dst, callback) {
            var total = 0;

            var create = [];
            Object.keys(src.entries).forEach(function (key) {
                var e = src.entries[key];
                var e2 = dst.entries[key];
                if (!e2 || e.timestamp > e2.timestamp) {
                create.push(key);
                total++;
                }
            });

            var remove = [];
            Object.keys(dst.entries).forEach(function (key) {
                var e2 = src.entries[key];
                if (!e2) {
                remove.push(key);
                total++;
                }
            });

            if (!total) {
                return callback(null);
            }

            var completed = 0;
            var db = src.type === 'remote' ? src.db : dst.db;

            const done: any = (err) => {
                if (err) {
                    if (!done.errored) {
                        done.errored = true;
                        return callback(err);
                    }
                    return;
                }
                if (++completed >= total) {
                    return callback(null);
                }
            };

            // sort paths in ascending order so directory entries are created
            // before the files inside them
            create.sort();

            let prepareIndex = 0;
            new Promise((resolve) => {
                const prepareOne = () => {
                    setTimeout(() =>  {
                        if (prepareIndex < create.length) {
                            IDBFS.loadLocalEntry(create[prepareIndex++], (err, entry) =>
                                prepareOne()
                            );
                        } else {
                            resolve(null);
                        }
                    });
                };
                if (dst.type === 'local') {
                    resolve(null);
                } else {
                    prepareOne();
                }
            }).then(() =>  {
                let transaction: IDBTransaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
                let store: IDBObjectStore = transaction.objectStore(IDBFS.DB_STORE_NAME);

                transaction.onerror = function(e) {
                    done(this.error);
                    e.preventDefault();
                };

                for (let path of create) {
                    if (dst.type === 'local') {
                        IDBFS.loadRemoteEntry(store, path, function (err, entry) {
                            if (err) return done(err);
                            IDBFS.storeLocalEntry(path, entry, done);
                        });
                    } else {
                        IDBFS.loadLocalEntry(path, (err, entry) => {
                                if (err) {
                                    return done(err);
                                }

                                IDBFS.storeRemoteEntry(store, path, entry, (err) => {
                                    done(err);
                                });
                            }
                        );
                    }
                }

                // sort paths in descending order so files are deleted before their
                // parent directories
                remove.sort().reverse().forEach(function(path) {
                    if (dst.type === 'local') {
                        IDBFS.removeLocalEntry(path, done);
                    } else {
                        IDBFS.removeRemoteEntry(store, path, done);
                    }
                });
            });
        }
    };
}
