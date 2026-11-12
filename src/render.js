'use strict';

/**
 * Merender halaman ke dalam layout tanpa menambah dependensi.
 * EJS tidak punya layout bawaan; fungsi ini merender view lebih dulu,
 * lalu menyisipkan hasilnya sebagai body ke layout.ejs.
 */
function renderPage(res, view, data) {
  res.render(view, data || {}, (err, html) => {
    if (err) {
      console.error(JSON.stringify({ ev: 'render_fail', view, message: String(err.message || err) }));
      return res.status(500).send('Gagal merender halaman.');
    }
    res.render('layout', { ...(data || {}), body: html });
  });
}

module.exports = { renderPage };
