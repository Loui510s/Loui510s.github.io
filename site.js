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
          <div class="media"><img src="" alt="" /></div>
          <div class="caption"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // close on overlay click (but not when clicking the modal content)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeLightbox();
    });
    // close button
    overlay.querySelector('.close').addEventListener('click', closeLightbox);
    // ESC to close & trap focus
    overlay.addEventListener('keydown', lightboxKeyHandler);
  }

  // populate and show
  const imgEl = overlay.querySelector('.media img');
  const capEl = overlay.querySelector('.caption');
  const data = gallery[index];
  imgEl.src = data.src;
  imgEl.alt = data.alt || '';
  capEl.textContent = data.caption || '';

  // mark the clicked figure visually
  document.querySelectorAll('.gallery figure').forEach(f => f.classList.remove('focused'));
  if (triggerEl && triggerEl.closest('figure')) triggerEl.closest('figure').classList.add('focused');

  // save focus and show overlay
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  const closeBtn = overlay.querySelector('.close');
  overlay.__previouslyFocused = document.activeElement;
  // focus the close button for accessibility
  setTimeout(() => closeBtn.focus(), 10);

  // remember currently open overlay on document for external checks
  document.documentElement.classList.add('has-lightbox');

  // ensure focus trap state
  overlay.__firstFocusable = closeBtn;
  overlay.__lastFocusable = imgEl;
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('has-lightbox');

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
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
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
