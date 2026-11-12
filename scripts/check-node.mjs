// The live server runs Node 22 (see Dockerfile). Warn when developing on another version,
// because native modules (better-sqlite3) and Next.js can behave differently.
const want = '22';
const have = process.versions.node.split('.')[0];
if (have !== want) {
  console.warn(`\n[dev] WARNING: you are on Node ${process.versions.node}, but the live server runs Node ${want}.`);
  console.warn('[dev] In Codespaces: open the command palette and run "Codespaces: Rebuild Container". Elsewhere: nvm use.\n');
}
