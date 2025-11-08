// highlight current page link based on body data-page
(function () {
  const current = document.body.dataset.page;
  document.querySelectorAll('.nav a[data-page]').forEach(a => {
    if (a.dataset.page === current) a.classList.add('active');
  });
})();

// Render a gallery when a page provides window.GALLERY (array of {src, alt, caption})
function renderGallery(containerId = 'gallery') {
  const data = window.GALLERY || [];
  const el = document.getElementById(containerId);
  if (!el) return;

  // build gallery figures with data-index and make images keyboard-focusable
  el.innerHTML = data.map((item, i) => `
    <figure data-index="${i}">
      <img src="${item.src}" alt="${item.alt || ''}" tabindex="0" data-index="${i}" />
      ${item.caption ? `<figcaption>${item.caption}</figcaption>` : ''}
    </figure>
  `).join('');

  // attach listeners to images
  el.querySelectorAll('img[data-index]').forEach(img => {
    img.addEventListener('click', e => openLightbox(Number(img.dataset.index), img));
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(Number(img.dataset.index), img);
      }
    });
  });
}

// Accessible lightbox: creates a modal overlay when needed, traps focus, restores focus on close
function openLightbox(index, triggerEl) {
  const gallery = window.GALLERY || [];
  if (!gallery[index]) return;

  // create overlay if missing
  let overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image preview">
        <div class="lightbox__inner">
          <div class="controls"><button class="close" aria-label="Close">Close</button></div>
          <button class="nav-btn prev" aria-label="Previous image">‹</button>
          <button class="nav-btn next" aria-label="Next image">›</button>
          <div class="media"><img src="" alt="" /></div>
          <div class="caption" id="lightbox-caption"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // wire up basic controls
    const closeBtn = overlay.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    const prevBtn = overlay.querySelector('.nav-btn.prev');
    const nextBtn = overlay.querySelector('.nav-btn.next');
    if (prevBtn) prevBtn.addEventListener('click', () => showIndex((overlay.__currentIndex || 0) - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showIndex((overlay.__currentIndex || 0) + 1));

    // close when clicking outside the dialog
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeLightbox();
    });

    // trap keyboard at overlay level
    overlay.addEventListener('keydown', lightboxKeyHandler);
  }

      overlay.addEventListener('keydown', lightboxKeyHandler);
      // prev/next buttons
      overlay.querySelector('.nav-btn.prev').addEventListener('click', () => showIndex(overlay.__currentIndex - 1));
      overlay.querySelector('.nav-btn.next').addEventListener('click', () => showIndex(overlay.__currentIndex + 1));
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeLightbox();
    // mark the clicked figure visually and save the trigger
    document.querySelectorAll('.gallery figure').forEach(f => f.classList.remove('focused'));
    if (triggerEl && triggerEl.closest('figure')) triggerEl.closest('figure').classList.add('focused');
    overlay.__previouslyFocused = document.activeElement;

    // show overlay and set up content
    overlay.style.display = 'flex';
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');

    // ensure caption has id and is used as label
    const capEl = overlay.querySelector('#lightbox-caption');
    const dialog = overlay.querySelector('.lightbox');
    if (capEl) dialog.setAttribute('aria-labelledby', 'lightbox-caption');

    // show requested index
    showIndex(index);

  // remember currently open overlay on document for external checks
  document.documentElement.classList.add('has-lightbox');

  // ensure focus trap state
    overlay.style.display = 'none';
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('has-lightbox');

    // remove focused highlight from figures
    document.querySelectorAll('.gallery figure').forEach(f => f.classList.remove('focused'));

    // restore focus
    const prev = overlay.__previouslyFocused;
    if (prev && typeof prev.focus === 'function') prev.focus();

  // remove focused highlight from figures
  document.querySelectorAll('.gallery figure').forEach(f => f.classList.remove('focused'));

  // restore focus
  const prev = overlay.__previouslyFocused;
  if (prev && typeof prev.focus === 'function') prev.focus();
}

function lightboxKeyHandler(e) {
  const overlay = e.currentTarget;
  if (!overlay) return;
  // ESC closes
  if (e.key === 'Escape') { closeLightbox(); return; }
  // simple Tab trap: keep focus within overlay
  if (e.key === 'Tab') {
    const focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
      return;
    }

    // Left / Right to navigate
    if (e.key === 'ArrowLeft') { showIndex((overlay.__currentIndex || 0) - 1); return; }
    if (e.key === 'ArrowRight') { showIndex((overlay.__currentIndex || 0) + 1); return; }
    const last = focusables[focusables.length - 1];

  // showIndex: updates the overlay to display the image at `index` (wraps around). Preloads neighbors.
  function showIndex(index) {
    const gallery = window.GALLERY || [];
    if (!gallery || gallery.length === 0) return;
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;

    const len = gallery.length;
    // wrap
    let i = ((index % len) + len) % len;
    overlay.__currentIndex = i;

    const item = gallery[i];
    const imgEl = overlay.querySelector('.media img');
    const capEl = overlay.querySelector('#lightbox-caption');
    const dialog = overlay.querySelector('.lightbox');

    // use fullSrc if present, otherwise src
    const src = item.fullSrc || item.src;
    imgEl.style.opacity = 0;
    // set new src, let it fade in when loaded
    imgEl.onload = () => { imgEl.style.opacity = 1; };
    imgEl.src = src;
    imgEl.alt = item.alt || '';
    if (capEl) capEl.textContent = item.caption || '';

    // update aria label reference
    if (capEl) dialog.setAttribute('aria-labelledby', 'lightbox-caption');

    // ensure focus remains reasonable (keep focus on close button)
    const closeBtn = overlay.querySelector('.close');
    if (closeBtn) closeBtn.focus();

    // preload neighbors
    const prev = gallery[(i - 1 + len) % len];
    const next = gallery[(i + 1) % len];
    [prev, next].forEach(it => {
      const url = (it && (it.fullSrc || it.src));
      if (!url) return;
      const p = new Image(); p.src = url;
    });
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
}

// expose for manual testing if needed
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
