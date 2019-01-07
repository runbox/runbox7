[![Build Status](https://api.travis-ci.com/runbox/runbox7.svg?branch=master)](https://travis-ci.com/runbox/runbox7)

<h4 align="center">
  <br><img src="src/assets/runbox7_blue_dark.png" alt="Runbox 7" width="400">
  <br>Building the fastest webmail app on the planet<br><br>
</h4>

Welcome to the Runbox 7 project!

Runbox 7 is a next generation webmail app that combines the instant experience of email clients with the versatility of web browsers.

The app is written in Angular 2+ and HTML5 Canvas, using a Perl backend with MySQL storage.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.6.8.

## Getting Started

These instructions will get the Runbox 7 App up and running on your local machine, using the Runbox production servers as backend. You can then develop and test changes to the app with a live Runbox account.

### Prerequisites

To run Runbox 7 you first need to install:
* Node.js
* npm
* Git

Installation instructions for Node and NPM:
* Ubuntu 18.04: [https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04)
* OS X: [http://blog.teamtreehouse.com/install-node-js-npm-mac](http://blog.teamtreehouse.com/install-node-js-npm-mac)
* Windows: [https://blog.teamtreehouse.com/install-node-js-npm-windows](https://blog.teamtreehouse.com/install-node-js-npm-windows)
### Installation

1. Clone the codebase onto your system: `git clone https://github.com/runbox/runbox7.git`
1. Change directory into the repository directory: `cd runbox7`
1. Install dependencies: =npm install=


## Development with your Runbox account (using production servers as backend)

To get started with frontend development without setting up any server.

Simply run:

`npm start`

Log in with your production runbox account.

## Development with your own Runbox server installation

Run `npm run appdev` and you will be able to access Runbox 7 at `https://yourvm/appdev`

## Development server with Runbox proxy

By default running `npm start` will use the production environment at https://runbox.com as backend. If you want to use another backend you may change the `RUNBOX7_ANGULAR_BACKEND_HOST` environment variable.

Run `RUNBOX7_ANGULAR_BACKEND_HOST=https://yourvm.runbox.com npm start` to use the backend of your choice.
    
You may then access the angular app at: [http://localhost:4200](http://localhost:4200)

## Creating production bundles

Run `npm run build`. Production bundles will be created in the `dist` folder and is ready
to be copied into the production web servers.

## No-script

If you use no-script, remember to whitelist localhost to execute localhost.

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

## Development

Depending on what type of development you wish to do, you may want to set up a Runbox trial account to avoid affecting data stored in your own Runbox account.

We warmly welcome bug reports, feature requests, and contributions via pull requests.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on the process for submitting pull requests to us.

See also [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our code of conduct.

## License
This project is licensed under GPLv3 - see [LICENSE.md](CODE_OF_CONDUCT.md) for details

## Acknowledgments
   * Thanks to the folks behind the Xapian project, an integral part of Runbox 7: [https://xapian.org](https://xapian.org)
