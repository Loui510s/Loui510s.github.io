// site bootstrap: load shared header and initialize UI
(function () {
  // fetch and inject header.html into the page (if present)
  function loadHeader() {
    return new Promise(function (resolve) {
      try {
        var placeholder = document.getElementById('site-header');
        if (!placeholder) {
          // if no placeholder, resolve immediately
          return resolve();
        }
        var url = 'header.html';
        fetch(url).then(function (res) {
          if (!res.ok) return resolve();
          return res.text();
        }).then(function (html) {
          if (html && placeholder) placeholder.innerHTML = html;
          resolve();
        }).catch(function () { resolve(); });
      } catch (e) { resolve(); }
    });
  }

  function highlightCurrent() {
    var current = document.body && document.body.dataset && document.body.dataset.page;
    if (current) {
      document.querySelectorAll('.nav a[data-page]').forEach(function (a) {
        if (a.dataset.page === current) a.classList.add('active');
      });
    }
  }
  
  // fetch and inject footer.html into #site-footer placeholder
  function loadFooter() {
    return new Promise(function (resolve) {
      try {
        var placeholder = document.getElementById('site-footer');
        if (!placeholder) return resolve();
        var url = 'footer.html';
        fetch(url).then(function (res) {
          if (!res.ok) return resolve();
          return res.text();
        }).then(function (html) {
          if (html && placeholder) {
            placeholder.innerHTML = html;
            // set year if footer contains target span
            try { var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear(); } catch (e) {}
          }
          resolve();
        }).catch(function () { resolve(); });
      } catch (e) { resolve(); }
    });
  }

  // helper: escape simple HTML characters
  function _escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // renderGallery: builds gallery markup and wires activation handlers
  function renderGallery(containerId) {
    containerId = containerId || 'gallery';
    var data = window.GALLERY || [];
    var el = document.getElementById(containerId);
    if (!el) return;

    // clear existing
    el.innerHTML = '';

    data.forEach(function (item, idx) {
      var fig = document.createElement('figure');

      var img = document.createElement('img');
      img.src = item.src || '';
      img.alt = item.alt || '';
      img.setAttribute('loading', 'lazy');
      img.tabIndex = 0;

      // caption (optional)
      if (item.caption) {
        var cap = document.createElement('figcaption');
        cap.textContent = item.caption;
        fig.appendChild(cap);
      }

      fig.appendChild(img);
      el.appendChild(fig);

      // activation handlers: click and keyboard (Enter / Space)
      img.addEventListener('click', function () { openLightbox(idx, img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx, img); }
      });
    });
  }

  // overlay singleton cache
  var __overlay = null;

  // search index cache
  var __searchIndex = null;

  // create and inject search UI into the nav
  function _createSearch() {
    try {
      var nav = document.querySelector('.nav');
      if (!nav) return;
      // avoid duplicate
      if (nav.querySelector('.search-container')) return;

      var container = document.createElement('div');
      container.className = 'search-container';

      var input = document.createElement('input');
      input.className = 'search-input';
      input.type = 'search';
      input.placeholder = 'Search images (filename or caption)';
      input.setAttribute('aria-label', 'Search images by filename or caption');

      var clear = document.createElement('button');
      clear.className = 'search-clear';
      clear.type = 'button';
      clear.title = 'Clear search';
      clear.textContent = '✕';

      container.appendChild(input);
      container.appendChild(clear);

      // insert before the nav's UL if present, else append
      var ul = nav.querySelector('ul');
      if (ul && ul.parentNode === nav) nav.insertBefore(container, ul);
      else nav.appendChild(container);

      // events
      var timeout = null;
      input.addEventListener('input', function (e) {
        clear.style.display = input.value ? 'inline' : 'none';
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(function () { performSearch(input.value || ''); }, 150);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; performSearch(''); clear.style.display = 'none'; }
      });
      clear.addEventListener('click', function () { input.value = ''; performSearch(''); clear.style.display = 'none'; input.focus(); });
      clear.style.display = 'none';

      // build index lazily on first focus
      input.addEventListener('focus', function () { if (!__searchIndex) __buildSearchIndex(); });
    } catch (err) { /* non-fatal */ }
  }

  // build a light-weight search index from page content
  function __buildSearchIndex() {
    __searchIndex = [];
    // If this page has a gallery defined via window.GALLERY, index it
    try {
      var galleryEl = document.getElementById('gallery');
      if (galleryEl && window.GALLERY && window.GALLERY.length) {
        var figs = galleryEl.querySelectorAll('figure');
        for (var i = 0; i < window.GALLERY.length; i++) {
          var it = window.GALLERY[i] || {};
          var fig = figs[i] || null;
          var filename = (it.src || '').split('/').pop() || '';
          __searchIndex.push({ type: 'gallery', src: it.src || '', filename: filename.toLowerCase(), caption: (it.caption||'').toLowerCase(), el: fig, idx: i });
        }
        return;
      }
    } catch (e) { /* ignore */ }

    // Otherwise, index featured cards and inline images on the page
    try {
      var cards = document.querySelectorAll('.card');
      if (cards && cards.length) {
        cards.forEach(function (c) {
          var a = c.closest('a') || c;
          var img = c.querySelector('img');
          var cap = c.querySelector('.caption');
          var src = img && img.getAttribute('src') || '';
          var filename = src.split('/').pop() || '';
          __searchIndex.push({ type: 'card', src: src, filename: filename.toLowerCase(), caption: (cap && cap.textContent||img && img.alt||'').toLowerCase(), el: a });
        });
        return;
      }
    } catch (e) { /* ignore */ }

    // fallback: index any images on the page
    try {
      var imgs = document.querySelectorAll('img');
      imgs.forEach(function (img) {
        var src = img.getAttribute('src') || '';
        var filename = src.split('/').pop() || '';
        __searchIndex.push({ type: 'img', src: src, filename: filename.toLowerCase(), caption: (img.alt||'').toLowerCase(), el: img });
      });
    } catch (e) { /* ignore */ }
  }

  // perform a live search; filters gallery figs or card anchors in-place
  function performSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!__searchIndex) __buildSearchIndex();
    if (!__searchIndex) return;

    if (q === '') {
      // show everything
      __searchIndex.forEach(function (it) {
        if (!it.el) return;
        it.el.style.display = '';
      });
      return;
    }

    __searchIndex.forEach(function (it) {
      if (!it.el) return;
      var match = false;
      if (it.filename && it.filename.indexOf(q) !== -1) match = true;
      if (!match && it.caption && it.caption.indexOf(q) !== -1) match = true;
      it.el.style.display = match ? '' : 'none';
    });
  }

  // create overlay DOM (single instance)
  function _createOverlay() {
    if (__overlay) return __overlay;
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');

    var inner = '';
    inner += '<div class="lightbox" role="dialog" aria-modal="true">';
    inner += '  <div class="lightbox__inner">';
  inner += '    <button class="close" aria-label="Close">×</button>';
  inner += '    <div class="lightbox-counter" aria-hidden="true"></div>';
  inner += '    <button class="nav-btn prev" aria-label="Previous image">‹</button>';
  inner += '    <button class="nav-btn next" aria-label="Next image">›</button>';
    inner += '    <div class="media"><img src="" alt="" /></div>';
    inner += '    <div id="lightbox-caption" class="caption"></div>';
    inner += '  </div>';
    inner += '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    var closeBtn = overlay.querySelector('.close');
    var prevBtn = overlay.querySelector('.nav-btn.prev');
    var nextBtn = overlay.querySelector('.nav-btn.next');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function () { showIndex((overlay.__currentIndex || 0) - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showIndex((overlay.__currentIndex || 0) + 1); });

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLightbox(); });

    __overlay = overlay;
    return overlay;
  }

  function openLightbox(index, triggerEl) {
    index = typeof index === 'number' ? index : 0;
    var gallery = window.GALLERY || [];
    if (!gallery.length) return;
    var overlay = _createOverlay();

    var figs = document.querySelectorAll('.gallery figure');
    for (var f = 0; f < figs.length; f++) figs[f].classList.remove('focused');
    if (triggerEl && triggerEl.closest) {
      var fig = triggerEl.closest('figure'); if (fig) fig.classList.add('focused');
    }

    overlay.__previouslyFocused = document.activeElement;
    overlay.style.display = 'flex';
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('has-lightbox');

    overlay.__docKeyHandler = docKeyHandler;
    document.addEventListener('keydown', overlay.__docKeyHandler);

    var dialog = overlay.querySelector('.lightbox');
    if (dialog) dialog.setAttribute('aria-labelledby', 'lightbox-caption');

    showIndex(index);

    var closeB = overlay.querySelector('.close');
    setTimeout(function () { if (closeB) closeB.focus(); }, 10);
  }

  function closeLightbox() {
    var overlay = _createOverlay();
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('has-lightbox');

    if (overlay.__docKeyHandler) document.removeEventListener('keydown', overlay.__docKeyHandler);

    var figs = document.querySelectorAll('.gallery figure');
    for (var f = 0; f < figs.length; f++) figs[f].classList.remove('focused');

    var prev = overlay.__previouslyFocused;
    if (prev && typeof prev.focus === 'function') prev.focus();
  }

  function docKeyHandler(e) {
    var overlay = _createOverlay();
    if (!overlay || overlay.style.display === 'none') return;

    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key === 'ArrowLeft') { showIndex((overlay.__currentIndex || 0) - 1); return; }
    if (e.key === 'ArrowRight') { showIndex((overlay.__currentIndex || 0) + 1); return; }

    if (e.key === 'Tab') {
      var focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables || focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function showIndex(index) {
    var gallery = window.GALLERY || [];
    if (!gallery || gallery.length === 0) return;
    var overlay = _createOverlay();
    if (!overlay) return;

    var len = gallery.length;
    var i = ((index % len) + len) % len;
    overlay.__currentIndex = i;

    var item = gallery[i] || {};
    var imgEl = overlay.querySelector('.media img');
  var capEl = overlay.querySelector('#lightbox-caption');
    var dialog = overlay.querySelector('.lightbox');
  var counterEl = overlay.querySelector('.lightbox-counter');

    var src = (item.fullSrc || item.src) || '';
    imgEl.style.opacity = 0;
    imgEl.onload = function () { imgEl.style.opacity = 1; };
    imgEl.src = src;
    imgEl.alt = item.alt || '';
    if (capEl) capEl.textContent = item.caption || '';
  if (counterEl) counterEl.textContent = (i + 1) + '/' + len;
    if (dialog) dialog.setAttribute('aria-labelledby', 'lightbox-caption');

    var closeBtn = overlay.querySelector('.close');
    if (closeBtn) closeBtn.focus();

    var prevItem = gallery[(i - 1 + len) % len];
    var nextItem = gallery[(i + 1) % len];
    [prevItem, nextItem].forEach(function (it) { var url = it && (it.fullSrc || it.src); if (!url) return; var p = new Image(); p.src = url; });
  }

    // expose API
    window.renderGallery = renderGallery;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;

    // ensure header and footer are loaded, then highlight nav and create search UI
    try {
      loadHeader().then(function () {
        return loadFooter();
      }).then(function () {
        highlightCurrent();
        _createSearch();
      }).catch(function () { try { highlightCurrent(); _createSearch(); } catch (e) {} });
    } catch (e) { try { highlightCurrent(); _createSearch(); } catch (err) {} }
  })();
