import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import type { CredentialEncryption } from './devkit/types';

export function assistantDataDirectory(): string {
  return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'icegozi-video', 'assistant');
}

// DPAPI binds ciphertext to the current Windows account; secrets travel only on stdin.
export function windowsCredentialEncryption(): CredentialEncryption {
  const transform = (input: string, decrypt: boolean): Promise<string> => new Promise((resolve, reject) => {
    const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const operation = decrypt ? 'Unprotect' : 'Protect';
    const script = `Add-Type -AssemblyName System.Security; $payload=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[Security.Cryptography.ProtectedData]::${operation}($payload,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result))`;
    const child = spawn(executable, ['-NoProfile', '-NonInteractive', '-Command', script], {
      stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, shell: false,
      env: { SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP },
    });
    let output = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Secure storage timeout')); }, 15_000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('ascii');
      if (output.length > 4 * 1024 * 1024) child.kill();
    });
    child.once('error', () => { clearTimeout(timer); reject(new Error('Secure storage unavailable')); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !output || !/^[A-Za-z0-9+/=]+$/.test(output)) reject(new Error('Secure storage failed'));
      else resolve(output);
    });
    child.stdin.on('error', () => child.kill());
    child.stdin.end(input);
  });
  return {
    id: 'windows-dpapi-current-user-v1',
    isAvailable: () => process.platform === 'win32',
    encrypt: async (plaintext) => Buffer.from(await transform(Buffer.from(plaintext, 'utf8').toString('base64'), false), 'base64'),
    decrypt: async (ciphertext) => Buffer.from(await transform(Buffer.from(ciphertext).toString('base64'), true), 'base64').toString('utf8'),
  };
}
