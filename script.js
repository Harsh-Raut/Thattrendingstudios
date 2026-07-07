/* ============================================================
   That Trending Studio — interactions + enquiry-form-to-email
   Form uses Web3Forms (https://web3forms.com). Put your access
   key in index.html: input[name="access_key"].
   ============================================================ */

// Current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Nav shadow on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Package "Enquire" buttons prefill the service dropdown, then scroll to form
document.querySelectorAll('[data-package]').forEach((el) => {
  el.addEventListener('click', () => {
    const val = el.getAttribute('data-package');
    const select = document.getElementById('service');
    if (select) {
      const match = [...select.options].find((o) => o.value === val);
      if (match) select.value = val;
    }
  });
});

// ---------- Enquiry form → email ----------
const form = document.getElementById('enquiryForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

const setStatus = (msg, type) => {
  statusEl.textContent = msg;
  statusEl.className = 'form__status' + (type ? ' ' + type : '');
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('', '');

  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const email = form.email.value.trim();

  // Client-side validation
  if (!name) return setStatus('Please enter your name.', 'err');
  if (phone.replace(/\D/g, '').length < 8) return setStatus('Please enter a valid phone / WhatsApp number.', 'err');
  if (!isEmail(email)) return setStatus('Please enter a valid email address.', 'err');

  const accessKey = form.access_key.value;
  if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
    return setStatus('Form not configured yet — add your Web3Forms access key. (See README.)', 'err');
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';
  setStatus('Sending your enquiry…', '');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();

    if (data.success) {
      form.reset();
      setStatus('🎉 Got it! We\'ll message you on WhatsApp within 24 hours to lock your slot.', 'ok');
    } else {
      setStatus(data.message || 'Something went wrong. Please WhatsApp us instead.', 'err');
    }
  } catch (err) {
    setStatus('Network error. Please check your connection or WhatsApp us instead.', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
