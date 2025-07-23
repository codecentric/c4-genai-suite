import { spawn } from 'child_process';
import treeKill from 'tree-kill';

const killProcess = (childProcess) =>
  new Promise((resolve, reject) => {
    try {
      treeKill(childProcess.pid, 'SIGTERM');
      childProcess.on('exit', resolve);
      childProcess.on('error', reject);
    } catch (error) {
      reject(`Error killing process: ${error}`);
    }
  });

const executeQuery = (command) => {
  const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
  const flag = process.platform === 'win32' ? '/c' : '-c';

  return new Promise((resolve, reject) => {
    const child = spawn(shell, [flag, command]);

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(`Command failed with exit code ${code}`);
      }
    });
  });
};

export const execute = (command, output = 'forward', onClose = null) => {
  const nvmPrefix =
    'export NVM_DIR="$HOME/.nvm"; ' +
    '[ -s "$NVM_DIR/nvm.sh" ] && echo "[DEBUG] Sourcing nvm.sh..." && source "$NVM_DIR/nvm.sh"; ' +
    'echo "[DEBUG] source exit code: $?"; ' +
    'nvm install && echo "[DEBUG] nvm install done." || echo "[ERROR] nvm.sh not found or failed to source."; ';

  // Enable debugging via vscode terminal
  const insideVscode =
    'VSCODE_PID' in process.env ||
    'TERM_PROGRAM' in process.env && process.env.TERM_PROGRAM === 'vscode' ||
    'VSCODE_CWD' in process.env;

  const linuxShell = insideVscode ? 'bash' : 'sh';
  const fullCommand = insideVscode ? `${nvmPrefix} ${command}` : command;
  console.log(`linuxShell: ${linuxShell}, fullCommand: ${fullCommand}`);

  const shell = process.platform === 'win32' ? 'cmd.exe' : linuxShell;
  const flag = process.platform === 'win32' ? '/c' : '-c';

  const child = spawn(shell, [flag, fullCommand]);

  if (output === 'forward') {
    child.stdout.on('data', (data) => console.log(data.toString()));
    child.stderr.on('data', (data) => console.error(data.toString()));
  }

  if (output === 'status') {
    console.log(`[starting...] ${command}`);
    child.on('close', (code) => console.log(`[exit-code ${code}] ${command}`));
  }

  if (onClose !== null) {
    child.on('close', onClose);
  }

  return child;
};

export const killAllAndExit = async (childProcesses, exitCode) => {
  try {
    await Promise.all(childProcesses.map(killProcess));
    process.exit(exitCode);
  } catch (error) {
    console.error('Error killing processes:', error);
    process.exit(1);
  }
};

export const isPortAvailabe = async (wantedPort, serviceName, verbose = false) => {
  const availabePort = (await executeQuery(`npx detect ${wantedPort}`)).trim();
  const isAvailabe = availabePort === wantedPort;
  const status = isAvailabe ? 'free' : 'NOT availabe';
  const warn = isAvailabe ? '[  OK  ]' : '[ERROR!]';
  if (verbose)
    console.log(`${warn} Port ${wantedPort} is ${status} for ${serviceName}`);
  return isAvailabe;
};
