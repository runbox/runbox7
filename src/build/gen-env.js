#!/usr/bin/env node

const Debug = require('debug')
const fs = require('fs');

const target = 'src/environments/env.ts'
const debug = Debug('runbox:gen-env')

debug(`Writing env file to ${target}.`)

process.env.BUILD_TIMESTAMP ??= new Date().toJSON()

const env = [
    ['BUILD_TIMESTAMP', assertString],
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


fs.writeFileSync('src/environments/env.ts', `
/* eslint-disable @typescript-eslint/quotes */

// This file is auto-generated.

export default ${JSON.stringify(
    env.reduce((acc, [name, fn]) => {
        acc[name] = fn(process.env[name], name)

        return acc
    }, {})
, null, 2)}`);

debug(`Wrote env file to ${target}.`)
