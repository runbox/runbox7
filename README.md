# Runbox Angular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.6.8.

# Before you start

Run `npm install` to install all dependencies

## Development with your Runbox account (using prod servers as backend)

To get started with frontend development without setting up any server.

Simply run:

`npm start`

Log in with your production runbox account.

## Development with your own Runbox server installation

Run `npm run appdev` and you will be able to access Runbox7 at `https://yourvm/appdev`

## Development server with RMM proxy

Run `npm start https://yourvm.runbox.com` to use the backend of your choice. No host file config needed.
    `npm start https://localhost:443` *** localhost might be necessary if your vm cannot resolve its external IP to localhost

You may then access the angular app at http://localhost:4200

If you put the production url https://runbox.com as the argument to the command above, then you can test
frontend development directly with your production account.

## Creating production bundles

Run `npm run build` - which will copy production bundle files to `vhosts/_default/app` - and also update index.html
to point to the new bundles.

## No-script

If you use no-script, remember to whitelist localhost to execute localhost

## Code scaffolding

Example creating a new module and a component:

`ng generate module --project runbox7 xapian/SearchExpressionBuilder`

followed by

`ng generate component --project runbox7 xapian/SearchExpressionBuilder`

This resulted in the module `xapian/search-expression-builder/search-expression-builder.module.ts` which also imported the component.

And this is from the standard @angular/cli docs:

Run `ng generate component --project runbox7 component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

