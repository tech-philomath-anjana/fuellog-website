
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var OPENING = 184520000;
  var START = 184532000;
  var CEILING = 184599999; // Deliberate limit for this example, not the real meter capacity.
  var RATE = 10400;
  var win = document.getElementById('odo-window');
  var card = document.getElementById('odometer');
  var hold = document.getElementById('pour-button');
  var label = document.getElementById('pour-label');
  var hint = document.getElementById('odo-hint');
  var flow = document.getElementById('meter-flow');
  var add = document.getElementById('pour-add');
  var reset = document.getElementById('pour-reset');
  var announcement = document.getElementById('meter-announcement');
  var drums = win ? win.querySelectorAll('.drum') : [];
  var reading = START;
  var active = false;
  var frameId = null;
  var pointerId = null;
  var heldKey = null;
  var began = 0;
  var previous = 0;
  var fractional = 0;
  var settleTimer = null;

  function group(whole) {
    var last3 = whole.slice(-3), rest = whole.slice(0, -3);
    return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  }
  function fixed(value) {
    return group(String(Math.floor(value / 100))) + '.' + String(value % 100).padStart(2, '0');
  }
  function paint() {
    if (!win) { return; }
    var sold = reading - OPENING;
    var digits = String(reading).padStart(drums.length, '0');
    Array.prototype.forEach.call(drums, function (drum, i) {
      var place = Math.pow(10, drums.length - 1 - i);
      var digit = Number(digits[i]);
      var carry = active && !calm ? Math.max(0, ((reading % place) + fractional - (place - 1))) : 0;
      drum.style.setProperty('--pos', String(digit + carry));
    });
    document.getElementById('odo-litres').textContent = (sold / 100).toFixed(2);
    document.getElementById('odo-closing').textContent = fixed(reading);
    document.getElementById('odo-money').textContent = '₹' + fixed(Math.round(sold * RATE / 100));
    var full = reading >= CEILING;
    hold.disabled = full;
    add.disabled = full;
    label.textContent = full ? 'Example complete' : active ? 'Pouring… release to stop' : 'Hold to pour';
    hint.textContent = full ? 'Reset the example to try again.' : 'Release to stop. Every drop counts.';
  }
  function announce() {
    announcement.textContent = fixed(reading) + ' litres on the meter. ' +
      ((reading - OPENING) / 100).toFixed(2) + ' litres sold. Petrol sale ₹' +
      fixed(Math.round((reading - OPENING) * RATE / 100)) + '.';
  }
  function stop() {
    if (!active) { return; }
    active = false;
    window.cancelAnimationFrame(frameId);
    frameId = null;
    pointerId = null;
    heldKey = null;
    fractional = 0;
    card.classList.remove('is-pouring');
    card.classList.add('is-settling');
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(function () { card.classList.remove('is-settling'); }, 420);
    flow.textContent = reading >= CEILING ? 'Example limit reached' : 'Reading settled';
    paint();
    announce();
  }
  function frame(now) {
    if (!active) { return; }
    var dt = Math.max(0, Math.min(now - previous, 80));
    previous = now;
    if (now - began < 220 && !calm) {
      flow.textContent = 'Nozzle moving into place';
      frameId = window.requestAnimationFrame(frame); return;
    }
    var rate = 0.6 + Math.min((now - began) / 2500, 1) * 0.8;
    fractional += dt * rate / 10;
    var whole = Math.floor(fractional);
    fractional -= whole;
    reading = Math.min(CEILING, reading + whole);
    flow.textContent = rate.toFixed(2) + ' L / second';
    paint();
    if (reading >= CEILING) { stop(); return; }
    frameId = window.requestAnimationFrame(frame);
  }
  function start() {
    if (active || reading >= CEILING) { return; }
    active = true;
    began = previous = performance.now();
    window.clearTimeout(settleTimer);
    card.classList.remove('is-settling');
    card.classList.add('is-pouring');
    paint();
    frameId = window.requestAnimationFrame(frame);
  }
  if (win && hold) {
    Array.prototype.forEach.call(drums, function (drum) {
      var strip = document.createElement('div');
      strip.className = 'drum-strip';
      for (var i = 0; i <= 10; i++) {
        var digit = document.createElement('span');
        digit.textContent = String(i % 10);
        strip.appendChild(digit);
      }
      drum.appendChild(strip);
    });
    paint();
    hold.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || active) { return; }
      pointerId = e.pointerId;
      hold.setPointerCapture(e.pointerId);
      start();
    });
    hold.addEventListener('pointerup', function (e) { if (e.pointerId === pointerId) { stop(); } });
    hold.addEventListener('pointercancel', stop);
    hold.addEventListener('lostpointercapture', stop);
    hold.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat && !active) { heldKey = e.key; start(); }
      }
      if (e.key === 'Escape') { stop(); }
    });
    hold.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); }
      if (e.key === heldKey) { stop(); }
    });
    hold.addEventListener('click', function (e) {
      if (e.detail === 0 && !active && !heldKey) { add.click(); }
    });
    hold.addEventListener('blur', stop);
    add.addEventListener('click', function () {
      stop();
      reading = Math.min(CEILING, reading + 100);
      paint();
      flow.textContent = reading >= CEILING ? 'Example limit reached' : 'Reading settled';
      announce();
    });
    reset.addEventListener('click', function () {
      stop(); reading = START; fractional = 0;
      window.clearTimeout(settleTimer); card.classList.remove('is-settling');
      flow.textContent = 'Interactive example';
      paint(); announce();
    });
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } });
    if ('IntersectionObserver' in window) {
      var meterVisible = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { stop(); }
      });
      meterVisible.observe(card);
    }
  }

  var stage = document.getElementById('tear-stage');
  var paper = document.getElementById('tear-paper');
  var tearRange = document.getElementById('tear-range');
  var tearCopy = document.querySelector('.tear-copy');
  if (stage && paper) {
    var DW = 600, DH = 820;
    var k = 1;
    var TEAR_START = 0.5;
    var seam = TEAR_START;
    var touched = false;
    var rag = [];
    for (var r = 0; r <= DH / 10; r++) { rag.push(((Math.sin(r * 12.9898) * 43758.5453) % 1 + 1) % 1 * 7 - 2 + (r % 4 === 0 ? 3 : 0)); }

    function fit() {
      k = stage.clientWidth / DW;
      stage.style.setProperty('--k', k.toFixed(4));
    }

    function drawTear() {
      var x = seam * DW;
      if (seam >= 1) { paper.style.clipPath = 'none'; }
      else if (seam <= 0) { paper.style.clipPath = 'inset(0 100% 0 0)'; }
      else {
        var pts = ['0 0'];
        for (var i = 0; i < rag.length; i++) { pts.push((x + rag[i]).toFixed(1) + 'px ' + Math.min(i * 10, DH) + 'px'); }
        pts.push('0 ' + DH + 'px');
        paper.style.clipPath = 'polygon(' + pts.join(',') + ')';
      }
      stage.style.setProperty('--seam', seam.toFixed(4));
      var shown = touched && seam < 0.8;
      var caught = touched && seam < 0.06;
      stage.classList.toggle('is-revealed', shown);
      stage.classList.toggle('is-checked', touched && seam < 0.97);
      if (tearCopy) {
        tearCopy.classList.toggle('is-revealed', shown);
        tearCopy.classList.toggle('is-caught', caught);
      }
      if (tearRange) {
        tearRange.value = String(Math.round(seam * 100));
        tearRange.setAttribute('aria-valuetext', shown
          ? 'FuelLog says ₹28,520.00. The day book says ₹18,048.00, a ₹10,472.00 difference: 120 litres of petrol written as 12, and ₹760.00 of tea and water cans written in the margin but never taken off.'
          : 'The day book page covers FuelLog');
      }
    }

    function seamFrom(clientX) {
      var rect = stage.getBoundingClientRect();
      seam = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      drawTear();
    }

    var pulling = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target === tearRange) { return; }
      pulling = true;
      touched = true;
      stage.classList.add('is-dragging', 'is-touched');
      stage.setPointerCapture(e.pointerId);
      seamFrom(e.clientX);
    });
    stage.addEventListener('pointermove', function (e) { if (pulling) { seamFrom(e.clientX); } });
    function release() { pulling = false; stage.classList.remove('is-dragging'); }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    if (tearRange) {
      tearRange.addEventListener('input', function () {
        stage.classList.add('is-touched');
        touched = true;
        seam = parseInt(tearRange.value, 10) / 100;
        drawTear();
      });
    }

    fit();
    drawTear();
    window.addEventListener('resize', function () { fit(); drawTear(); });

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var nudged = false;
      var nudgeWatch = new IntersectionObserver(function (entries) {
        if (nudged || !entries[0].isIntersecting) { return; }
        nudged = true;
        nudgeWatch.disconnect();
        var t0 = null, DUR = 900, DEPTH = 0.12;
        function step(now) {
          if (touched) { return; }
          if (t0 === null) { t0 = now; }
          var t = Math.min(1, (now - t0) / DUR);
          seam = TEAR_START - DEPTH * Math.sin(Math.PI * t) * Math.sin(Math.PI * t);
          drawTear();
          if (t < 1) { requestAnimationFrame(step); } else { seam = TEAR_START; drawTear(); }
        }
        setTimeout(function () { requestAnimationFrame(step); }, 350);
      }, { threshold: 0.6 });
      nudgeWatch.observe(stage);
    }
  }

  var tourTabs = document.querySelectorAll('.tour-tab');
  var tourImg = document.getElementById('tour-img');
  var tourCap = document.getElementById('tour-cap');
  var tourPanel = document.getElementById('tour-panel');
  if (tourTabs.length && tourImg) {
    var warmed = false;
    function warm() {
      if (warmed) { return; }
      warmed = true;
      Array.prototype.forEach.call(tourTabs, function (t) { var im = new Image(); im.src = 'assets/desktop/' + t.dataset.shot + '.png'; });
    }
    function show(tab, focus) {
      Array.prototype.forEach.call(tourTabs, function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) { tab.focus(); }
      tourPanel.setAttribute('aria-labelledby', tab.id);
      tourCap.textContent = tab.dataset.cap;
      var next = 'assets/desktop/' + tab.dataset.shot + '.png';
      if (tourImg.getAttribute('src') === next) { return; }
      if (calm) { tourImg.src = next; tourImg.alt = tab.dataset.alt; return; }
      tourImg.classList.add('is-swapping');
      window.setTimeout(function () {
        tourImg.src = next;
        tourImg.alt = tab.dataset.alt;
        tourImg.classList.remove('is-swapping');
      }, 160);
    }
    Array.prototype.forEach.call(tourTabs, function (tab, i) {
      tab.addEventListener('click', function () { warm(); show(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var to = null;
        if (e.key === 'ArrowRight') { to = tourTabs[(i + 1) % tourTabs.length]; }
        if (e.key === 'ArrowLeft') { to = tourTabs[(i - 1 + tourTabs.length) % tourTabs.length]; }
        if (e.key === 'Home') { to = tourTabs[0]; }
        if (e.key === 'End') { to = tourTabs[tourTabs.length - 1]; }
        if (to) { e.preventDefault(); warm(); show(to, true); }
      });
    });
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { warm(); near.disconnect(); } }, { rootMargin: '600px 0px' });
      near.observe(tourPanel);
    }
  }

  var appScreens = document.getElementById('app-screens');
  if (appScreens) {
    var galleryPrev = document.querySelector('[data-gallery-prev]');
    var galleryNext = document.querySelector('[data-gallery-next]');
    function updateGallery() {
      galleryPrev.disabled = appScreens.scrollLeft <= 2;
      galleryNext.disabled = appScreens.scrollLeft >= appScreens.scrollWidth - appScreens.clientWidth - 2;
    }
    function moveGallery(direction) {
      var shots = appScreens.querySelectorAll('.shot');
      var step = shots[1].offsetLeft - shots[0].offsetLeft;
      appScreens.scrollBy({ left: direction * step, behavior: calm ? 'auto' : 'smooth' });
    }
    galleryPrev.addEventListener('click', function () { moveGallery(-1); });
    galleryNext.addEventListener('click', function () { moveGallery(1); });
    appScreens.addEventListener('scroll', updateGallery, { passive: true });
    window.addEventListener('resize', updateGallery);
    updateGallery();
  }

  var targets = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        el.classList.add('is-in');
        seen.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(targets, function (el) {
      var sibs = el.parentNode.querySelectorAll(':scope > .reveal');
      var idx = Array.prototype.indexOf.call(sibs, el);
      if (idx > 0) { el.style.transitionDelay = Math.min(idx, 4) * 70 + 'ms'; }
      seen.observe(el);
    });
  }

  var nav = document.getElementById('nav');
  var links = document.querySelectorAll('.nav-links a');
  var sections = [];

  Array.prototype.forEach.call(links, function (a) {
    var target = document.querySelector(a.getAttribute('href'));
    if (target) { sections.push({ link: a, el: target }); }
  });

  var ticking = false;
  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);

      var mark = window.scrollY + 140;
      var current = null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= mark) { current = s.link; }
      });
      Array.prototype.forEach.call(links, function (a) {
        a.classList.toggle('is-active', a === current);
      });

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
