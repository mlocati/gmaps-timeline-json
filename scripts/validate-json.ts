import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadTimelineJson} from '../src/timeline.ts';
import * as z from 'zod';

const [, , filePath] = process.argv;

if (!filePath) {
  console.error('Syntax: npm run validate:json -- <file-path.json>');
  process.exit(1);
}

const absolutePath = resolve(filePath);
console.log('Reading file');
const contentJson = readFileSync(absolutePath, 'utf-8');

console.log('Checking file');
try {
  loadTimelineJson(contentJson);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error((error.issues[0] as any).errors);
    console.error(z.prettifyError(error));
  } else {
    console.error(error);
  }
  process.exit(1);
}
