# Contributing to Runbox 7

We would love for you to contribute to Runbox 7 and help make it even better than it is today!

As a contributor, here are the guidelines we would like you to follow:

* [Code of Conduct](#code-of-conduct)
* [Question or Problem?](#got-a-question-or-problem)
* [Issues and Bugs](#found-a-bug)
* [Feature Requests](#missing-a-feature)
* [Submission Guidelines](#submission-guidelines)
* [Coding Rules](#coding-rules)
* [Commit Message Guidelines](#commit-message-guidelines)
* [License](#license)

## Code of Conduct

Help us keep Runbox 7 open and inclusive. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Got a Question or Problem?

Please do not open issues on Github for general support questions as we want to keep GitHub issues for bug reports and feature requests.

* **If you have a question or comment about Runbox 7:** Please use our Runbox Forum at [https://community.runbox.com](https://community.runbox.com/). The Runbox Forum is the best place to ask questions as both Runbox Staff and other Runbox 7 users are there and happy to help. Also, questions and answers stay available for public viewing so they might help someone else.
* **If you have an account specific issue:** If your issue is account specific or involves personal details, we ask that you contact Runbox Support at [https://support.runbox.com](https://support.runbox.com/).

## Found a Bug?

If you find a bug in the source code, you can help us by [submitting an issue](#submission-guidelines) to our GitHub Repository. Even better, you can [submit a Pull Request](#submitting-a-pull-request-pr) with a fix.

## Missing a Feature?

You can **request** a new feature by [submitting an issue](#submission-guidelines) to our GitHub Repository.

If you would like to **implement** a new feature, please
submit an issue with a proposal for your work first, to be sure that we
can use it. Please consider what kind of change it is:

* For a **Major Feature**, first open an issue and outline your proposal so that it can be discussed. This will also allow us to better coordinate our efforts, prevent duplication of work, and help you to craft the change so that it is successfully accepted into the project.
* **Small Features** can be crafted and directly [submitted as a Pull Request](#submitting-a-pull-request-pr).

## Submission Guidelines

### Submitting an Issue

Before you submit an issue, please search the issue tracker. Maybe an issue for your problem already exists and the discussion might inform you of workarounds readily available.

We want to fix all the issues as soon as possible, but before fixing a bug we need to reproduce and confirm it. In order to reproduce bugs, please provide the following information:

1. Operating system and browser version used.
2. Whether or not a local index is used.
3. Steps to reproduce the issue.

### Submitting a Pull Request (PR)

Before you submit your Pull Request (PR), consider the following guidelines:

1. Search [GitHub](https://github.com/runbox/runbox7/pulls) for an open or closed PR that relates to your submission. You don't want to duplicate effort.
2. Be sure that an issue describes the problem you're fixing,
 or documents the design for the feature you'd like to add. Discussing
 the design up front helps to ensure that we're ready to accept your
 work.
 3. [Fork](https://help.github.com/articles/fork-a-repo/) the runbox/runbox7 repo.
 4. Make your changes in a new git branch:

```
git checkout -b my-fix-branch master
```
5. Create your patch, **including appropriate test cases**.
6. Follow our [Coding Rules](#coding-rules).
7. Run the full Angular test suite, and ensure that all tests pass.
8. Commit your changes using a descriptive commit message that follows our [commit message conventions](#commit-message-guidelines). Adherence to these conventions is necessary because release notes are automatically generated from these messages.

```
git commit -a
```

Note: The optional commit `-a` command line option will automatically "add" and "rm" edited files.
9. Push your branch to GitHub:

```
git push origin my-fix-branch
```
10. In GitHub, send a pull request to `runbox7:master`.

* If we suggest changes then:
  - Make the required updates.
  - Re-run the Angular test suites to ensure tests are still passing.
  - Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

```
git rebase master -i git push -f
```

That's it! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes from the main (upstream) repository:

* Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

```
git push origin --delete my-fix-branch
```
* Check out the master branch:

```
git checkout master -f
```
* Delete the local branch:

```
git branch -D my-fix-branch
```
* Update your master with the latest upstream version:

```
git pull --ff upstream master
```

## Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

* All features or bug fixes **must be tested** by one or more specs (unit-tests).
* All public API methods **must be documented**.
* You may use `@author name/pseudonym` (optionally email) inside comments for attribution.

## Commit Message Guidelines

We have very precise rules over how our Git commit messages can be formatted. This leads to **more readable messages** that are easy to follow when looking through the **project history**. But also, we use the git commit messages to **generate the Angular change log**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer than 100 characters! This allows the message to be easier to read on GitHub as well as in various git tools.

The footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

Samples: (even more [samples](https://github.com/runbox/runbox7/commits/master))

```
docs(changelog): Update changelog to beta.5
```

```
fix(release): Need to depend on latest rxjs and zone.js

The version in our package.json gets copied to the one we publish, and users need the latest of these.
```

If the commit is associated with an issue number, include it in the commit message body on the format #issuenumber (multiple allowed, separated by comma).

### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

* **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
* **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
* **docs**: Documentation only changes
* **feat**: A new feature
* **fix**: A bug fix
* **perf**: A code change that improves performance
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* **test**: Adding missing tests or correcting existing tests

### Subject

The subject contains a succinct description of the change:

* Use the imperative, present tense: "change" not "changed" nor "changes".
* No dot (.) at the end.

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the  motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## License
Contributions to this project indicate the contributors' assent for inclusion of that software in the canonical version under the project's [license](LICENSE).
