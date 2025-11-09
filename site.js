// site bootstrap: load shared header and initialize UI
(function () {
  // fetch and inject header.html into the page (if present)
  function loadHeader() {
    var DEFAULT_HEADER_HTML = '<header>\n  <nav class="nav">\n    <a class="brand" href="index.html">Loui510s</a>\n    <p style="margin:0 8px;color:#888">||</p>\n    <a class="brand" href="https://www.instagram.com/louie.flo05/">Louie.flo05</a>\n    <ul>\n      <li><a data-page="home" href="index.html">Home</a></li>\n      <li><a data-page="nature" href="nature.html">Nature</a></li>\n      <li><a data-page="astro" href="astro.html">Astro</a></li>\n      <li><a data-page="landscape" href="landscape.html">Landscape</a></li>\n      <li><a data-page="other" href="other.html">Other</a></li>\n      <li><a data-page="about me" href="aboutme.html">About</a></li>\n    </ul>\n  </nav>\n</header>';
    return new Promise(function (resolve) {
      try {
        var placeholder = document.getElementById('site-header');
        if (!placeholder) {
          // if no placeholder, resolve immediately
          return resolve();
        }
        var url = 'header.html';
        fetch(url).then(function (res) {
          if (!res.ok) return DEFAULT_HEADER_HTML;
          return res.text();
        }).then(function (html) {
          if (html && placeholder) placeholder.innerHTML = html;
          resolve();
        }).catch(function () {
          try { if (placeholder) placeholder.innerHTML = DEFAULT_HEADER_HTML; } catch (e) { }
          resolve();
        });
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
    var DEFAULT_FOOTER_HTML = '<footer>\n  © <span id="y"></span> Louie Olsen · <span class="small">All photos © their owner.</span>\n</footer>';
    return new Promise(function (resolve) {
      try {
        var placeholder = document.getElementById('site-footer');
        if (!placeholder) return resolve();
        var url = 'footer.html';
        fetch(url).then(function (res) {
          if (!res.ok) return DEFAULT_FOOTER_HTML;
          return res.text();
        }).then(function (html) {
          if (html && placeholder) {
            placeholder.innerHTML = html;
            // set year if footer contains target span
            try { var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear(); } catch (e) {}
          }
          resolve();
        }).catch(function () {
          try {
            if (placeholder) {
              placeholder.innerHTML = DEFAULT_FOOTER_HTML;
              try { var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear(); } catch (e) {}
            }
          } catch (e) {}
          resolve();
        });
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
      img.alt = item.alt || '';
      img.decoding = 'async';
      img.tabIndex = 0;

      var supportsNativeLazy = 'loading' in HTMLImageElement.prototype;
      if (supportsNativeLazy) {
        if (idx <= 1) {
          img.setAttribute('loading', 'eager');
          try { img.setAttribute('fetchpriority', 'high'); } catch (e) {}
        } else {
          img.setAttribute('loading', 'lazy');
        }
        img.src = item.src || '';
      } else {
        img.dataset.src = item.src || '';
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      }

      if (item.width) img.width = item.width;
      if (item.height) img.height = item.height;

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
      // start observing if native lazy isn't supported
      if (!('loading' in HTMLImageElement.prototype) && img.dataset && img.dataset.src) {
        if (!__imgObserver) {
          try {
            __imgObserver = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var im = entry.target;
                var real = im.dataset && im.dataset.src;
                if (real) { im.src = real; im.removeAttribute('data-src'); }
                try { __imgObserver.unobserve(im); } catch (e) {}
              });
            }, { rootMargin: '200px' });
          } catch (e) { __imgObserver = null; }
        }
        try { if (__imgObserver) __imgObserver.observe(img); } catch (e) {}
      }
    });
  }

  // overlay singleton cache
  var __overlay = null;

  // search index cache
  var __searchIndex = null;
  
  // image lazy observer (fallback for browsers without native loading=lazy)
  var __imgObserver = null;

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
  inner += '    <button class="info-btn" aria-label="More information" aria-expanded="false" aria-controls="lightbox-meta">i</button>';
  inner += '    <div class="lightbox-counter" aria-hidden="true"></div>';
  inner += '    <button class="nav-btn prev" aria-label="Previous image">‹</button>';
  inner += '    <button class="nav-btn next" aria-label="Next image">›</button>';
  inner += '    <div class="media"><img src="" alt="" /></div>';
  inner += '    <div id="lightbox-caption" class="caption"></div>';
  inner += '    <div id="lightbox-meta" class="lightbox-meta" aria-live="polite"></div>';
    inner += '  </div>';
    inner += '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

  var closeBtn = overlay.querySelector('.close');
  var infoBtn = overlay.querySelector('.info-btn');
  var prevBtn = overlay.querySelector('.nav-btn.prev');
  var nextBtn = overlay.querySelector('.nav-btn.next');

    // small tooltip/hint for keyboard users
    try { if (infoBtn) infoBtn.title = 'More information (press I)'; } catch (e) {}

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (infoBtn) {
      infoBtn.addEventListener('click', function () {
        try {
          var dialog = overlay.querySelector('.lightbox');
          var meta = overlay.querySelector('#lightbox-meta');
          if (!meta || !dialog) return;
          var isOpen = dialog.classList.toggle('meta-open');
          infoBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          // ensure meta is visible when opened
          meta.style.display = isOpen ? '' : 'none';
          if (isOpen) {
            try { meta.focus && meta.focus(); } catch (e) {}
          }
        } catch (e) {}
      });
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { showIndex((overlay.__currentIndex || 0) - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showIndex((overlay.__currentIndex || 0) + 1); });

    // (zoom/fullscreen removed) 

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLightbox(); });

    __overlay = overlay;
    return overlay;
  }

  // best-effort EXIF extraction (very small heuristic): fetch binary and search for common tags
  function tryExtractExif(url) {
    return new Promise(function (resolve) {
      if (!url) return resolve(null);
      // If exif-js is available, prefer it for reliable extraction
      function useHeuristic() {
        try {
          fetch(url).then(function (res) { return res.arrayBuffer(); }).then(function (buf) {
            try {
              var s = new TextDecoder('iso-8859-1').decode(buf);
              var result = {};
              var dateM = s.match(/(\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/);
              if (dateM) result.dateTaken = dateM[1];
              var makeM = s.match(/Make\\x00{0,2}(.{1,40})\\x00/);
              if (!makeM) makeM = s.match(/Make[^A-Za-z0-9]{0,3}([A-Za-z0-9 \-\_]{2,40})/);
              if (makeM) result.make = (makeM[1]||'').trim();
              var modelM = s.match(/Model\\x00{0,2}(.{1,60})\\x00/);
              if (!modelM) modelM = s.match(/Model[^A-Za-z0-9]{0,3}([A-Za-z0-9 \-\_]{2,60})/);
              if (modelM) result.model = (modelM[1]||'').trim();
              var lensM = s.match(/LensModel\\x00{0,2}(.{1,60})\\x00/);
              if (!lensM) lensM = s.match(/Lens[^A-Za-z0-9]{0,3}([A-Za-z0-9 \-\_]{2,60})/);
              if (lensM) result.lens = (lensM[1]||'').trim();
              if (!result.dateTaken && !result.make && !result.model && !result.lens) return resolve(null);
              resolve(result);
            } catch (e) { resolve(null); }
          }).catch(function () { resolve(null); });
        } catch (e) { resolve(null); }
      }

      // If EXIF library is available, use it
      if (window.EXIF) {
        try {
          var img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = function () {
            try {
              window.EXIF.getData(img, function () {
                var dt = window.EXIF.getTag(this, 'DateTimeOriginal') || window.EXIF.getTag(this, 'DateTime');
                var make = window.EXIF.getTag(this, 'Make');
                var model = window.EXIF.getTag(this, 'Model');
                var lens = window.EXIF.getTag(this, 'LensModel') || window.EXIF.getTag(this, 'Lens');
                var res = {};
                if (dt) res.dateTaken = dt;
                if (make || model) res.make = (make||'') + (model ? (' ' + model) : '');
                if (lens) res.lens = lens;
                resolve(Object.keys(res).length ? res : null);
              });
            } catch (e) { useHeuristic(); }
          };
          img.onerror = function () { useHeuristic(); };
          img.src = url;
          return;
        } catch (e) { /* fall through to heuristic */ }
      }

      // try to load exif-js dynamically; if loaded, it will be used on next call
      try {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/exif-js';
        s.async = true;
        s.onload = function () {
          try { if (window.EXIF) { /* now try again using EXIF */ tryExtractExif(url).then(resolve).catch(function(){ resolve(null); }); return; } } catch (e) {}
          useHeuristic();
        };
        s.onerror = function () { useHeuristic(); };
        document.head.appendChild(s);
      } catch (e) { useHeuristic(); }
    });
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

    // 'i' toggles the metadata/info panel when lightbox is open
    if (e.key === 'i' || e.key === 'I') {
      try {
        var dialog = overlay.querySelector('.lightbox');
        var meta = overlay.querySelector('#lightbox-meta');
        var infoBtn = overlay.querySelector('.info-btn');
        if (!meta || !dialog) return;
        var isOpen = dialog.classList.toggle('meta-open');
        if (infoBtn) infoBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        meta.style.display = isOpen ? '' : 'none';
        if (isOpen) { try { meta.focus && meta.focus(); } catch (err) {} }
      } catch (err) {}
      return;
    }

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
    var metaEl = overlay.querySelector('#lightbox-meta');
    var infoBtn = overlay.querySelector('.info-btn');

    var src = (item.fullSrc || item.src) || '';
    imgEl.style.opacity = 0;
    imgEl.onload = function () { imgEl.style.opacity = 1; };
    imgEl.src = src;
    imgEl.alt = item.alt || '';
    if (capEl) capEl.textContent = item.caption || '';
  if (counterEl) counterEl.textContent = (i + 1) + '/' + len;
    // build metadata HTML from known fields if present
    if (metaEl) {
      var parts = [];
      try {
        if (item.dateTaken) parts.push('<div class="meta-row"><strong>Date:</strong> ' + _escapeHtml(item.dateTaken) + '</div>');
        if (item.camera) parts.push('<div class="meta-row"><strong>Camera:</strong> ' + _escapeHtml(item.camera) + '</div>');
        if (item.lens) parts.push('<div class="meta-row"><strong>Lens:</strong> ' + _escapeHtml(item.lens) + '</div>');
        if (item.species) parts.push('<div class="meta-row"><strong>Species:</strong> ' + _escapeHtml(item.species) + '</div>');
        if (item.speciesInfo) parts.push('<div class="meta-row small">' + _escapeHtml(item.speciesInfo) + '</div>');
        if (item.description) parts.push('<div class="meta-row">' + _escapeHtml(item.description) + '</div>');
      } catch (e) { parts = []; }
      metaEl.innerHTML = parts.length ? parts.join('') : ''; 
  // hide metadata panel by default; info button will reveal it
  metaEl.style.display = 'none';
      // metadata exists: keep hidden by default, show info button; if no metadata, hide button
      try {
        if (infoBtn) infoBtn.style.display = parts.length ? '' : 'none';
        if (infoBtn) infoBtn.setAttribute('aria-expanded', 'false');
        // ensure dialog doesn't have meta-open class by default
        if (dialog) dialog.classList.remove('meta-open');
      } catch (e) {}
      // If metadata is missing entirely, attempt a best-effort EXIF extraction
      if (!parts.length) {
        tryExtractExif(item.src).then(function (exif) {
          if (!exif) return;
          var added = [];
          if (exif.dateTaken) added.push('<div class="meta-row"><strong>Date:</strong> ' + _escapeHtml(exif.dateTaken) + '</div>');
          if (exif.make || exif.model) added.push('<div class="meta-row"><strong>Camera:</strong> ' + _escapeHtml(((exif.make||'') + ' ' + (exif.model||'')).trim()) + '</div>');
          if (exif.lens) added.push('<div class="meta-row"><strong>Lens:</strong> ' + _escapeHtml(exif.lens) + '</div>');
          if (added.length) {
            metaEl.innerHTML = added.join('');
            metaEl.style.display = 'none';
            if (infoBtn) { infoBtn.style.display = ''; infoBtn.setAttribute('aria-expanded','false'); }
          }
        }).catch(function(){ });
      }
    }
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
