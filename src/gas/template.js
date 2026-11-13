'use strict';

/**
 * Pengganti HtmlTemplate Apps Script:
 *   <? kode ?>      dijalankan
 *   <?= nilai ?>    dicetak dengan escape HTML
 *   <?!= nilai ?>   dicetak apa adanya
 * Variabel templat (template.x = ...) dan fungsi/konstanta kode lama (include, APP_TITLE, ...)
 * tersedia sebagai nama biasa di dalam templat.
 */

const compiled = new Map(); // kunci -> fungsi hasil kompilasi

function escapeHtml(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toSource(src) {
  let code = 'var __o = [];\n';
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf('<?', i);
    if (start < 0) { code += '__o.push(' + JSON.stringify(src.slice(i)) + ');\n'; break; }
    if (start > i) code += '__o.push(' + JSON.stringify(src.slice(i, start)) + ');\n';
    const end = src.indexOf('?>', start + 2);
    if (end < 0) throw new Error('Tag templat tidak ditutup.');
    const body = src.slice(start + 2, end);
    // Apps Script menerima titik koma di akhir ekspresi: <?!= include('Styles'); ?>
    const expr = (s) => s.replace(/[\s;]+$/, '');
    if (body.startsWith('!=')) code += '__o.push(__raw(' + expr(body.slice(2)) + '));\n';
    else if (body.startsWith('=')) code += '__o.push(__esc(' + expr(body.slice(1)) + '));\n';
    else code += body + '\n';
    i = end + 2;
  }
  code += 'return __o.join("");';
  return code;
}

function compileTemplate(src, name, ctx) {
  const key = name + ':' + src.length;
  let fn = compiled.get(key);
  if (!fn) {
    // eslint-disable-next-line no-new-func
    fn = new Function('__scope', '__data', '__esc', '__raw', 'with (__scope) { with (__data) { ' + toSource(src) + ' } }');
    compiled.set(key, fn);
  }
  const template = {
    evaluate() {
      const data = {};
      Object.keys(template).forEach((k) => { if (k !== 'evaluate' && k !== 'getCode' && k !== 'getRawContent') data[k] = template[k]; });
      const html = fn(ctx.scope, data, escapeHtml, (v) => (v === undefined || v === null ? '' : String(v)));
      return ctx.makeHtmlOutput(html);
    },
    getCode() { return fn.toString(); },
    getRawContent() { return src; },
  };
  return template;
}

module.exports = { compileTemplate, escapeHtml };
