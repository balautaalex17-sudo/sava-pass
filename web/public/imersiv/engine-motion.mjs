  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    const onceIO = (els, cb, rm) => {
      const seen = new WeakSet();
      const io = new IntersectionObserver((ents) => { ents.forEach((e) => { if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); io.unobserve(e.target); cb(e.target); } }); }, { threshold: 0, rootMargin: rm || '0px 0px -8% 0px' });
      els.forEach((x) => io.observe(x));
    };
    const mark = (sel, cls) => { const els = Array.from(document.querySelectorAll(sel)); els.forEach((e) => e.classList.add(cls || 'im-rv')); return els; };
    /* featured card + live map */
    onceIO(mark('.ev-feat, .ev-map'), (el) => el.classList.add('im-in'));
    /* ticket progress bar fills */
    document.querySelectorAll('.ev-prog .ev-prog-bar i').forEach((b) => b.classList.add('im-bar'));
    onceIO(Array.from(document.querySelectorAll('.ev-prog')), (el) => { const b = el.querySelector('.ev-prog-bar i'); if (b) b.classList.add('im-in'); });
    /* archive cards stagger in */
    const past = mark('.ev-past'); past.forEach((e, i) => { e.style.transitionDelay = (i * 0.1) + 's'; });
    onceIO(past, (el) => el.classList.add('im-in'));
    /* STATS · trei generatii: each row rises, its growth bar + time-thread draw in */
    const rows = mark('.gen-row');
    rows.forEach((row) => { const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-bar'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-thread'); });
    onceIO(rows, (row) => { row.classList.add('im-in'); const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-in'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-in'); });
    /* team photo band */
    onceIO(mark('#jointeam'), (el) => el.classList.add('im-in'));
  }
