// Writes build-info.json from the build args: node docker/write-build-info.js <version> <branch> <commit>
const { writeFileSync } = require('fs');

const [version, branch, commit] = process.argv.slice(2);

writeFileSync('build-info.json', `${JSON.stringify({ version, branch, commit })}\n`);
