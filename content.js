/*
 * 讀取 content.json，把文字、價格、照片填進頁面。
 * 讀不到 content.json 時（例如直接雙擊打開 html 檔），頁面會保留 html 裡原本寫好的內容。
 *
 *  data-c="路徑"          → 把那個欄位的文字放進這個元素（換行會變成 <br>）
 *  data-render="種類"     → 用清單內容重新產生這一區（段落、方案、問答…）
 *  data-src="路徑"        → 搭配 data-render，指定要用哪一份清單
 *
 * 內容填好後會發出 "content:ready" 事件，頁面上的其他程式可以接著更新。
 */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = s => esc(s).replace(/\n/g, '<br>');
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  // 後台存的圖片路徑可能是 "/images/xx.jpg"，去掉開頭的 / 讓網站放在子路徑時也找得到
  const img = p => String(p || '').replace(/^\/+/, '');
  const isPrice = p => /^[\d,.\s]+$/.test(String(p || ''));

  const renderers = {
    paragraphs: list => list.map(t => `<p>${lines(t)}</p>`).join(''),

    steps: list => list.map(s => `<li><div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div></li>`).join(''),

    faq: list => list.map(f => `
      <details class="glass">
        <summary>${esc(f.q)}</summary>
        <p>${lines(f.a)}</p>
      </details>`).join(''),

    plans: list => list.map(p => `
      <article class="tile plan ${p.featured ? 'featured' : 'glass'}">
        ${p.image ? `<img class="plan-img" src="${esc(img(p.image))}" alt="${esc(p.name)}" loading="lazy">` : ''}
        ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}
        <h3>${esc(p.name)}</h3>
        <div class="what">${esc(p.what)}</div>
        <div class="amount${isPrice(p.price) ? '' : ' amount-text'}">${isPrice(p.price) ? '<span>NT$</span>' : ''}${esc(p.price)}</div>
        <div class="per">${esc(p.per)}</div>
        <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <a class="btn" href="#trial" data-plan-link="${esc(p.id)}">${esc(p.button)}</a>
      </article>`).join(''),

    'plan-options': list =>
      list.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('') +
      '<option value="unsure">還不確定，想先聽介紹</option>'
  };

  function apply(data) {
    document.querySelectorAll('[data-c]').forEach(el => {
      const v = get(data, el.dataset.c);
      if (v !== undefined && v !== null) el.innerHTML = lines(v);
    });
    document.querySelectorAll('[data-render]').forEach(el => {
      const fn = renderers[el.dataset.render];
      const list = get(data, el.dataset.src || '');
      if (fn && Array.isArray(list)) el.innerHTML = fn(list);
    });
    document.dispatchEvent(new CustomEvent('content:ready', { detail: data }));
  }

  fetch('content.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(apply)
    .catch(err => console.info('content.json 未載入，使用頁面內建內容。', err));
})();
