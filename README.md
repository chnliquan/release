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

```diff
  "scripts": {
++  "release": "release"  
  }
```

1. submit git with semantic information, https://www.conventionalcommits.org/en/v1.0.0/#summary
2. use `npm run release` to publish your package

## Options

### type?: 'github' | 'gitlab'

which type should the package publish to, default `github`

### latest?: boolean

should generate **LATEASTLOG.md** which represent the latest changelog in project root, default `true`

### config?: string

the path to specified conventional changelog config, default `@eljs/conventional-changelog-config`

### repoUrl?: string

when publish successful, it will open a release web page to sync changelog in `github` type, the `repoUrl` option represent the web page, default is `repository.url` in `package.json`

## LICENSE

MIT
