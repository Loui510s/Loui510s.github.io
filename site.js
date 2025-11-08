// highlight current page link based on body data-page
(function () {
  var current = document.body && document.body.dataset && document.body.dataset.page;
  if (current) {
    document.querySelectorAll('.nav a[data-page]').forEach(function (a) {
      if (a.dataset.page === current) a.classList.add('active');
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
 
    inner += '    <button class="close" aria-label="Close">×</button>';
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

    var src = (item.fullSrc || item.src) || '';
    imgEl.style.opacity = 0;
    imgEl.onload = function () { imgEl.style.opacity = 1; };
    imgEl.src = src;
    imgEl.alt = item.alt || '';
    if (capEl) capEl.textContent = item.caption || '';
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
  })();
