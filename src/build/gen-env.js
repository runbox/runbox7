#!/usr/bin/env node

const Debug = require('debug')
const fs = require('fs');

const target = 'src/environments/env.ts'
const debug = Debug('runbox:gen-env')

debug(`Writing env file to ${target}.`)

const env = [
    ['SENTRY_DSN', tryCatch(assertString, orNull)],
]

function assertString(input) {
    if (typeof input !== 'string') {
        throw new TypeError(`Expected a string, but received ${typeof input}`);
    }
    return input;
}

function tryCatch (tryFn, catchFn) {
    return value => {
        try {
            return tryFn(value);
        } catch (error) {
            debug(error)
            return catchFn(error, value)
        }
    }
}

function orNull () {
    return null
}

fs.writeFileSync('src/environments/env.ts', `// --------- BEGIN RUNBOX LICENSE ---------
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

// This file is auto-generated.

/* eslint-disable @typescript-eslint/quotes */

export default ${JSON.stringify(
    env.reduce((acc, [name, fn]) => {
        acc[name] = fn(process.env[name], name)

        return acc
    }, {})
, null, 2)}`);

debug(`Wrote env file to ${target}.`)
