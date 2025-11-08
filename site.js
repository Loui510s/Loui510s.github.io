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
  el.innerHTML = data.map(item => `
    <figure>
      <img src="${item.src}" alt="${item.alt || ''}">
      ${item.caption ? `<figcaption>${item.caption}</figcaption>` : ''}
    </figure>
  `).join('');
}
