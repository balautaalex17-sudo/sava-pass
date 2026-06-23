// data.js — Romanian copy for SavaPass demo
// Three real Interact Sf. Sava events; "Echoes Unplugged" is the featured/current one.

const SP_EVENTS = {
  echoes: {
    id: 'echoes',
    slug: 'echoes-unplugged',
    title: 'Echoes Unplugged',
    subtitle: 'Seara muzicii live a Interact-ului',
    eyebrow: 'EVENIMENTUL CURENT',
    dateLabel: 'Vin · 14 Nov · 19:00',
    dateLong: 'Vineri, 14 noiembrie 2025',
    doors: 'Porțile · 19:00 · Începe 19:30',
    venue: 'Curtea Veche',
    venueLine: 'Strada Iuliu Maniu 7 · București',
    price: 45,
    capacity: 120,
    sold: 84,
    checkedIn: 0,
    accent: '#009FE3',
    photo: 'assets/echoes-unplugged.png',
    photoAspect: '343 / 339',
    program: [
      { t: '19:00', l: 'Porțile se deschid' },
      { t: '19:30', l: 'Set acustic · Maria & Tudor' },
      { t: '20:15', l: 'Pauză · ceai și prăjituri' },
      { t: '20:45', l: 'Headliner · Andrei Lup' },
      { t: '22:00', l: 'Open mic — vino cu chitara' },
    ],
    about: 'O seară caldă de muzică acustică, organizată de Interact Sf. Sava. Trei artiști, un singur reflector și o sală plină de oameni care vor să asculte fără filtre. Toate fondurile susțin proiectul „Cărți pentru sat".',
    perks: ['Ceai și prăjituri', 'Album foto digital', 'Întâlnire cu artiștii'],
  },
  easter: {
    id: 'easter',
    slug: 'easter-egg-hunt',
    title: 'Easter Egg Hunt',
    subtitle: 'Vânătoarea de ouă din Curtea Veche',
    eyebrow: 'EVENIMENT DE PRIMĂVARĂ',
    dateLabel: 'Sâm · 19 Apr · 11:00',
    dateLong: 'Sâmbătă, 19 aprilie 2025',
    doors: 'Început · 11:00 · Premii · 13:30',
    venue: 'Curtea Veche',
    venueLine: 'Strada Iuliu Maniu 7 · București',
    price: 25,
    capacity: 80,
    sold: 80,
    checkedIn: 76,
    accent: '#16A34A',
    photo: 'assets/easter-egg-hunt.png',
    photoAspect: '351 / 462',
    program: [
      { t: '11:00', l: 'Adunarea în curte' },
      { t: '11:30', l: 'Vânătoarea începe' },
      { t: '13:00', l: 'Decorat ouă' },
      { t: '13:30', l: 'Premii și pasca' },
    ],
    about: 'O dimineață de primăvară în curtea liceului — ouă ascunse, premii dulci și cea mai veselă vânătoare a anului. Fondurile au susținut „Bursele Sava".',
    perks: ['Coș cadou', 'Pasca de la nene Ion', 'Premii pentru cei mici'],
  },
  cupids: {
    id: 'cupids',
    slug: 'cupids-hex',
    title: "Cupid's Hex",
    subtitle: 'Bal mascat de Sf. Valentin',
    eyebrow: 'BAL · ARHIVĂ',
    dateLabel: 'Vin · 14 Feb · 20:00',
    dateLong: 'Vineri, 14 februarie 2025',
    doors: 'Porțile · 20:00 · Dans · 21:00',
    venue: 'Salonul Sava',
    venueLine: 'Strada Caragiale 16 · București',
    price: 55,
    capacity: 100,
    sold: 100,
    checkedIn: 94,
    accent: '#DC2626',
    photo: 'assets/cupids-hex.png',
    photoAspect: '340 / 465',
    program: [
      { t: '20:00', l: 'Porțile se deschid' },
      { t: '20:30', l: 'Cocktail de bun venit' },
      { t: '21:00', l: 'DJ Lulu · primul set' },
      { t: '23:30', l: 'Pasul de pe urmă' },
    ],
    about: 'O seară roșu-burgund, măști de carton și scrisori de dragoste anonime. Cel mai bine costumat câștigă un weekend la Brașov.',
    perks: ['Mască inclusă', 'Cocktail de bun venit', 'Fotograf în sală'],
  },
};

// Attendees seed — for admin + scanner
const SP_ATTENDEES = [
  { n: 'Ana Vasilescu',     e: 'ana.v@savaapp.ro',     id: 'SP-2611-AV',  status: 'in',     t: '19:14' },
  { n: 'Tudor Mihăescu',    e: 'tudor.m@savaapp.ro',   id: 'SP-2611-TM',  status: 'in',     t: '19:16' },
  { n: 'Ilinca Pop',        e: 'ilinca.p@savaapp.ro',  id: 'SP-2611-IP',  status: 'valid',  t: null  },
  { n: 'Matei Constantin',  e: 'matei.c@savaapp.ro',   id: 'SP-2611-MC',  status: 'in',     t: '19:22' },
  { n: 'Sara Lungu',        e: 'sara.l@savaapp.ro',    id: 'SP-2611-SL',  status: 'valid',  t: null  },
  { n: 'David Anton',       e: 'david.a@savaapp.ro',   id: 'SP-2611-DA',  status: 'in',     t: '19:31' },
  { n: 'Carmen Iliescu',    e: 'carmen.i@savaapp.ro',  id: 'SP-2611-CI',  status: 'in',     t: '19:34' },
  { n: 'Radu Petrescu',     e: 'radu.p@savaapp.ro',    id: 'SP-2611-RP',  status: 'valid',  t: null  },
  { n: 'Maria Stoica',      e: 'maria.s@savaapp.ro',   id: 'SP-2611-MS',  status: 'in',     t: '19:38' },
  { n: 'Andrei Lupu',       e: 'andrei.l@savaapp.ro',  id: 'SP-2611-AL',  status: 'used',   t: '19:01' },
  { n: 'Bianca Neagu',      e: 'bianca.n@savaapp.ro',  id: 'SP-2611-BN',  status: 'in',     t: '19:42' },
  { n: 'Cristian Marin',    e: 'cristian.m@savaapp.ro',id: 'SP-2611-CM',  status: 'valid',  t: null  },
  { n: 'Elena Dumitrescu',  e: 'elena.d@savaapp.ro',   id: 'SP-2611-ED',  status: 'in',     t: '19:45' },
];

// Revenue by day (last 14 days)
const SP_REVENUE = [
  { d: '01', v: 0   }, { d: '02', v: 90  }, { d: '03', v: 135 }, { d: '04', v: 45  },
  { d: '05', v: 270 }, { d: '06', v: 180 }, { d: '07', v: 360 }, { d: '08', v: 225 },
  { d: '09', v: 405 }, { d: '10', v: 540 }, { d: '11', v: 315 }, { d: '12', v: 450 },
  { d: '13', v: 630 }, { d: '14', v: 135 },
];

// Scan log (latest first)
const SP_SCANS = [
  { id: 'SP-2611-ED', n: 'Elena Dumitrescu', t: '19:45', ok: true },
  { id: 'SP-2611-BN', n: 'Bianca Neagu',     t: '19:42', ok: true },
  { id: 'SP-2611-MS', n: 'Maria Stoica',     t: '19:38', ok: true },
  { id: 'SP-2611-CI', n: 'Carmen Iliescu',   t: '19:34', ok: true },
  { id: 'SP-2611-DA', n: 'David Anton',      t: '19:31', ok: true },
  { id: 'SP-2611-XX', n: 'Bilet necunoscut', t: '19:28', ok: false },
  { id: 'SP-2611-MC', n: 'Matei Constantin', t: '19:22', ok: true },
  { id: 'SP-2611-TM', n: 'Tudor Mihăescu',   t: '19:16', ok: true },
  { id: 'SP-2611-AV', n: 'Ana Vasilescu',    t: '19:14', ok: true },
  { id: 'SP-2611-AL', n: 'Andrei Lupu',      t: '19:01', ok: true },
];

Object.assign(window, { SP_EVENTS, SP_ATTENDEES, SP_REVENUE, SP_SCANS });
