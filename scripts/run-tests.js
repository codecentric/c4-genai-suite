import {
  execute,
  isPortAvailabe,
  killAllAndExit,
  dockerCleanups,
} from './process-management.js';

// --------------------------------------------------------------------------------
// -- Read Script Call Parameters and Setup ---------------------------------------
// --------------------------------------------------------------------------------
//
const forceUsingRunningServices = process.argv.includes(
  '--forceUsingRunningServices'
);
const devSetup = process.argv.includes('--devSetup');
const noAutoKill = process.argv.includes('--noAutoKill') | devSetup;
const forceTestsOnDev = process.argv.includes('--forceTestsOnDev');
const fileIndex = process.argv.indexOf('--file');
const testFile = fileIndex !== -1 ? process.argv[fileIndex + 1] : null;

let withExpensiveTests = false;
let withExtensionTests = false;
let withNormalTests = false;

if (testFile) {
  // if a test file is specified, we only include the tests of this test file
  if (testFile.includes('expensive-tests')) {
    withExpensiveTests = true;
  } else if (testFile.includes('extension-tests')) {
    withExtensionTests = true;
  } else {
    withNormalTests = true;
  }
} else {
  // otherwise we include all, which are not explicitly excluded
  withExpensiveTests = !process.argv.includes('--withoutExpensiveTests');
  withExtensionTests = !process.argv.includes('--withoutExtensionTests');
  withNormalTests = !process.argv.includes('--withoutNormalTests');
}

let playwrightFlags = '--project="chromium" ';
if (process.argv.includes('--ui')) playwrightFlags += '--ui ';
if (process.argv.includes('--debug')) playwrightFlags += '--debug ';
if (process.argv.includes('--headed')) playwrightFlags += '--headed ';

const portForPostgres = devSetup ? '5432' : '5433';
const portForBackend = '3000';
const portForFrontend = '5173';
const portForREIS = '3201';
const portForMinio = devSetup ? '9000' : '9001';
const portForMcpTool = '8000';

const dockerComposeDown = devSetup
  ? 'echo "Changes in development DB are kept"'
  : 'docker compose down';

// --------------------------------------------------------------------------------
// -- Setup and Test Scripts for the Shell ----------------------------------------
// --------------------------------------------------------------------------------
//
const waitForPostgres = `npx wait-on tcp:localhost:${portForPostgres}`;
const waitForBackend = `npx wait-on tcp:localhost:${portForBackend}`;
const waitForFrontend = `npx wait-on http://localhost:${portForFrontend}/login`;
const waitForREIS = `npx wait-on tcp:localhost:${portForREIS}`;
const waitForMinio = `npx wait-on tcp:localhost:${portForMinio}`;
const waitForMcpTool = `npx wait-on tcp:localhost:${portForMcpTool}`;

const waitForAll = [
  waitForPostgres,
  waitForBackend,
  waitForFrontend,
  waitForREIS,
  waitForMinio,
  waitForMcpTool,
].join(' && ');

const startPostgres = `cd ${
  devSetup ? 'dev' : 'e2e'
}/postgres && ${dockerComposeDown} && docker compose up > ../../output/e2e-postgres-docker.log 2>&1`;
const startFrontend = `cd frontend && npm run dev > ../output/frontend.log 2>&1`;
const startREIS = `cd services/reis && STORE_PGVECTOR_URL="postgresql+psycopg://admin:secret@localhost:${portForPostgres}/cccc" uv run fastapi dev rei_s/app.py --host 0.0.0.0 --port "${portForREIS}" > ../../output/reis.log 2>&1`;
const startBackend = `${waitForPostgres} && cd backend && DB_URL="postgres://admin:secret@localhost:${portForPostgres}/cccc" npm run start:dev > ../output/backend.log 2>&1`;
const startMinio = `cd ${ devSetup ? 'dev' : 'e2e' }/minio && ${dockerComposeDown} && docker compose up > ../../output/e2e-minio-docker.log 2>&1`;
const startMcpTool = `echo "RUNNING-MCP:" && docker compose -f docker-compose-dev.yml up mcp-fetch > output/mcp-tool.log 2>&1`;

const statusCommands = [
  'mkdir -p output',
  'printf "Starting backend, postgres, REIS, frontend, minio ..."',
  forceUsingRunningServices
    ? `echo "YOU ARE RUNNING IN FORCE MODE: THIS WILL USE WHATEVER YOU HAVE ALREADY RUNNING IF POSSIBLE!"`
    : `echo`,
  `printf 'Tip: run "nvm i && npm i" before this script to fix setup issues.'`,
  'echo ""',
  `${waitForPostgres} && echo "==> localhost:${portForPostgres} <== postgres is up"`,
  `${waitForBackend}  && echo "==> localhost:${portForBackend} <== backend is up"`,
  `${waitForFrontend} && echo "==> localhost:${portForFrontend} <== frontend is up"`,
  `${waitForREIS} && echo "==> localhost:${portForREIS} <== REIS is up"`,
  `${waitForMinio} && echo "==> localhost:${portForMinio} <== Minio is up"`,
  `${waitForMcpTool} && echo "==> localhost:${portForMcpTool} <== MCP-Tool is up"`,
];

const installPlaywright =
  'cd e2e && echo && printf "installing Playwright ..." && npm i && npx playwright install > ../output/playwright-install.log 2>&1';
const runE2eTestPlaywright = testFile
  ? `npx playwright test ${testFile} --config playwright.config.ts ${playwrightFlags}`
  : `npx playwright test --config playwright.config.ts ${playwrightFlags}`;
const runExtensionTestPlaywright = testFile
  ? `TEST_DIR="./extension-tests" npx playwright test ${testFile} --config playwright.config.ts ${playwrightFlags}`
  : `TEST_DIR="./extension-tests" npx playwright test --config playwright.config.ts ${playwrightFlags}`;
const runExpensiveTestPlaywright = testFile
  ? `TEST_DIR="./expensive-tests" npx playwright test ${testFile} --config playwright.config.ts ${playwrightFlags}`
  : `TEST_DIR="./expensive-tests" npx playwright test --config playwright.config.ts ${playwrightFlags}`;

const serverStart = async (name, port, cmd) =>
  forceUsingRunningServices && !(await isPortAvailabe(port, name)) ? ':' : cmd;

const serverStartCommands = async () => [
  await serverStart('Postgres', portForPostgres, startPostgres),
  await serverStart('Frontend', portForFrontend, startFrontend),
  await serverStart('REIS', portForREIS, startREIS),
  await serverStart('Backend', portForBackend, startBackend),
  await serverStart('Minio', portForMinio, startMinio),
  await serverStart('MCP-Tool', portForMcpTool, startMcpTool),
];

const runTest = [
  waitForAll,
  installPlaywright,
  withNormalTests ? runE2eTestPlaywright : 'echo skip regular e2e-tests',
  withExtensionTests
    ? runExtensionTestPlaywright
    : 'echo skip extension e2e-tests',
  withExpensiveTests
    ? runExpensiveTestPlaywright
    : 'echo skip expensive e2e-tests',
].join(' && ');

// --------------------------------------------------------------------------------
// -- Running Commands and Handling Kill Signals ----------------------------------
// --------------------------------------------------------------------------------

const mainScript = async () => {
  // Check nothing is running and may be overwritten
  if (!forceUsingRunningServices) {
    const somePortNotAvailable = [
      await isPortAvailabe(portForPostgres, 'Postgres', true),
      await isPortAvailabe(portForBackend, 'Backend', true),
      await isPortAvailabe(portForFrontend, 'Frontend', true),
      await isPortAvailabe(portForREIS, 'REIS', true),
      await isPortAvailabe(portForMinio, 'Minio', true),
      await isPortAvailabe(portForMcpTool, 'MCP-Tool', true),
    ].includes(false);
    if (somePortNotAvailable) {
      console.log(' ==> kill running processes before restarting.');
      console.log('     (or: with ":force" you can dangerously force using the running processes instead.');
      await dockerCleanups();
      process.exit(1);
    }
  }

  // Empty line for readability
  console.log();

  // Start all background processes
  const statusProcesses = statusCommands.map((cmd) => execute(cmd));
  const serviceProcesses = (await serverStartCommands()).map((cmd) =>
    execute(cmd, 'silent')
  );
  const allProcesses = [...statusProcesses, ...serviceProcesses];

  // Kill all background processes in case of process kill
  const handleKill = async (allProcesses, exitCode) => {
    console.log('>>> killing all child processes...');
    execute(
      `cd ${devSetup ? 'dev' : 'e2e'}/postgres && ${dockerComposeDown}`,
      'forward',
      async () => {
        await killAllAndExit(allProcesses, exitCode);
      }
    );
  };
  process.once('SIGINT', async () => {
    await handleKill(allProcesses, 1);
  });
  process.once('SIGTERM', async () => {
    await handleKill(allProcesses, 1);
  });

  // Run Servers (and tests)
  execute(
    !devSetup | forceTestsOnDev ? runTest : waitForAll,
    'forward',
    async (exitCode) => {
      if (noAutoKill) {
        console.log();
        console.log('Press CTRL+C to stop all processes and servers');
      } else {
        // Node may terminate itself early, once all the sub-processes are killed.
        // The following tries to make sure the exit-code forwarding from runTest will work in such cases.
        process.on('beforeExit', () => {
          process.exit(exitCode);
        });
        await handleKill(allProcesses, exitCode);
      }
    }
  );
};
mainScript().then();
