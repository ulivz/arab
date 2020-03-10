# arab

[![NPM version](https://img.shields.io/npm/v/arab.svg?style=flat)](https://npmjs.com/package/arab) [![NPM downloads](https://img.shields.io/npm/dm/arab.svg?style=flat)](https://npmjs.com/package/arab) ![Node.js CI](https://github.com/rich-lab/arab/workflows/Node.js%20CI/badge.svg) [![codecov](https://codecov.io/gh/rich-lab/arab/branch/master/graph/badge.svg)](https://codecov.io/gh/rich-lab/arab)

## Install

```bash
tnpm install arab --save-dev
```

## Usage

```bash
arab # Build for client library.
arab --preset=cli # Build Node CLI.
arab --monorepo # Enable monorepo build.
```

## Options

### preset

- Type: `'app' | 'cli'`
- Description: build preset.

The internal presets have following meanings:

- `'app'`: transpiled to ES Modules, and using the appropriate babel config for mobile application, tagets: `{ ios: 8, android: 4 }`;               
- `'cli'`: transpiled to CommonJS Modules, and set targets to `{ node: 8 }`;

### monorepo

- Type: `boolean`
- Description: whether to enable build for monorepo.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D


## Author

**arab** © [ULIVZ](https://github.com/ulivz) under [Richlab Team](https://www.yuque.com/richlab/join-us/invitation), Released under the [MIT](./LICENSE) License.<br>
