import { spawn } from "node:child_process";

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
  }
}

export function runCommand(
  cmd: string,
  args: string[],
  options?: { timeoutMs?: number; stdin?: Buffer },
): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new FfmpegError(`${cmd} timed out`, Buffer.concat(stderr).toString("utf8")));
    }, options?.timeoutMs ?? 180_000);

    child.stdout.on("data", (chunk) => stdout.push(chunk as Buffer));
    child.stderr.on("data", (chunk) => stderr.push(chunk as Buffer));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const errText = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(new FfmpegError(`${cmd} exited ${code}`, errText));
        return;
      }
      resolve({ stdout: Buffer.concat(stdout), stderr: errText });
    });
    if (options?.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

export function ffmpeg(args: string[], timeoutMs = 180_000) {
  return runCommand("ffmpeg", ["-hide_banner", "-y", ...args], { timeoutMs });
}

export function ffprobe(args: string[], timeoutMs = 30_000) {
  return runCommand("ffprobe", ["-hide_banner", ...args], { timeoutMs });
}
