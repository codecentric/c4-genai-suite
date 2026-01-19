import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { EOL } from "node:os";

const main = async () => {
  // Process both C4 backend generated files and eval service generated files
  const files = globSync('src/api/generated*/**/*.ts');

  const headerString = `//@ts-nocheck${EOL}`;

  for (const file of files) {
    let fileBuffer = readFileSync(file, 'utf-8');

    if (fileBuffer.startsWith('//@ts-nocheck')) {
      console.log(`${file}: Ignore, already has header.`);
      continue;
    }

    writeFileSync(file, headerString + fileBuffer);
    console.log(`${file}: Updated.`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});