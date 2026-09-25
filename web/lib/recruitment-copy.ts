/** Shared public timeline for the 2026–2027 recruitment campaign. */
export function recruitmentSteps(closesAt: string | null) {
  const deadline = closesAt && Number.isFinite(Date.parse(closesAt))
    ? new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", timeZone: "Europe/Bucharest" }).format(new Date(closesAt))
    : null;
  return [
    { number: "01", title: "Trimite formularul", date: deadline ? `Până pe ${deadline}` : "În perioada de înscriere", copy: "Povestește-ne despre tine și despre ce ai vrea să aduci în echipă." },
    { number: "02", title: "Află rezultatul formularului", date: "1 octombrie", copy: "Îți comunicăm dacă ai trecut în etapa interviurilor." },
    { number: "03", title: "Ne cunoaștem la interviu", date: "2–4 octombrie", copy: "Discutăm față în față, în liceu, despre tine și despre club." },
    { number: "04", title: "Primește răspunsul final", date: "6–7 octombrie", copy: "Îți comunicăm rezultatul interviului și pașii următori." },
    { number: "05", title: "Vino la prima ședință", date: "8 octombrie", copy: "Dacă ai fost acceptat, te așteptăm alături de ceilalți recruți." },
  ];
}
