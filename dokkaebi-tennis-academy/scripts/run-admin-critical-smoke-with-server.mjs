import { spawn } from 'node:child_process';

const SERVER_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEALTH_PATH = process.env.SMOKE_HEALTH_PATH || '/';
const HEALTH_URL = new URL(HEALTH_PATH, SERVER_URL).toString();
const START_CMD = process.env.SMOKE_SERVER_CMD || 'pnpm';
const START_ARGS = process.env.SMOKE_SERVER_ARGS ? process.env.SMOKE_SERVER_ARGS.split(' ') : ['start'];
const MAX_RETRIES = Number(process.env.SMOKE_HEALTH_RETRIES || 30);
const RETRY_DELAY_MS = Number(process.env.SMOKE_HEALTH_DELAY_MS || 1000);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async () => {
  for (let i = 1; i <= MAX_RETRIES; i += 1) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        console.log(`[admin-critical-wrapper] server is healthy: ${HEALTH_URL}`);
        return;
      }
      console.log(`[admin-critical-wrapper] health check retry ${i}/${MAX_RETRIES}: ${res.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[admin-critical-wrapper] health check retry ${i}/${MAX_RETRIES}: ${message}`);
    }
    await delay(RETRY_DELAY_MS);
  }

  throw new Error(
    `[admin-critical-wrapper] 서버가 준비되지 않았습니다. 확인 URL=${HEALTH_URL}, retries=${MAX_RETRIES}, delayMs=${RETRY_DELAY_MS}`,
  );
};

const run = async () => {
  console.log(`[admin-critical-wrapper] starting server: ${START_CMD} ${START_ARGS.join(' ')}`);

  const server = spawn(START_CMD, START_ARGS, {
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  const shutdownServer = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  };

  process.on('SIGINT', shutdownServer);
  process.on('SIGTERM', shutdownServer);

  try {
    await waitForHealth();

    await new Promise((resolve, reject) => {
      const smoke = spawn('node', ['scripts/admin-critical-smoke.mjs'], {
        env: {
          ...process.env,
          BASE_URL: SERVER_URL,
        },
        stdio: 'inherit',
      });

      smoke.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`[admin-critical-wrapper] smoke failed with exit code ${code ?? 'unknown'}`));
      });

      smoke.on('error', (error) => {
        reject(error);
      });
    });
  } finally {
    shutdownServer();
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
