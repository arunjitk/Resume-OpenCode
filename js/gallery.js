/* ================================================================
   GALLERY.JS — FIELD NOTES Photography Gallery
   Editorial grid rendered from a photo metadata array.
   Lightbox with keyboard nav (Esc, ←/→), Instagram CTA.
   Full light / dark mode support via body.light-mode class.
   ================================================================ */

(function () {
  'use strict';

  // ─── PHOTO METADATA ───────────────────────────────────────────
  // Replace src paths with real images. instagramUrl can be null.
  const PHOTOS = [
    {
      src:          'assets/gallery/photo-01.jpg',
      alt:          'Morning mist over Coorg coffee estates',
      caption:      'Morning Mist — Coorg',
      location:     'Coorg, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     true,   // spans 2 columns on desktop
    },
    {
      src:          'assets/gallery/photo-02.jpg',
      alt:          'Drone shot of Kabini reservoir at golden hour',
      caption:      'Kabini at Golden Hour',
      location:     'Kabini, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-03.jpg',
      alt:          'Street vendor at Mysore market at night',
      caption:      'Night Market',
      location:     'Mysore, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-04.jpg',
      alt:          'Rain-soaked alley in Bangalore old city',
      caption:      'Post-Rain Alley',
      location:     'Bangalore, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-05.jpg',
      alt:          'Silhouette of a cyclist against sunset highway',
      caption:      'The Long Ride',
      location:     'NH-48, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-06.JPG',
      alt:          'Timelapse-style trail of bike lights on mountain road',
      caption:      'Night Trails',
      location:     'Chikkamagaluru, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     true,
    },
    {
      src:          'assets/gallery/photo-07.jpg',
      alt:          'Close-up of a temple lamp during festival',
      caption:      'Festival Flame',
      location:     'Mysore, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-08.jpg',
      alt:          'Fog rolling over Nandi Hills at dawn',
      caption:      'Nandi at Dawn',
      location:     'Nandi Hills, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-09.jpg',
      alt:          'Wide angle of Vidhana Soudha lit at dusk',
      caption:      'Vidhana Soudha',
      location:     'Bangalore, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-010.jpeg',
      alt:          'Monsoon clouds stacking over the Western Ghats',
      caption:      'Monsoon Stacks',
      location:     'Western Ghats, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-011.jpeg',
      alt:          'Aerial view of a winding forest road',
      caption:      'Aerial — Forest Road',
      location:     'Sakleshpur, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     true,
    },
    {
      src:          'assets/gallery/photo-012.JPG',
      alt:          'Old stone steps of a heritage building',
      caption:      'Stepped Stones',
      location:     'Hampi, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-013.JPG',
      alt:          'Backlit portrait of a child at sunset',
      caption:      'Golden Hour — Backcountry',
      location:     'Kodagu, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-014.jpg',
      alt:          'Long exposure of a waterfall in the Ghats',
      caption:      'Silk Water — Abbey Falls',
      location:     'Coorg, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
    {
      src:          'assets/gallery/photo-015.JPG',
      alt:          'Empty highway stretching into the horizon at blue hour',
      caption:      'Blue Hour Highway',
      location:     'Tumkur Road, Karnataka',
      instagramUrl: 'https://www.instagram.com/whoisarun.visuals/',
      featured:     false,
    },
  ];

  // ─── LIGHTBOX STATE ───────────────────────────────────────────
  let currentIndex = -1;
  let lightboxEl   = null;

  // ─── GALLERY EXPANSION STATE ──────────────────────────────────
  let showFullGallery = false;

  // ─── BUILD GRID ───────────────────────────────────────────────
  function render() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    // Show only 2 tiles unless expanded
    const photosToRender = showFullGallery ? PHOTOS : PHOTOS.slice(0, 2);

    grid.innerHTML = photosToRender.map((photo, i) => {
      // Get the actual index in the full PHOTOS array for correct lightbox navigation
      const actualIndex = showFullGallery ? PHOTOS.indexOf(photo) : i;
      return `
      <button
        class="gallery-item${photo.featured ? ' gallery-item--featured' : ''}"
        data-index="${actualIndex}"
        aria-label="Open photo: ${photo.caption}"
        type="button"
      >
        <img
          class="gallery-img"
          src="${photo.src}"
          alt="${photo.alt}"
          loading="lazy"
          decoding="async"
        />
      </button>
    `;
    }).join('');

    // Wire click handlers
    grid.querySelectorAll('.gallery-item').forEach(btn => {
      btn.addEventListener('click', () => openLightbox(parseInt(btn.dataset.index, 10)));
    });

    // Update button text based on state
    updateViewAllButton();
  }

  // ─── LIGHTBOX ─────────────────────────────────────────────────
  function openLightbox(index) {
    currentIndex = index;
    if (!lightboxEl) buildLightbox();
    updateLightboxContent();
    lightboxEl.removeAttribute('hidden');
    lightboxEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightboxEl.querySelector('.lb-close').focus();
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.setAttribute('hidden', '');
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    currentIndex = -1;
  }

  function navigateLightbox(direction) {
    currentIndex = (currentIndex + direction + PHOTOS.length) % PHOTOS.length;
    updateLightboxContent();
  }

  function updateLightboxContent() {
    if (!lightboxEl || currentIndex < 0) return;
    const photo = PHOTOS[currentIndex];

    const img = lightboxEl.querySelector('.lb-img');
    img.src     = photo.src;
    img.alt     = photo.alt;

    lightboxEl.querySelector('.lb-caption').textContent  = photo.caption;
    lightboxEl.querySelector('.lb-location').textContent = photo.location;
    lightboxEl.querySelector('.lb-counter').textContent  = `${currentIndex + 1} / ${PHOTOS.length}`;

    const igLink = lightboxEl.querySelector('.lb-instagram');
    if (photo.instagramUrl) {
      igLink.href = photo.instagramUrl;
      igLink.style.display = '';
    } else {
      igLink.style.display = 'none';
    }
  }

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className    = 'gallery-lightbox';
    lightboxEl.id           = 'gallery-lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.setAttribute('aria-label', 'Photo lightbox');
    lightboxEl.setAttribute('hidden', '');
    lightboxEl.setAttribute('aria-hidden', 'true');

    lightboxEl.innerHTML = `
      <div class="lb-overlay" aria-hidden="true"></div>
      <div class="lb-dialog">
        <div class="lb-toolbar">
          <span class="lb-counter" aria-live="polite"></span>
          <a class="lb-instagram" href="#" target="_blank" rel="noopener noreferrer" aria-label="View on Instagram">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            View on Instagram ↗
          </a>
          <button class="lb-close" aria-label="Close lightbox" type="button">✕</button>
        </div>
        <div class="lb-img-wrap">
          <button class="lb-nav lb-prev" aria-label="Previous photo" type="button">‹</button>
          <img class="lb-img" src="" alt="" />
          <button class="lb-nav lb-next" aria-label="Next photo" type="button">›</button>
        </div>
        <div class="lb-meta">
          <div class="lb-caption"></div>
          <div class="lb-location-row">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="lb-location"></span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(lightboxEl);

    // Close on overlay click
    lightboxEl.querySelector('.lb-overlay').addEventListener('click', closeLightbox);
    lightboxEl.querySelector('.lb-close').addEventListener('click', closeLightbox);

    // Navigation buttons
    lightboxEl.querySelector('.lb-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      navigateLightbox(-1);
    });
    lightboxEl.querySelector('.lb-next').addEventListener('click', (e) => {
      e.stopPropagation();
      navigateLightbox(1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl || lightboxEl.hasAttribute('hidden')) return;
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   navigateLightbox(-1);
      if (e.key === 'ArrowRight')  navigateLightbox(1);
    });
  }

  // ─── GALLERY EXPANSION CONTROLS ──────────────────────────────
  function toggleGallery() {
    showFullGallery = !showFullGallery;
    render();
    setupReveal();
  }

  function updateViewAllButton() {
    const container = document.getElementById('gallery-view-all-container');
    if (!container) return;

    const btn = container.querySelector('.gallery-view-all-btn');
    if (btn) {
      btn.textContent = showFullGallery ? '— Collapse Gallery' : '+ Expand Gallery';
    }
  }

  function createViewAllButton() {
    const fieldNotesSection = document.getElementById('field-notes');
    if (!fieldNotesSection) return;

    const container = document.createElement('div');
    container.id = 'gallery-view-all-container';
    container.className = 'gallery-view-all-container';

    const btn = document.createElement('button');
    btn.className = 'gallery-view-all-btn';
    btn.type = 'button';
    btn.textContent = '+ Expand Gallery';
    btn.addEventListener('click', toggleGallery);

    container.appendChild(btn);
    const grid = fieldNotesSection.querySelector('#gallery-grid');
    if (grid && grid.nextSibling) {
      fieldNotesSection.insertBefore(container, grid.nextSibling);
    } else if (grid) {
      grid.parentNode.appendChild(container);
    }
  }

  // ─── LAZY REVEAL via IntersectionObserver ─────────────────────
  function setupReveal() {
    const items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gallery-item--visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

      items.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 6) * 60}ms`;
        obs.observe(el);
      });
    } else {
      items.forEach(el => el.classList.add('gallery-item--visible'));
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    if (!document.getElementById('gallery-grid')) return;
    createViewAllButton();
    render();
    setupReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
