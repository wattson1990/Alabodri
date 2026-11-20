(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cursor = document.querySelector('.custom-cursor');
  const preview = document.querySelector('.hover-preview');
  const previewImage = preview?.querySelector('img');
  const previewCaption = preview?.querySelector('span');
  const progress = document.getElementById('scroll-progress-fill');

  // Reading progress and gentle parallax values.
  let scrollTicking = false;
  const updateScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    if (progress) progress.style.width = `${ratio * 100}%`;
    document.documentElement.style.setProperty('--hero-shift', `${Math.max(-22, -window.scrollY * .012)}px`);
    document.documentElement.style.setProperty('--bg-shift', `${Math.max(-48, -window.scrollY * .027)}px`);
    document.documentElement.style.setProperty('--hero-scale', `${Math.max(1, 1.015 - ratio * .012)}`);
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScroll);
      scrollTicking = true;
    }
  }, { passive: true });
  updateScroll();

  // Reveal content as it enters the viewport; content remains visible without JS support.
  const revealTargets = document.querySelectorAll('.chapter-card, .credits, .sidebar h3, .sidebar-footer');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    revealTargets.forEach((el) => observer.observe(el));
  }

  if (finePointer && cursor && !prefersReducedMotion) {
    cursor.classList.add('is-visible');
    let pointerX = -100, pointerY = -100;
    let cursorFrame = 0;
    const moveCursor = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!cursorFrame) {
        cursorFrame = requestAnimationFrame(() => {
          cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
          cursorFrame = 0;
        });
      }
      if (preview?.classList.contains('is-visible')) placePreview(pointerX, pointerY);
    };
    document.addEventListener('pointermove', moveCursor, { passive: true });
    document.addEventListener('pointerover', (event) => {
      const target = event.target.closest('a, button, summary, .drag-sticker');
      if (!target) return;
      cursor.classList.add('is-active');
      const label = target.dataset.cursor || (target.tagName === 'SUMMARY' ? 'OPEN' : 'VIEW');
      const labelNode = cursor.querySelector('.cursor-label');
      if (labelNode) labelNode.textContent = label;
    });
    document.addEventListener('pointerout', (event) => {
      if (event.target.closest('a, button, summary, .drag-sticker')) cursor.classList.remove('is-active');
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('pointerenter', () => cursor.classList.add('is-visible'));

    const placePreview = (x, y) => {
      const w = preview?.offsetWidth || 180;
      const h = preview?.offsetHeight || 140;
      const left = Math.min(window.innerWidth - w - 12, Math.max(12, x + 24));
      const top = Math.min(window.innerHeight - h - 12, Math.max(12, y + 18));
      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
    };
    document.querySelectorAll('summary[data-preview]').forEach((summary) => {
      summary.addEventListener('pointerenter', (event) => {
        if (!preview || !previewImage) return;
        previewImage.src = summary.dataset.preview;
        previewCaption.textContent = summary.textContent.trim().replace(/\s+/g, ' ');
        placePreview(event.clientX, event.clientY);
        preview.classList.add('is-visible');
      });
      summary.addEventListener('pointermove', (event) => placePreview(event.clientX, event.clientY));
      summary.addEventListener('pointerleave', () => preview?.classList.remove('is-visible'));
    });
  }

  // Magnetic motion is deliberately subtle and only enabled for a fine pointer.
  if (finePointer && !prefersReducedMotion) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate3d(${Math.max(-7, Math.min(7, dx * .12))}px, ${Math.max(-6, Math.min(6, dy * .12))}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Lightweight 3D tilt and specular highlight on imagery; no external shader library.
    document.querySelectorAll('.section-image, .hero-banner, .sidebar-banner, .sidebar-footer').forEach((img) => {
      img.addEventListener('pointermove', (event) => {
        const rect = img.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        img.style.transform = `perspective(850px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) scale(1.015)`;
        img.style.filter = `saturate(1.16) brightness(1.07) drop-shadow(${(x * 5).toFixed(1)}px ${(y * 5).toFixed(1)}px 12px rgba(70,160,235,.17))`;
      });
      img.addEventListener('pointerleave', () => { img.style.transform = ''; img.style.filter = ''; });
    });
  }

  // A small draggable paper note in the welcome panel.
  const sticker = document.querySelector('.drag-sticker');
  if (sticker) {
    let dragging = false;
    let offsetX = 0, offsetY = 0;
    sticker.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const rect = sticker.getBoundingClientRect();
      const parentRect = sticker.offsetParent.getBoundingClientRect();
      dragging = true;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      sticker.style.left = `${rect.left - parentRect.left}px`;
      sticker.style.top = `${rect.top - parentRect.top}px`;
      sticker.style.right = 'auto';
      sticker.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    sticker.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const bounds = sticker.offsetParent.getBoundingClientRect();
      const x = Math.max(0, Math.min(bounds.width - sticker.offsetWidth, event.clientX - bounds.left - offsetX));
      const y = Math.max(0, Math.min(bounds.height - sticker.offsetHeight, event.clientY - bounds.top - offsetY));
      sticker.style.left = `${x}px`;
      sticker.style.top = `${y}px`;
    });
    const stopDrag = () => { dragging = false; };
    sticker.addEventListener('pointerup', stopDrag);
    sticker.addEventListener('pointercancel', stopDrag);
  }

  // Era chips use native anchor navigation; highlight the chip for the current era.
  const eraLinks = [...document.querySelectorAll('.era-nav a')];
  if ('IntersectionObserver' in window && eraLinks.length) {
    const eraObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        eraLinks.forEach((link) => link.classList.toggle('is-current', link.hash === `#${entry.target.id}`));
      });
    }, { root: document.querySelector('.sidebar'), threshold: .55 });
    eraLinks.forEach((link) => {
      const target = document.querySelector(link.hash);
      if (target) eraObserver.observe(target);
    });
  }
})();