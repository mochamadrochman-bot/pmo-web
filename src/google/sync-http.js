'use strict';

/**
 * Permintaan HTTP sinkron untuk kode Apps Script lama (UrlFetchApp, DriveApp).
 *
 * Kode lama menunggu jawaban langsung (tidak memakai await). Permintaan dijalankan oleh
 * satu worker thread; thread utama menunggu dengan Atomics.wait sampai jawaban siap.
 * Selama menunggu, server tidak melayani permintaan lain, sama seperti satu eksekusi
 * Apps Script. Karena itu setiap permintaan dibatasi waktu (bawaan 30 detik).
 */

const { Worker, MessageChannel, receiveMessageOnPort } = require('node:worker_threads');

const WORKER_SRC = `
const { parentPort, workerData } = require('node:worker_threads');
parentPort.on('message', async ({ id, reqs, port, signal }) => {
  const one = async (r) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), r.timeoutMs || 30000);
    try {
      const res = await fetch(r.url, {
        method: r.method || 'GET',
        headers: r.headers || {},
        body: r.body === undefined || r.body === null ? undefined : Buffer.from(r.body, 'base64'),
        redirect: r.followRedirects === false ? 'manual' : 'follow',
        signal: ctrl.signal,
      });
      const buf = Buffer.from(await res.arrayBuffer());
      const headers = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return { status: res.status, headers, body: buf.toString('base64') };
    } catch (e) {
      return { error: String(e && e.name === 'AbortError' ? 'Waktu permintaan habis: ' + r.url.split('?')[0] : (e && e.message) || e) };
    } finally {
      clearTimeout(t);
    }
  };
  const results = await Promise.all(reqs.map(one));
  port.postMessage({ id, results });
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
`;

let worker = null;
let seq = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(WORKER_SRC, { eval: true });
    worker.unref();
    worker.on('error', (e) => {
      console.error(JSON.stringify({ ev: 'sync_http_worker_error', message: String(e.message || e) }));
      worker = null;
    });
  }
  return worker;
}

/**
 * reqs: [{ url, method, headers, body (Buffer|string|undefined), timeoutMs, followRedirects }]
 * Mengembalikan [{ status, headers, body: Buffer } | { error }] dalam urutan yang sama.
 */
function requestAllSync(reqs, totalTimeoutMs) {
  if (!reqs.length) return [];
  const w = getWorker();
  const { port1, port2 } = new MessageChannel();
  const signal = new Int32Array(new SharedArrayBuffer(4));
  const id = ++seq;
  const payload = reqs.map((r) => ({
    url: String(r.url),
    method: r.method ? String(r.method).toUpperCase() : 'GET',
    headers: r.headers || {},
    body: r.body === undefined || r.body === null ? null : Buffer.from(r.body).toString('base64'),
    timeoutMs: r.timeoutMs || 30000,
    followRedirects: r.followRedirects,
  }));
  w.postMessage({ id, reqs: payload, port: port2, signal }, [port2]);
  const limit = totalTimeoutMs || Math.max(...payload.map((p) => p.timeoutMs)) + 5000;
  const state = Atomics.wait(signal, 0, 0, limit);
  const msg = receiveMessageOnPort(port1);
  port1.close();
  if (state === 'timed-out' || !msg) throw new Error('Permintaan ke layanan luar tidak dijawab tepat waktu.');
  return msg.message.results.map((r) => (r.error ? r : { status: r.status, headers: r.headers, body: Buffer.from(r.body, 'base64') }));
}

function requestSync(req) {
  const [r] = requestAllSync([req]);
  if (r.error) throw new Error(r.error);
  return r;
}

module.exports = { requestSync, requestAllSync };
