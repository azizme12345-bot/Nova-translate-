/**
 * UI Utilities, View Navigation & PWA Initialization
 */

let toastTimer = null;

export function showToast(msg) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = String(msg || '');
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const VALID_VIEWS = new Set([
  'translate',
  'text-translation',
  'voice-translation',
  'image',
  'history',
  'saved',
  'languages',
]);

export function setMobileMenuOpen(open) {
  const mobileMenu = document.getElementById('mobileMenu');
  const menuToggle = document.getElementById('menuToggle');
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.toggle('hidden', !open);
  menuToggle.textContent = open ? '✕' : '☰';
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function switchHomeView(view, scrollTargetId = '') {
  const normalized = VALID_VIEWS.has(view) ? view : 'translate';

  document.querySelectorAll('.page-view').forEach((el) => {
    el.classList.toggle('active', el.id === `page-${normalized}`);
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const targetNav = btn.getAttribute('data-nav');
    btn.classList.toggle(
      'active',
      targetNav === normalized || (targetNav === 'translate' && normalized === 'text-translation')
    );
  });

  setMobileMenuOpen(false);

  if (scrollTargetId) {
    const targetEl = document.getElementById(scrollTargetId);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
      return;
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initNavigation() {
  const yearEl = document.getElementById('year');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      setMobileMenuOpen(mobileMenu.classList.contains('hidden'));
    });
  }

  document.addEventListener('click', (e) => {
    const navBtn = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-nav]') : null;
    if (navBtn) {
      e.preventDefault();
      const viewName = navBtn.getAttribute('data-nav');
      switchHomeView(viewName, '');
    }
  });

  window.addEventListener('hashchange', () => {
    const hash = String(window.location.hash || '').toLowerCase();
    if (hash === '#historysection') {
      switchHomeView('translate', 'historySection');
    }
  });

  const initHash = String(window.location.hash || '').toLowerCase();
  if (initHash === '#historysection') {
    switchHomeView('translate', 'historySection');
  } else {
    switchHomeView('translate', '');
  }
}

export function initPwa() {
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');
  const iosInstallModal = document.getElementById('iosInstallModal');
  const closeIosModalBtn = document.getElementById('closeIosModalBtn');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
  });

  if (
    pwaInstallBtn &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone === true))
  ) {
    pwaInstallBtn.classList.add('hidden');
  }

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          showToast('LAFZ Translation installed!');
        }
      } else {
        showToast("Chrome menu se 'Install app' ya 'Add to Home screen' chunein.");
      }
    });
  }

  if (closeIosModalBtn && iosInstallModal) {
    closeIosModalBtn.addEventListener('click', () => {
      iosInstallModal.classList.add('hidden');
    });
    iosInstallModal.addEventListener('click', (e) => {
      if (e.target === iosInstallModal) {
        iosInstallModal.classList.add('hidden');
      }
    });
  }
}
