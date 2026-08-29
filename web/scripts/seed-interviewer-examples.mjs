import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const examples = [
  {
    key: "mara-ionescu",
    name: "[EXEMPLU] Mara Ionescu",
    email: "mara.ionescu.interview@example.invalid",
    phone: "0700 000 101",
    grade: "Clasa a X-a A",
    rating: "green",
    comment: "Comunică clar, oferă exemple concrete și își asumă responsabilitatea. A propus un proiect realist și pare pregătită să lucreze constant în echipă.",
    answers: {
      about_you: "La prima vedere par mai rezervată, dar după ce mă simt în largul meu îmi place să pornesc conversații și să îi ajut pe ceilalți să se simtă incluși.",
      mistake: "La un proiect pentru școală am presupus că toată lumea înțelesese planul și nu am verificat. După ce am observat problema, am discutat cu echipa, am refăcut pașii și am învățat să cer confirmări din timp.",
      team_priority: "Pentru mine promisiunea este baza încrederii, iar rezultatul trebuie construit pornind de acolo. Dacă apar probleme, anunț echipa devreme și renegociez responsabilitatea în loc să ascund întârzierea.",
      club_exchange: "Pot oferi seriozitate, idei pentru comunicare și disponibilitatea de a duce un task până la capăt. De la Interact sper să învăț să lucrez mai bine cu oameni diferiți și să transform ideile în proiecte cu impact.",
      promote_event: "Aș porni de la un mesaj scurt și vizual pentru fiecare clasă, apoi aș ruga câțiva colegi să îl distribuie în grupurile lor. Aș arăta concret ce se întâmplă la eveniment și aș folosi un formular simplu de înscriere, cu un reminder înainte de termen.",
      team_organization: "Aș împărți proiectul în task-uri mici, cu un responsabil și un termen clar pentru fiecare. Aș face un check-in scurt la două zile și aș păstra un document comun în care vedem ce este făcut și unde există blocaje.",
    },
    questionScores: { about_you: 1, mistake: 1, team_priority: 1, club_exchange: 1, promote_event: 1, team_organization: 1 },
    baseScore: 6,
    bonusPoints: 2,
  },
  {
    key: "andrei-pop",
    name: "[EXEMPLU] Andrei Pop",
    email: "andrei.pop.interview@example.invalid",
    phone: "0700 000 102",
    grade: "Clasa a IX-a B",
    rating: "yellow",
    comment: "Are idei bune și mult entuziasm, însă disponibilitatea săptămânală și felul în care gestionează conflictele trebuie clarificate într-o discuție de echipă.",
    answers: {
      about_you: "Par foarte energic atunci când vorbesc despre ideile mele, dar uneori am nevoie de puțin timp ca să ascult toate opiniile din echipă.",
      mistake: "Am uitat o parte dintr-un task pentru că nu mi-am notat termenul. Mi-am cerut scuze, am terminat ce lipsea și de atunci folosesc un calendar pentru lucrurile importante.",
      team_priority: "Cred că promisiunea contează, dar nu trebuie să ne oprească să îmbunătățim rezultatul. Dacă cele două intră în conflict, aș spune echipei ce pot livra realist și aș propune o variantă mai bună pentru următorul termen.",
      club_exchange: "Pot oferi entuziasm, idei de promovare și curajul de a încerca formate noi. Aș vrea să primesc experiență practică, feedback și ocazia de a cunoaște oameni care vor să construiască proiecte.",
      promote_event: "Aș face un teaser video de câteva secunde și l-aș posta în grupurile claselor, apoi aș merge personal în câteva clase să explic de ce merită să vină. Aș crea și un mic challenge între clase ca să avem un motiv în plus pentru înscriere.",
      team_organization: "Aș face un grup de lucru, aș împărți responsabilitățile și aș pune un deadline pentru fiecare etapă. Mi-ar fi util să avem un call scurt la începutul zilei, ca să vedem dacă cineva are nevoie de ajutor.",
    },
    questionScores: { about_you: 0.5, mistake: 0.5, team_priority: 0.5, club_exchange: 1, promote_event: 0.5, team_organization: 0.5 },
    baseScore: 3.5,
    bonusPoints: 0,
  },
  {
    key: "sofia-dumitrescu",
    name: "[EXEMPLU] Sofia Dumitrescu",
    email: "sofia.dumitrescu.interview@example.invalid",
    phone: "0700 000 103",
    grade: "Clasa a X-a C",
    rating: "red",
    comment: "Răspunsurile au rămas foarte generale și nu oferă exemple clare despre asumarea responsabilității sau timpul disponibil. Nu recomand formularul pentru etapa următoare.",
    answers: {
      about_you: "Sunt o persoană normală și cred că mă cunosc mai bine oamenii după ce petrec timp cu mine.",
      mistake: "Am greșit de câteva ori la școală. Încerc să fiu mai atentă pe viitor.",
      team_priority: "Cred că ambele sunt importante. Dacă apar probleme, aș vorbi cu liderul echipei.",
      club_exchange: "Pot să ajut când este nevoie și sper să cunosc oameni noi în club.",
      promote_event: "Aș posta despre eveniment pe social media și le-aș spune colegilor să vină.",
      team_organization: "Aș face un grup și am împărți task-urile între noi.",
    },
    questionScores: { about_you: 0, mistake: 0.5, team_priority: 0.5, club_exchange: 0.5, promote_event: 0.5, team_organization: 0 },
    baseScore: 2,
    bonusPoints: 0,
  },
  {
    key: "radu-enache",
    name: "[EXEMPLU] Radu Enache",
    email: "radu.enache.interview@example.invalid",
    phone: "0700 000 104",
    grade: "Clasa a IX-a D",
    rating: null,
    comment: null,
    answers: {
      about_you: "Par liniștit la început, dar îmi place să pun întrebări și să mă implic când înțeleg obiectivul. Am nevoie de câteva întâlniri ca să prind curaj într-un grup nou.",
      mistake: "La un eveniment al școlii nu am estimat bine cât durează pregătirea. Am spus imediat că am nevoie de ajutor, am împărțit sarcinile și am notat ce trebuie verificat data viitoare.",
      team_priority: "Aș prefera să îmi respect promisiunea și să comunic dacă rezultatul poate fi îmbunătățit ulterior. Când apar probleme, caut o soluție realistă împreună cu echipa și nu las colegii să afle în ultimul moment.",
      club_exchange: "Pot oferi atenție la detalii, răbdare și disponibilitatea de a învăța lucruri noi. De la Interact sper să primesc feedback și să învăț cum se construiește un proiect de la idee până la rezultate.",
      promote_event: "Aș vorbi cu elevii despre ce pot face concret la eveniment și aș folosi povești scurte de la membri care au participat. Apoi aș trimite un reminder clar cu data, locul și linkul de înscriere.",
      team_organization: "Aș începe cu o listă comună de task-uri, apoi aș stabili ce este urgent și cine poate prelua fiecare lucru. În fiecare seară aș actualiza statusul și aș muta task-urile blocate către persoana care poate ajuta.",
    },
    questionScores: null,
    baseScore: null,
    bonusPoints: 0,
  },
];

const { data: interviewer, error: interviewerError } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", required("STAFF_TEST_INTERVIEWER_EMAIL"))
  .eq("role", "interviewer")
  .single();
if (interviewerError) throw interviewerError;

const { data: form, error: formError } = await supabase
  .from("recruitment_forms")
  .select("id, campaign_id")
  .eq("status", "active")
  .order("version", { ascending: false })
  .limit(1)
  .single();
if (formError || !form.campaign_id) throw formError ?? new Error("Active form has no campaign");

const { data: fields, error: fieldsError } = await supabase
  .from("recruitment_fields")
  .select("key, source_header")
  .eq("form_id", form.id)
  .order("position");
if (fieldsError) throw fieldsError;

const periodTitle = "[TEST] Interviuri exemple";
let { data: period, error: periodFindError } = await supabase
  .from("interview_periods")
  .select("id")
  .eq("title", periodTitle)
  .maybeSingle();
if (periodFindError) throw periodFindError;
if (!period) {
  const { data, error } = await supabase.from("interview_periods").insert({
    campaign_id: form.campaign_id,
    title: periodTitle,
    starts_at: "2026-08-18T14:00:00+03:00",
    ends_at: "2026-08-18T16:00:00+03:00",
    slot_duration_minutes: 25,
    default_location: "Sala de consiliu · TEST",
  }).select("id").single();
  if (error) throw error;
  period = data;
}

let { data: slots, error: slotsError } = await supabase
  .from("interview_slots")
  .select("id, starts_at")
  .eq("period_id", period.id)
  .order("starts_at");
if (slotsError) throw slotsError;
if ((slots ?? []).length < examples.length) {
  const start = new Date("2026-08-18T14:00:00+03:00");
  const rows = examples.map((_, index) => {
    const startsAt = new Date(start.getTime() + index * 30 * 60_000);
    return {
      period_id: period.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 25 * 60_000).toISOString(),
      room: "Sala de consiliu · TEST",
      capacity: 1,
    };
  });
  const { error } = await supabase.from("interview_slots").insert(rows);
  if (error) throw error;
  const refreshed = await supabase.from("interview_slots").select("id, starts_at").eq("period_id", period.id).order("starts_at");
  if (refreshed.error) throw refreshed.error;
  slots = refreshed.data;
}

for (let index = 0; index < examples.length; index += 1) {
  const example = examples[index];
  const baseAnswers = {
    timestamp: "13.08.2026 12:00:00",
      respondent_email: example.email,
      full_name: example.name,
      email: example.email,
      phone: example.phone,
      grade: example.grade,
      version: 2,
      ...example.answers,
  };
  const sourcePayload = Object.fromEntries(fields.map((field) => [
    field.source_header,
    baseAnswers[field.key] ?? "",
  ]));

  let { data: application, error: applicationFindError } = await supabase
    .from("membership_applications")
    .select("id")
    .eq("source", "staff_test_example")
    .eq("source_row_identifier", example.key)
    .maybeSingle();
  if (applicationFindError) throw applicationFindError;

  const applicationValues = {
    campaign_id: form.campaign_id,
    form_id: form.id,
    full_name: example.name,
    email: example.email,
    phone: example.phone,
    grade: example.grade,
    motivation: example.answers.club_exchange,
    availability: example.answers.team_organization,
    strength: example.answers.about_you,
    answers: baseAnswers,
    source_payload: sourcePayload,
    source: "staff_test_example",
    source_row_identifier: example.key,
    status: "interview_scheduled",
    submitted_at: "2026-08-13T12:00:00+03:00",
  };

  if (application) {
    const { error } = await supabase.from("membership_applications").update(applicationValues).eq("id", application.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("membership_applications").insert(applicationValues).select("id").single();
    if (error) throw error;
    application = data;
  }

  let { data: interview, error: interviewFindError } = await supabase
    .from("interviews")
    .select("id")
    .eq("application_id", application.id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (interviewFindError) throw interviewFindError;
  if (!interview) {
    const { data, error } = await supabase.from("interviews").insert({
      application_id: application.id,
      slot_id: slots[index].id,
      status: "scheduled",
      scheduled_at: slots[index].starts_at,
      location: "Sala de consiliu · TEST",
    }).select("id").single();
    if (error) throw error;
    interview = data;
  }

  const { error: assignmentError } = await supabase.from("interview_interviewers").upsert({
    interview_id: interview.id,
    profile_id: interviewer.id,
    slot_id: slots[index].id,
  }, { onConflict: "interview_id,profile_id" });
  if (assignmentError) throw assignmentError;

  if (example.rating && example.comment) {
    const { error } = await supabase.from("application_evaluations").upsert({
      application_id: application.id,
      reviewer_id: interviewer.id,
      rating: example.rating,
      comment: example.comment,
      question_scores: example.questionScores ?? {},
      base_score: example.baseScore,
      bonus_points: example.bonusPoints ?? 0,
    }, { onConflict: "application_id,reviewer_id" });
    if (error) throw error;
  }
}

console.log(`Interviewer examples ready: ${examples.length}`);
