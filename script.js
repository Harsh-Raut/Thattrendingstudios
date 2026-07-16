/* ============================================================
   That Trending Studio — interactions + enquiry form
   The form POSTs to a Google Apps Script (google-apps-script.gs)
   which saves each enquiry to the Google Sheet and emails
   thattrendingsong@gmail.com. Set GOOGLE_SCRIPT_URL below.
   ============================================================ */

(() => {
'use strict';

// Current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Nav shadow on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ---------- Mobile hamburger menu (#11) ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const closeMenu = () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
};
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
// Close menu when a link is tapped
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

// ---------- Playback video sound toggle (#8) ----------
const pbVideo = document.getElementById('playbackVideo');
const pbSound = document.getElementById('playbackSound');
// Only reveal the video (and sound toggle) once a real clip actually loads;
// otherwise the branded gradient + caption stay visible.
if (pbVideo) {
  pbVideo.addEventListener('loadeddata', () => {
    if (pbVideo.readyState >= 2) pbVideo.closest('.playback__media').classList.add('has-video');
  });
}
if (pbVideo && pbSound) {
  pbSound.addEventListener('click', () => {
    pbVideo.muted = !pbVideo.muted;
    if (!pbVideo.muted) pbVideo.play().catch(() => {});
    pbSound.textContent = pbVideo.muted ? '🔊 Tap for sound' : '🔇 Mute';
  });
}

// ---------- Two-step form (#12) ----------
// Paste your deployed Google Apps Script Web App URL (ends in /exec) here.
// See google-apps-script.gs for the setup steps.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTl_b7Tx1gQ2Rzad9hEWuO6i-YKuDtTemEJDO2TXiEqmYAYiaicMbQMonSOE0HuGjh-A/exec';

const form = document.getElementById('enquiryForm');
const step1 = form.querySelector('[data-step="1"]');
const step2 = form.querySelector('[data-step="2"]');
const dots = form.querySelectorAll('.form__progress .dot');
const progressBar = form.querySelector('.form__progress .bar');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');
const successWa = document.getElementById('successWa');

const setStatus = (msg, type) => {
  statusEl.textContent = msg;
  statusEl.className = 'form__status' + (type ? ' ' + type : '');
};
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const showStep = (n) => {
  step1.classList.toggle('hidden', n !== 1);
  step2.classList.toggle('hidden', n !== 2);
  dots.forEach((d) => d.classList.toggle('active', Number(d.dataset.dot) <= n));
  if (progressBar) progressBar.style.setProperty('--pct', n === 2 ? '100%' : '0%');
};

// Step 1 → Step 2
document.getElementById('toStep2').addEventListener('click', () => {
  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  if (!name) { setStatus('', ''); form.elements.name.focus(); return flash(form.elements.name); }
  if (phone.replace(/\D/g, '').length < 8) { form.elements.phone.focus(); return flash(form.elements.phone); }
  showStep(2);
  form.elements.email.focus();
});
document.getElementById('backStep1').addEventListener('click', () => showStep(1));

// brief red flash for invalid field
function flash(el) {
  el.style.borderColor = '#d63636';
  el.style.boxShadow = '0 0 0 3px rgba(214,54,54,.15)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1200);
}

// Package "Enquire" buttons → prefill dropdown (step 2)
document.querySelectorAll('[data-package]').forEach((el) => {
  el.addEventListener('click', () => {
    const val = el.getAttribute('data-package');
    const select = document.getElementById('service');
    if (select) {
      const match = [...select.options].find((o) => o.value === val);
      if (match) { select.value = val; select.dispatchEvent(new Event('change')); }
    }
  });
});

// Submit-button label reflects the selected service
const serviceSel = document.getElementById('service');
const updateCtaLabel = () => {
  const v = serviceSel.value;
  submitBtn.textContent =
    v === 'Free Voice Test' ? 'Book My Free Voice Test'
    : /Film \/ Album/.test(v) ? 'Request a Callback'
    : 'Send My Enquiry';
};
serviceSel.addEventListener('change', updateCtaLabel);
updateCtaLabel();

// ---------- Submit → email ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('', '');
  successWa.classList.add('hidden');

  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  const email = form.elements.email.value.trim();

  // Validate — bounce back to the step holding the bad field
  if (!name) { showStep(1); form.elements.name.focus(); return setStatus('Please enter your name.', 'err'); }
  if (phone.replace(/\D/g, '').length < 8) { showStep(1); form.elements.phone.focus(); return setStatus('Please enter a valid phone / WhatsApp number.', 'err'); }
  if (!isEmail(email)) { showStep(2); form.elements.email.focus(); return setStatus('Please enter a valid email address.', 'err'); }

  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf('YOUR_GOOGLE') === 0) {
    return setStatus('Form not connected yet — add your Google Apps Script URL. (See google-apps-script.gs)', 'err');
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';
  setStatus('Sending your enquiry…', '');

  try {
    // Apps Script web apps don't send CORS headers, so we fire-and-forget
    // (no-cors). The POST still reaches the script, which saves the row +
    // emails the notification. URL-encoded body → readable as e.parameter.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(new FormData(form)),
    });
    form.reset();
    updateCtaLabel();
    showStep(1);
    setStatus('🎉 Got it! We\'ll message you on WhatsApp within 24 hours to lock your slot.', 'ok');
    successWa.classList.remove('hidden'); // offer instant WhatsApp handoff (#4)
    celebrate(); // submit celebration (#7)
  } catch (err) {
    setStatus('Network error — please WhatsApp us instead so we don\'t miss you.', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

// ---------- Hide sticky mobile bar when the form is on screen (#1) ----------
const mobilebar = document.getElementById('mobilebar');
const enquiry = document.getElementById('enquiry');
if ('IntersectionObserver' in window && mobilebar && enquiry) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      mobilebar.style.transform = en.isIntersecting ? 'translateY(120%)' : 'translateY(0)';
    }),
    { threshold: 0.15 }
  );
  io.observe(enquiry);
  mobilebar.style.transition = 'transform .25s ease';
}

/* ============================================================
   "do the changes A" — graphics & effects
   ============================================================ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 7 · scroll progress bar
const scrollProgress = document.getElementById('scrollProgress');
if (scrollProgress) {
  const updateProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    scrollProgress.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

// 2 · scroll reveal
const revealEls = document.querySelectorAll(
  '.section__head, .step, .card, .why__item, .tcard, .faq__item, .valuecard, .playback__media, .proof__grid > *, .enquiry__pitch, .form'
);
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  const vh = window.innerHeight;
  // reveal, then strip the classes so nothing can hold the element invisible
  const reveal = (el) => {
    el.classList.add('in');
    setTimeout(() => el.classList.remove('reveal', 'in'), 700);
  };
  revealEls.forEach((el) => {
    el.classList.add('reveal');
    // anything already in/above the first screen reveals right away (never blank on load)
    if (el.getBoundingClientRect().top < vh * 0.92) reveal(el);
  });
  const revealObs = new IntersectionObserver(
    (entries, obs) => entries.forEach((en) => {
      if (en.isIntersecting) { reveal(en.target); obs.unobserve(en.target); }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el) => { if (!el.classList.contains('in')) revealObs.observe(el); });
  // safety net: reveal anything still hidden (throttled or non-scrolling preview panes)
  setTimeout(() => revealEls.forEach((el) => { if (el.classList.contains('reveal')) reveal(el); }), 1800);
}

// 2 · count-up trust bar
const countEls = document.querySelectorAll('[data-count]');
const formatCount = (val, el) => {
  const suffix = el.dataset.suffix || '';
  if (el.dataset.compact === '1') {
    let s;
    if (val >= 1e6) s = +(val / 1e6).toFixed(val % 1e6 ? 1 : 0) + 'M';
    else if (val >= 1e3) s = Math.round(val / 1e3) + 'K';
    else s = String(Math.round(val));
    return s + suffix;
  }
  return val.toFixed(parseInt(el.dataset.decimals || '0', 10)) + suffix;
};
const runCount = (el) => {
  const target = parseFloat(el.dataset.count);
  if (reduceMotion) { el.textContent = formatCount(target, el); return; }
  const dur = 1400, start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = formatCount(target * (1 - Math.pow(1 - t, 3)), el);
    if (t < 1) requestAnimationFrame(tick); else el.textContent = formatCount(target, el);
  };
  requestAnimationFrame(tick);
  // fallback: rAF is paused in backgrounded tabs — guarantee the final value shows
  setTimeout(() => { el.textContent = formatCount(target, el); }, 2200);
};
if (countEls.length) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    countEls.forEach((el) => (el.textContent = formatCount(parseFloat(el.dataset.count), el)));
  } else {
    // leave the real numbers in the HTML; only reset to 0 when the count actually
    // starts, so a counter that never scrolls into view still shows its real value
    const countObs = new IntersectionObserver(
      (entries, obs) => entries.forEach((en) => {
        if (en.isIntersecting) { runCount(en.target); obs.unobserve(en.target); }
      }),
      { threshold: 0.6 }
    );
    countEls.forEach((el) => countObs.observe(el));
  }
}

// 4 · card cursor spotlight + 3D tilt (fine pointers only)
const finePointer = window.matchMedia('(pointer: fine)').matches;
if (!reduceMotion && finePointer) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
      card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

// 4 · subtle cursor spotlight on step + why cards (no tilt — keeps them calm)
if (!reduceMotion && finePointer) {
  document.querySelectorAll('.step, .why__item').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });
}

// 3 · hero 3D parallax — floating shapes drift with the cursor
const hero = document.querySelector('.hero');
const shapes = hero ? hero.querySelectorAll('.shape') : [];
if (!reduceMotion && finePointer && shapes.length) {
  let raf = null, tx = 0, ty = 0;
  const applyParallax = () => {
    raf = null;
    shapes.forEach((s) => {
      const d = parseFloat(s.dataset.depth || '20');
      s.style.transform = `translate3d(${(-tx * d).toFixed(1)}px, ${(-ty * d).toFixed(1)}px, 0)`;
    });
  };
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5;
    ty = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(applyParallax);
  });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(applyParallax); });
}

// 7 · submit celebration (called from the form success branch)
function celebrate() {
  if (reduceMotion) return;
  const btn = document.getElementById('submitBtn');
  const r = (btn || document.body).getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ['#4358F1', '#9BEA91', '#2f42d4', '#111111'];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.style.background = colors[i % colors.length];
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    document.body.appendChild(s);
    const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
    const dist = 60 + Math.random() * 90;
    s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 40}px) scale(.4) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }
    ).onfinish = () => s.remove();
  }
}

// section background videos — reveal only when a real clip loads; still on reduced motion
document.querySelectorAll('.sec-fx__video').forEach((v) => {
  if (reduceMotion) { try { v.pause(); } catch (e) {} return; }
  v.addEventListener('loadeddata', () => {
    if (v.readyState >= 2) v.closest('.sec-fx').classList.add('has-video');
  });
});

})();
