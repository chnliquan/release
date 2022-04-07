# release

release your npm package easily

## Install

```bash
$ npm i @eljs/release --save-dev
```

```bash
$ yarn add @eljs/release --dev
```

## Usage

```bash
  Usage: release [options]

  Options:
    -v, --version                              Output the current version
    --latest                                   Generate latest changelog (default: true)
    --target-version                           Target release version
    -t, --repo-type <repo-type>                Publish type, github or gitlab
    -u, --repo-url <repo-url>                  Github repo url to release
    -p, --changelog-preset <changelog-preset>  Customize conventional changelog preset
    -h, --help                             display help for command
```

### Workflow

1. add script to your package.json

```diff
  "scripts": {
++  "release: "release"
  }
```

2. submit git commit with semantic information, https://www.conventionalcommits.org/en/v1.0.0/#summary

3. run `npm run release` to publish your package

## Options

### `-t, --repo-type: 'github' | 'gitlab'`

which type should the package publish to, by default, the `repository.url` field in **package.json** will be read to determine the platform type.

### `-u, --repo-url?: string`

when publish successful, it will open a release web page to sync changelog in `github` type, the `repoUrl` option represent the web page, the default `repoUrl` is `repository.url` in `package.json`.

### `-p, --changelog-preset?: string`

customize conventional changelog preset, the default is https://github.com/chnliquan/changelog-preset

### `--latest?: boolean`

whether generate **LATEASTLOG.md** which represent the latest changelog in project root, default `true`

### `--target-version?: string`

Specified target version to release, no need to choose version, useful in CI/CD

## LICENSE

MIT
