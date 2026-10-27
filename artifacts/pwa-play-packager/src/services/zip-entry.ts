import type JSZip from 'jszip';

export const MAX_ZIP_ENTRY_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_EXPANDED_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_BYTES = 512 * 1024;

export function assertSafeZipPath(path: string): void {
  if (!path || /^[\\/]|^[A-Za-z]:/.test(path) || /[\u0000-\u001f\u007f]/.test(path)
    || path.split(/[\\/]/).some(part => part === '..')) {
    throw new Error('Archive contains an unsafe file path. Use a ZIP with relative project paths.');
  }
}

/** Public JSZip streaming API; never collect an unbounded expanded file. */
export function readZipEntry(entry: JSZip.JSZipObject, remainingBytes: number, includeText: boolean): Promise<{ size: number; content?: string }> {
  return new Promise((resolve, reject) => {
    // JSZip 3.10.1 exposes this documented browser streaming method, while its
    // bundled JSZipObject declaration omits it. Check that narrow capability;
    // do not inspect the private compression metadata that caused TS2339.
    const streaming = entry as JSZip.JSZipObject & {
      internalStream?: (type: 'uint8array') => JSZip.JSZipStreamHelper<Uint8Array>;
    };
    if (typeof streaming.internalStream !== 'function') {
      reject(new Error('This ZIP reader does not support bounded entry analysis.'));
      return;
    }
    const stream = streaming.internalStream('uint8array');
    let size = 0;
    let settled = false;
    const chunks: Uint8Array[] = [];
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      stream.pause();
      chunks.length = 0;
      reject(error);
    };
    stream.on('data', (chunk: Uint8Array) => {
      if (settled) return;
      size += chunk.byteLength;
      if (size > MAX_ZIP_ENTRY_BYTES) return fail(new Error('A ZIP entry expands beyond 10 MiB. Remove large generated or binary files.'));
      if (size > remainingBytes) return fail(new Error('The ZIP expands beyond the 50 MiB analysis limit.'));
      if (includeText && size <= MAX_TEXT_BYTES) chunks.push(chunk);
      else chunks.length = 0;
    });
    stream.on('error', (error: Error) => fail(error));
    stream.on('end', () => {
      if (settled) return;
      settled = true;
      if (!includeText || size > MAX_TEXT_BYTES) { resolve({ size }); return; }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      resolve({ size, content: new TextDecoder().decode(bytes) });
    });
    stream.resume();
  });
}
