
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    try {
      const { animate, inView, stagger } = await import('https://cdn.jsdelivr.net/npm/motion@11.11.17/+esm');
      const EASE = [0.22, 1, 0.36, 1];
      const el = (info) => (info && info.target) ? info.target : info;
      /* featured card + map rise + fade as they enter */
      inView('.ev-feat, .ev-map', (info) => {
        animate(el(info), { opacity: [0, 1], transform: ['translateY(30px)', 'translateY(0px)'] }, { duration: 0.85, ease: EASE });
      }, { amount: 0.2 });
      /* ticket progress bar fills (default state is the filled 70% width; we animate scaleX 0→1) */
      inView('.ev-prog', (info) => {
        const bar = el(info).querySelector('.ev-prog-bar i');
        if (bar) animate(bar, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 1.3, ease: EASE });
      }, { amount: 0.6 });
      /* archive cards stagger in */
      const past = Array.from(document.querySelectorAll('.ev-past'));
      inView('.ev-arch', () => {
        animate(past, { opacity: [0, 1], transform: ['translateY(32px)', 'translateY(0px)'] }, { duration: 0.7, ease: EASE, delay: stagger(0.12) });
      }, { amount: 0.15 });
      /* ── STATS · trei generații: each chapter rises as it enters, its growth bar
         draws in. (count-up handled by a dedicated observer in the classic script;
         CSS defaults stay visible so no-JS degrades cleanly) */
      const statSec = document.getElementById('stats');
      if (statSec) {
        Array.from(statSec.querySelectorAll('.gen-row')).forEach((row) => {
          inView(row, () => {
            animate(row, { opacity: [0, 1], transform: ['translateY(40px)', 'translateY(0px)'] }, { duration: 0.8, ease: EASE });
            const bar = row.querySelector('.gen-bar i');
            if (bar) animate(bar, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 1.1, ease: EASE, delay: 0.28 });
            /* draw the generation's time-thread line down beside the text */
            const thread = row.querySelector('.gen-thread i');
            if (thread) animate(thread, { transform: ['scaleY(0)', 'scaleY(1)'] }, { duration: 1.0, ease: EASE, delay: 0.12 });
            /* clear inline transform/opacity after entrance so the CSS :hover lift works */
            setTimeout(() => { row.style.transform = ''; row.style.opacity = ''; if (bar) bar.style.transform = ''; }, 1700);
          }, { amount: 0.3 });
        });
      }
      /* team photo band reveals as it enters; clear transform so CSS :hover works */
      const jt = document.getElementById('jointeam');
      if (jt) {
        inView('#jointeam', () => {
          animate(jt, { opacity: [0, 1], transform: ['translateY(30px)', 'translateY(0px)'] }, { duration: 0.8, ease: EASE });
          setTimeout(() => { jt.style.transform = ''; }, 1100);
        }, { amount: 0.3 });
      }
    } catch (e) { /* CDN/module unavailable: section stays at its visible default */ }
  }
