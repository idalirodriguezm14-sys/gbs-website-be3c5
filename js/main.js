/* =========================================================
   GBS TRADE — main.js
   Loads content.json (editable via the /admin CMS) and applies
   it to the page, then wires up all animations.
   ========================================================= */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Content loader ---------- */
function getPath(obj, path){
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

async function loadContent(){
  try{
    const res = await fetch('content.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  }catch(e){
    console.warn('content.json not loaded, using defaults', e);
    return null;
  }
}

function applyTheme(theme){
  if (!theme) return;
  const root = document.documentElement.style;
  if (theme.colorPrimary) root.setProperty('--gold', theme.colorPrimary);
  if (theme.colorPrimaryLight) root.setProperty('--gold-2', theme.colorPrimaryLight);
  if (theme.colorSecondary) root.setProperty('--teal', theme.colorSecondary);
  if (theme.colorBg) root.setProperty('--bg', theme.colorBg);
  if (theme.colorInk) root.setProperty('--ink', theme.colorInk);
}

function applyLists(content){
  document.querySelectorAll('[data-k-list-path]').forEach(el => {
    const arr = getPath(content, el.dataset.kListPath);
    if (!Array.isArray(arr)) return;
    const itemType = el.dataset.kListItem;
    if (itemType === 'tag'){
      const single = arr.map(t => `<span>${t}</span><span>&#9670;</span>`).join('');
      el.innerHTML = single + single; // doubled for seamless marquee scroll
      return;
    }
    el.innerHTML = arr.map(text => {
      if (itemType === 'point') return `<li><i class="fa-solid fa-check"></i><span>${text}</span></li>`;
      if (itemType === 'region') return `<span><strong>${text}</strong></span>`;
      return `<span>${text}</span>`; // badge / default
    }).join('');
  });
}

/* ---------- Language ---------- */
function getInitialLang(){
  const saved = localStorage.getItem('gbs_lang');
  if (saved === 'en' || saved === 'es') return saved;
  return (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

function updateLangToggleUI(lang){
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.querySelectorAll('[data-lang-btn]').forEach(span => {
    span.setAttribute('data-active', span.dataset.langBtn === lang ? 'true' : 'false');
  });
}

function applyContent(content, lang){
  if (!content) return;
  const langContent = content[lang] || content.en || content.es || content;
  applyTheme(content.theme);
  applyLists(langContent);
  document.documentElement.setAttribute('lang', lang);
  updateLangToggleUI(lang);

  document.querySelectorAll('[data-k]').forEach(el => {
    const val = getPath(langContent, el.dataset.k);
    if (val === undefined || val === null) return;

    const attr = el.dataset.kAttr;
    if (attr === 'bg'){
      el.style.backgroundImage = `url('${val}')`;
    } else if (attr === 'poster'){
      el.setAttribute('poster', val);
    } else if (el.tagName === 'IMG'){
      el.src = val;
    } else if (el.tagName === 'SOURCE'){
      el.src = val;
      const video = el.closest('video');
      if (video) video.load();
    } else if (el.dataset.kCount === 'true'){
      el.dataset.count = val;
      // leave textContent as "0" — the scroll-triggered counter will animate to it
    } else {
      el.textContent = val;
    }
  });
}

/* ---------- Preloader ---------- */
/* Safety net: never let a slow/blocked external resource (fonts, CDN, images)
   trap the site behind the loading screen. Runs on 'load' OR after a max
   timeout, whichever comes first. */
let preloaderDone = false;
function finishPreloading(){
  if (preloaderDone) return;
  preloaderDone = true;
  const bar = document.querySelector('.preloader-bar span');
  const pre = document.getElementById('preloader');
  gsap.to(bar, { width:'100%', duration:.6, ease:'power2.inOut', onComplete:()=>{
    setTimeout(()=>{
      pre.classList.add('done');
      startHeroIntro();
    }, 120);
  }});
}
window.addEventListener('load', finishPreloading);
setTimeout(finishPreloading, 2500);

/* ---------- Nav scroll state + burger ---------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  burger.classList.remove('open');
  navLinks.classList.remove('open');
}));

/* ---------- Hero intro timeline ---------- */
function startHeroIntro(){
  const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
  tl.to('.eyebrow', { opacity:1, y:0, duration:.7 })
    .to('.hero-title .word', { y:'0%', duration:1, stagger:.12, ease:'power4.out' }, '-=.4')
    .to('.hero-sub', { opacity:1, y:0, duration:.8 }, '-=.5')
    .to('.hero-actions', { opacity:1, y:0, duration:.8 }, '-=.6');
}

/* ---------- Animated counters ---------- */
function animateCount(el){
  const target = parseFloat(el.dataset.count);
  const isDecimal = String(target).includes('.');
  const obj = { val:0 };
  gsap.to(obj, {
    val:target, duration:1.6, ease:'power2.out',
    onUpdate:() => {
      el.textContent = isDecimal ? obj.val.toFixed(1) : Math.round(obj.val);
    }
  });
}

/* ---------- Canvas particle network (contact section) ---------- */
function initParticleField(canvasId, opts = {}){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const density = opts.density || 12000;
  const maxDist = opts.maxDist || 130;
  const color = opts.color || '216,0,31';

  function resize(){
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    canvas.style.width = canvas.offsetWidth + 'px';
    const count = Math.min(120, Math.floor((w*h) / (density * devicePixelRatio * devicePixelRatio)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35,
      r: Math.random()*1.6 + 0.6
    }));
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * devicePixelRatio, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${color},0.9)`;
      ctx.fill();
      for (let j=i+1;j<particles.length;j++){
        const q = particles[j];
        const dx = p.x-q.x, dy = p.y-q.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < maxDist * devicePixelRatio){
          ctx.beginPath();
          ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle = `rgba(${color},${(1 - dist/(maxDist*devicePixelRatio)) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  resize();
  step();
}

/* ---------- Smooth-ish anchor offset (accounts for fixed nav) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top:y, behavior:'smooth' });
  });
});

/* =========================================================
   Boot sequence: load content, apply it, THEN wire up
   scroll-triggered animations (so they read final values)
   ========================================================= */
(async function boot(){
  const content = await loadContent();
  let currentLang = getInitialLang();
  applyContent(content, currentLang);

  const langToggle = document.getElementById('langToggle');
  if (langToggle){
    langToggle.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'es' : 'en';
      localStorage.setItem('gbs_lang', currentLang);
      applyContent(content, currentLang);
    });
  }

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.reveal-up').forEach(el => {
    if (el.closest('.hero')) return; // handled by the intro timeline
    gsap.to(el, {
      opacity:1, y:0, duration:.9, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 88%' }
    });
  });

  ['.about-grid .about-card', '.why-grid .why-card', '.insight-grid .insight-card'].forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el, start:'top 88%',
        onEnter: () => gsap.to(el, { opacity:1, y:0, duration:.8, delay:(i%3)*0.12, ease:'power3.out' })
      });
    });
  });

  document.querySelectorAll('[data-count]').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start:'top 90%', once:true,
      onEnter: () => animateCount(el)
    });
  });

  document.querySelectorAll('.img-parallax .about-card-img').forEach(img => {
    gsap.fromTo(img, { backgroundPositionY:'40%' }, {
      backgroundPositionY:'60%', ease:'none',
      scrollTrigger:{ trigger: img, start:'top bottom', end:'bottom top', scrub:true }
    });
  });

  const bannerImg = document.querySelector('.banner-img');
  if (bannerImg){
    gsap.fromTo(bannerImg, { yPercent:-12 }, {
      yPercent:12, ease:'none',
      scrollTrigger:{ trigger:'.banner', start:'top bottom', end:'bottom top', scrub:true }
    });
  }

  const sections = document.querySelectorAll('main section[id]');
  const navA = document.querySelectorAll('.nav-links a');
  ScrollTrigger.batch(sections, {
    start:'top 50%', end:'bottom 50%',
    onEnter: batch => batch.forEach(s => setActiveNav(s.id)),
    onEnterBack: batch => batch.forEach(s => setActiveNav(s.id)),
  });
  function setActiveNav(id){
    navA.forEach(a => a.style.color = (a.getAttribute('href') === '#'+id) ? 'var(--gold)' : '');
  }

  initParticleField('contactCanvas', { density:11000, maxDist:120, color:'46,139,87' });
})();
