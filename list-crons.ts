import * as fs from 'fs';
import * as path from 'path';

function searchCrons(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory() && file !== 'node_modules' && file !== 'dist') {
      searchCrons(full);
    } else if (full.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('cron') || content.includes('schedule')) {
        console.log(full);
      }
    }
  }
}
searchCrons('./');
