  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    const observers = [];
    const onceIO = (els, cb, rm) => {
      const seen = new WeakSet();
      const io = new IntersectionObserver((ents) => { ents.forEach((e) => { if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); io.unobserve(e.target); cb(e.target); } }); }, { threshold: 0, rootMargin: rm || '0px 0px -8% 0px' });
      observers.push(io);
      els.forEach((x) => io.observe(x));
      return io;
    };
    const mark = (sel, cls) => { const els = Array.from(document.querySelectorAll(sel)); els.forEach((e) => e.classList.add(cls || 'im-rv')); return els; };
    /* showcase cards stagger in */
    const past = mark('.ev-past'); past.forEach((e, i) => { e.style.transitionDelay = (i * 0.1) + 's'; });
    onceIO(past, (el) => el.classList.add('im-in'));
    /* STATS · trei generatii: each row rises, its growth bar + time-thread draw in */
    const rows = mark('.gen-row');
    rows.forEach((row) => { const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-bar'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-thread'); });
    onceIO(rows, (row) => { row.classList.add('im-in'); const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-in'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-in'); });
    /* team photo band */
    onceIO(mark('#jointeam'), (el) => el.classList.add('im-in'));

    /* Board: restrained viewport reveals and portrait motion. */
    const board = document.querySelector('#board');
    const boardInitialTweens = [];
    if (board) {
      const revealGroup = (trigger, parts) => {
        if (!trigger || !parts.length) return;
        parts.forEach((part, index) => {
          part.classList.add('board-motion-reveal');
          part.style.setProperty('--board-delay', `${Math.min(index, 5) * 80}ms`);
          if (part.matches('.board-photo')) part.classList.add('board-motion-reveal--photo');
          if (part.matches('.board-lead__body, .board-member__body')) part.classList.add('board-motion-reveal--copy');
        });

        const reveal = (animate = true) => {
          const apply = () => parts.forEach((part) => part.classList.add('board-motion-in'));
          if (animate) requestAnimationFrame(apply);
          else apply();
        };
        const rect = trigger.getBoundingClientRect();
        const alreadyVisible = rect.top < innerHeight * .9 && rect.bottom > 0;
        if (alreadyVisible) reveal(false);
        else onceIO([trigger], () => reveal(true), '0px 0px -16% 0px');
      };

      const boardHead = board.querySelector('.board-head');
      revealGroup(boardHead, Array.from(board.querySelectorAll('.board-head__copy > *')));

      const boardLead = board.querySelector('.board-lead');
      revealGroup(boardLead, boardLead ? Array.from(boardLead.children) : []);

      const directoryHead = board.querySelector('.board-directory-head');
      revealGroup(directoryHead, directoryHead ? Array.from(directoryHead.children) : []);

      board.querySelectorAll('.board-group__head').forEach((groupHead) => {
        revealGroup(groupHead, Array.from(groupHead.children));
      });

      board.querySelectorAll('.board-member').forEach((member) => {
        const parts = [member.querySelector('.board-photo'), member.querySelector('.board-member__body')].filter(Boolean);
        revealGroup(member, parts);
      });

      const boardNote = board.querySelector('.board-note');
      revealGroup(boardNote, boardNote ? [boardNote] : []);

      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        const isTouch = matchMedia('(hover:none)').matches;
        board.querySelectorAll('.board-photo__initials').forEach((initials) => {
          const photo = initials.closest('.board-photo');
          if (!photo) return;
          const travel = isTouch ? 10 : 16;
          boardInitialTweens.push(window.gsap.fromTo(initials,
            { yPercent: travel },
            {
              yPercent: -travel,
              ease: 'none',
              scrollTrigger: {
                trigger: photo,
                start: 'top bottom',
                end: 'bottom top',
                scrub: .55,
              },
            },
          ));
        });
      }
    }

    const previousCleanup = window.__immersiveCleanup;
    const boardMotionCleanup = () => {
      observers.forEach((observer) => observer.disconnect());
      boardInitialTweens.forEach((tween) => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
      previousCleanup?.();
      if (window.__immersiveCleanup === boardMotionCleanup) window.__immersiveCleanup = null;
    };
    window.__immersiveCleanup = boardMotionCleanup;
  }
