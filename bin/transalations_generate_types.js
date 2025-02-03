const fs = require('fs');
const path = require('path');

const escapeString = string => {
  return string
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
};

const generateTypeDefinitions = (jsonPath, outputPath) => {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const header = `// This file is autogenerated by the script. DO NOT EDIT BY HAND.
// To update this file, run: yarn run translate:generate-types

`;

  const body = Object.entries(json)
    .map(([key, value]) => `    '${key}': \`${escapeString(value)}\`;`)
    .join('\n');

  const content = `${header}declare module 'I18n/en-US.json' {
  const translations: {
${body}
  };
  export default translations;
}
`;

  fs.writeFileSync(outputPath, content);
};

const ROOT_PATH = path.resolve(__dirname, '..');

generateTypeDefinitions(path.join(ROOT_PATH, 'src/i18n/en-US.json'), path.join(ROOT_PATH, 'src/types/i18n.d.ts'));
