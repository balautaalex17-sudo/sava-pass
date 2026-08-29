export const RECRUITMENT_QUESTION_KEYS = [
  "about_you",
  "mistake",
  "team_priority",
  "club_exchange",
  "promote_event",
  "team_organization",
] as const;

export type RecruitmentQuestionKey = (typeof RECRUITMENT_QUESTION_KEYS)[number];

export type RecruitmentQuestion = {
  key: RecruitmentQuestionKey;
  label: string;
};

export const RECRUITMENT_QUESTIONS = [
  {
    key: "about_you",
    label: "Care este un lucru despre tine pe care oamenii îl înțeleg abia după ce ajung să te cunoască mai bine?",
  },
  {
    key: "mistake",
    label: "Povestește-ne despre o situație în care ai greșit. Ce ai făcut după ce ți-ai dat seama?",
  },
  {
    key: "team_priority",
    label: "Ce este mai important într-o echipă: să îți respecți promisiunea sau să obții cel mai bun rezultat posibil? Ce faci când cele două intră în conflict?",
  },
  {
    key: "club_exchange",
    label: "Ce crezi că poți oferi tu clubului și ce speri să primești de la Interact Sf. Sava?",
  },
  {
    key: "promote_event",
    label: "În perioada următoare se va desfășura un eveniment important pentru clubul nostru, dar ne-am dat seama că nu avem așa multe înscrieri. Cum ai promova acest eveniment pentru elevi de liceu?",
  },
  {
    key: "team_organization",
    label: "Ce sistem de organizare ai implementa în cadrul echipei tale (aprox. 3-5 oameni) într-o perioadă aglomerată?",
  },
] as const satisfies readonly RecruitmentQuestion[];

export function recruitmentQuestionsFromFields(
  fields: readonly { key: string; label: string }[],
): RecruitmentQuestion[] {
  return RECRUITMENT_QUESTIONS.map((fallback) => {
    const configured = fields.find((field) => field.key === fallback.key)?.label.trim();
    return { key: fallback.key, label: configured || fallback.label };
  });
}

export function isRecruitmentQuestionKey(value: string): value is RecruitmentQuestionKey {
  return (RECRUITMENT_QUESTION_KEYS as readonly string[]).includes(value);
}

export const RECRUITMENT_MIN_ANSWER_CHARACTERS = 100;

export const RECRUITMENT_SCHEDULE = [
  ["7 septembrie 2026", "Deschiderea formularului online"],
  ["7–11 septembrie 2026", "Promovarea clubului în liceu"],
  ["17 septembrie 2026", "Ziua Porților Deschise Interact Sf. Sava"],
  ["24 septembrie 2026", "Închiderea formularului"],
  ["28–30 septembrie 2026", "Procesarea formularelor"],
  ["1 octombrie 2026", "Comunicarea răspunsurilor pentru formular"],
  ["2–4 octombrie 2026", "Interviuri fizice în sălile CNSS"],
  ["6–7 octombrie 2026", "Comunicarea răspunsurilor după interviu"],
  ["8 septembrie 2026", "Prima ședință cu recruții"],
] as const;

export const INTERVIEW_INTRO_QUESTIONS = [
  "Ce îți place să faci în timpul liber? / Care este locul tău preferat de ieșit cu prietenii?",
  "Cum ai auzit de Interact? Știi cu ce se ocupă Interactul?",
  "Ești liber joia?",
] as const;

export const INTERVIEW_QUESTION_SETS = {
  personality: {
    label: "Personalitate",
    weight: "25%",
    sets: {
      set1: [
        {
          key: "personality_1_1",
          label: "Cauza aleasă",
          prompt: "Știi că noi aici la Interact organizăm evenimente și donăm bani strânși către diverse cauze. Dacă ai putea să ajuți o singură cauză tot restul vieții tale, care ar fi aceea?",
        },
        {
          key: "personality_1_2",
          label: "Lucru de îmbunătățit",
          prompt: "Care este un lucru la care simți că mai ai de lucrat ca persoană? Follow-up: Ce ai făcut concret până acum ca să îmbunătățești?",
        },
      ],
      set2: [
        {
          key: "personality_2_1",
          label: "Tradiție nouă",
          prompt: "Dacă ai putea introduce o singură tradiție nouă în club, care ar fi aceea și de ce?",
        },
        {
          key: "personality_2_2",
          label: "Comportament apreciat",
          prompt: "Pentru ce comportament ai prefera să fii apreciat de colegii din Interact la finalul anului? Follow-up: Ce ai face concret ca să arăți asta?",
        },
      ],
    },
  },
  creativity: {
    label: "Creativitate",
    weight: "25%",
    sets: {
      set1: [
        {
          key: "creativity_1_1",
          label: "Voluntariat fără promovare online",
          prompt: "Trebuie să convingi 30 de liceeni să participe la o acțiune de voluntariat, dar nu ai voie să folosești rețelele de socializare sau afișe. Cum procedezi?",
        },
        {
          key: "creativity_1_2",
          label: "Activitate cu buget mic",
          prompt: "Ai un buget foarte mic și trebuie să organizezi o activitate pentru club care să îi facă pe oameni să își dorească să participe. Ce activitate ai organiza?",
        },
      ],
      set2: [
        {
          key: "creativity_2_1",
          label: "100 de rațe de cauciuc",
          prompt: "Primești o cutie cu 100 de rațe de cauciuc. Cum le-ai folosi pentru un proiect Interact?",
        },
        {
          key: "creativity_2_2",
          label: "O zi și 20 de voluntari",
          prompt: "Dacă ai avea la dispoziție o zi întreagă și 20 de voluntari, ce activitate ai organiza?",
        },
      ],
    },
  },
  situations: {
    label: "Situații",
    weight: "50%",
    sets: {
      set1: [
        {
          key: "situations_1_1",
          label: "Sponsorul anulează",
          prompt: "Cum ai proceda dacă ai afla cu o zi înainte de eveniment că sponsorul principal anulează?",
        },
        {
          key: "situations_1_2",
          label: "Conflict în echipă",
          prompt: "Ești într-o echipă care organizează un proiect important. Doi membri ai echipei se ceartă constant și nu mai reușesc să colaboreze, afectează și restul echipei. Tu ce ai face?",
        },
        {
          key: "situations_1_3",
          label: "Sarcină nefinalizată",
          prompt: "Aveți un proiect care trebuie terminat peste 3 zile. Un coleg avea o sarcină importantă, însă nu și-a făcut partea. Ce faci?",
        },
        {
          key: "situations_1_4",
          label: "Proiect sub așteptări",
          prompt: "Organizați un proiect / eveniment care nu iese exact cum v-ați așteptat. Participă mai puține persoane decât ați crezut și aveți probleme cu banii. Ce faci după aceea?",
        },
      ],
      set2: [
        {
          key: "situations_2_1",
          label: "Trei sarcini urgente",
          prompt: "Ești responsabil de un proiect și ai primit 3 sarcini urgente: un coleg îți cere ajutorul pentru o problemă, tu trebuie să-ți termini și tu partea ta și coordonatorul îți cere să rezolvi o altă problemă. Ai timp doar pentru două dintre ele. Cum decizi ce faci?",
        },
        {
          key: "situations_2_2",
          label: "Ideea respinsă",
          prompt: "Într-o ședință ai o idee în care crezi foarte mult, dar toți ceilalți votează pentru altă variantă. Ce faci?",
        },
        {
          key: "situations_2_3",
          label: "Școală și club",
          prompt: "Ai foarte multe lucruri de făcut pentru școală exact în săptămâna în care ai și o responsabilitate importantă în club. Cum gestionezi situația?",
        },
        {
          key: "situations_2_4",
          label: "Creativitate sau siguranță",
          prompt: "Trebuie să alegi între o idee foarte creativă, dar riscantă, și una mai puțin interesantă, dar despre care știi că va funcționa. Ce alegi?",
        },
      ],
    },
  },
} as const;

export type InterviewCategory = keyof typeof INTERVIEW_QUESTION_SETS;
export type InterviewSet = "set1" | "set2";
export type InterviewQuestionKey =
  (typeof INTERVIEW_QUESTION_SETS)[InterviewCategory]["sets"][InterviewSet][number]["key"];

/**
 * The current interview rubric is intentionally small: one integer per
 * category, with Situations carrying double weight.  The legacy question-set
 * constants above stay exported for old records and tools, but new interview
 * writes must use this shape.
 */
export type InterviewCategoryScores = {
  situations: number;
  personality: number;
  creativity: number;
};

const INTERVIEW_SCORE_KEYS = ["situations", "personality", "creativity"] as const;

/** Accept only the exact three integer values used by the active rubric. */
export function isValidInterviewCategoryScores(value: unknown): value is InterviewCategoryScores {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join("|") !== [...INTERVIEW_SCORE_KEYS].sort().join("|")) return false;
  return INTERVIEW_SCORE_KEYS.every((key) => {
    const score = record[key];
    return typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 5;
  });
}

/** Computes the only interview total the server and centralizer should use. */
export function interviewScoreTotal(scores: InterviewCategoryScores): number {
  return 2 * scores.situations + scores.personality + scores.creativity;
}

/** Maps the /20 total to the legacy traffic-light column for compatibility. */
export function interviewLegacyRatingForScore(score: number) {
  if (score >= 16) return "green" as const;
  if (score >= 11) return "yellow" as const;
  return "red" as const;
}

export const INTERVIEW_RUBRIC = [
  [1, "Foarte slab", "Nu răspunde concret sau răspunsul este nepotrivit."],
  [2, "Slab", "Idee decentă, dar superficială sau greu de aplicat."],
  [3, "Bun", "Răspuns logic și realist."],
  [4, "Foarte bun", "Răspuns bine structurat, matur și atent la mai multe aspecte."],
  [5, "Excelent", "Demonstrează inițiativă, empatie, adaptabilitate și capacitate de a rezolva problema."],
] as const;

export const INTERVIEW_SCORE_BANDS = [
  [36, 40, "Candidat foarte puternic"],
  [32, 35, "Candidat foarte bun"],
  [27, 31, "Candidat bun, merită discutat"],
  [22, 26, "Incert — depinde de nevoile clubului"],
  [0, 21, "Probabil nu este potrivit în acest moment"],
] as const;

export const INTERVIEW_COMMITTEE_ROLES = [
  ["board", "Membru Board", "Conduce interviul și ia primul contact cu candidatul."],
  ["hr", "Membru HR", "Urmărește partea de oameni și cultura clubului."],
  ["pr", "Membru PR", "Urmărește comunicarea și creativitatea candidatului."],
  ["note_taker", "Membru pentru notițe", "Nu participă activ; notează răspunsurile candidatului."],
] as const;

export type InterviewCommitteeRole = (typeof INTERVIEW_COMMITTEE_ROLES)[number][0];

export function formRatingForScore(score: number) {
  if (score <= 2) return "red" as const;
  if (score < 4) return "yellow" as const;
  return "green" as const;
}

export function isMajorityGreen(ratings: string[]) {
  const green = ratings.filter((rating) => rating === "green").length;
  return ratings.length > 0 && green > ratings.length / 2;
}

export function interviewScoreBand(score: number) {
  return INTERVIEW_SCORE_BANDS.find(([minimum, maximum]) => score >= minimum && score <= maximum)?.[2]
    ?? "Probabil nu este potrivit în acest moment";
}
