// Writes docs/state-machines.md from src/lib/state-machines. Run: npm run machines:docs
import fs from 'node:fs';
import { renderStateMachineDocs } from '../src/lib/state-machines/docs';

fs.writeFileSync('docs/state-machines.md', renderStateMachineDocs());
console.log('docs/state-machines.md updated');
