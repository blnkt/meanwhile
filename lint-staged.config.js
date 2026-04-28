module.exports = {
  '**/*.{js,jsx,ts,tsx}': (filenames) => {
    const filtered = filenames.filter(filename => !filename.endsWith('uniwind-types.d.ts'));
    if (filtered.length === 0) {
      return [];
    }
    return [
      `npx eslint --fix ${filtered
        .map(filename => `"${filename}"`)
        .join(' ')}`,
    ];
  },
  '**/*.json': filenames => [
    `npx eslint --fix ${filenames
      .map(filename => `"${filename}"`)
      .join(' ')}`,
  ],
};
