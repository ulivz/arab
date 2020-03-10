const { transform } = require('@babel/core');

function transformWithPlugin(code, opts) {
  const filename = 'file.js';
  return transform(code, {
    filename,
    plugins: [[require.resolve('../lib/babel-plugin-normalize-extensions.js'), opts]],
  }).code;
}

describe('babel-plugin-normalize-extensions', () => {
  it('script', function () {
    expect(transformWithPlugin(`import foo from './foo.jsx'`, {})).toEqual(
      `import foo from "./foo.js";`,
    );
    expect(transformWithPlugin(`import foo from './foo.ts'`, {})).toEqual(
      `import foo from "./foo.js";`,
    );
    expect(transformWithPlugin(`import foo from './foo.tsx'`, {})).toEqual(
      `import foo from "./foo.js";`,
    );
  });

  it('vue', function () {
    expect(transformWithPlugin(`import foo from './foo.vue'`, {})).toEqual(
      `import foo from "./foo.js";`,
    );
  });

  it('less', function () {
    expect(transformWithPlugin(`import foo from './foo.less'`, {})).toEqual(
      `import foo from "./foo.css";`,
    );
  });
});
