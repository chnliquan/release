# release

release your npm package easily

## Install

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
    -v, --version                          Output the current version
    --latest                               Generate latest changelog (default: true)
    --repo-type <repo-type>                Publish type, github or gitlab
    --repo-url <repo-url>                  Github repo url to release
    --changelog-preset <changelog-preset>  Customize conventional changelog preset
    -h, --help                             display help for command
```

1. add script to your package.json

```diff
  "scripts": {
++  "release: "release --repo-type=github"  
  }
```

2. submit git with semantic information, https://www.conventionalcommits.org/en/v1.0.0/#summary
3. run `npm run release` to publish your package

## Options

### `--repo-type: 'github' | 'gitlab'`

which type should the package publish to, default `github`


### `--repo-url?: string`

when publish successful, it will open a release web page to sync changelog in `github` type, the `repoUrl` option represent the web page, default is `repository.url` in `package.json`


### `--changelog-preset?: string`

customize conventional changelog preset, default https://github.com/chnliquan/changelog-preset

### `--latest?: boolean`

should generate **LATEASTLOG.md** which represent the latest changelog in project root, default `true`

### `--config?: string`

the path to specified conventional changelog config, default `@eljs/conventional-changelog-config`

## LICENSE

MIT
