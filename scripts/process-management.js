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
  const debuggerLines = [
    'Waiting for the debugger to disconnect...',
    'Debugger attached.'
  ];

  // Inside vscode, we need to use nvm, since new terminals do not load the nvm environment.
  const nvmPrefix =
    'export NVM_DIR="$HOME/.nvm"; ' +
    '[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"; ' +
    'nvm use > /dev/null; ';

  // Enable debugging via vscode terminal
  const insideVscode =
    'VSCODE_PID' in process.env ||
    'TERM_PROGRAM' in process.env && process.env.TERM_PROGRAM === 'vscode' ||
    'VSCODE_CWD' in process.env;

  const linuxShell = insideVscode ? 'bash' : 'sh';
  const fullCommand = insideVscode ? `${nvmPrefix} ${command}` : command;

  const shell = process.platform === 'win32' ? 'cmd.exe' : linuxShell;
  const flag = process.platform === 'win32' ? '/c' : '-c';

  const child = spawn(shell, [flag, fullCommand]);

  if (output === 'forward') {
    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (!( insideVscode && debuggerLines.some((l)=>text.includes(l)))) process.stdout.write(data);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      if (!( insideVscode && debuggerLines.some((l)=>text.includes(l)))) process.stderr.write(data);
    });
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

export async function dockerCleanups() {
  const { execSync } = await import('child_process');
  try {
    let containers = [];
    try {
      const result = execSync(
        'docker ps --format "{{.Names}}" | grep "^c4-"',
        { encoding: 'utf8' }
      );
      containers = result
        .split('\n')
        .filter((name) => name.trim().length > 0);
    } catch (err) {
      // grep returns exit code 1 if no matches; that's not a real error here
      containers = [];
    }

    if (containers.length > 0) {
      console.log('\n[ERROR!] The following containers may be blocking required ports:');
      containers.forEach((name) => console.log('  -', name));
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Await user input
      const answer = await new Promise((resolve) => {
        rl.question('\nWould you like to stop these containers now? [y/N]: ', resolve);
      });
      rl.close();

      if (answer.trim().toLowerCase() === 'y') {
        try {
          execSync(`docker stop ${containers.join(' ')}`, { stdio: 'inherit' });
          console.log('\nContainers stopped. Please re-run the script.');
        } catch (err) {
          console.error('Failed to stop containers:', err);
        }
      } else {
        console.log('No containers stopped. Exiting.');
      }
      return;
    }
  } catch (err) {
    console.log('Error during Docker cleanup:', err);
    return;
  }
  return;
}
