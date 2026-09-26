export type ClubPhoto = { src: string; width: number; height: number; caption: string; alt: string };

// Original club photos only. Duplicate exports in the media library are omitted.
export const CLUB_PHOTOS: readonly ClubPhoto[] = [
  { src: "/imersiv/board-community.webp", width: 768, height: 1024, caption: "Pregătiri", alt: "Membrii echipei transportă împreună materiale pentru un proiect" },
  { src: "/imersiv/board-bake-sale.webp", width: 1200, height: 1600, caption: "La târg", alt: "Membrii clubului la o masă cu prăjituri în aer liber" },
  { src: "/imersiv/board-rotary.webp", width: 590, height: 787, caption: "Alături de Rotary", alt: "Trei membri lângă un stand Rotary în parc" },
  { src: "/imersiv/board-together.webp", width: 1200, height: 1600, caption: "După program", alt: "Fotografie de grup cu prieteni la o seară de club" },
  ...([
    [18, 1600, 1200, "Întâlnirea de club", "Grupul Interact alături de steagul albastru al clubului"],
    [1, 900, 1600, "În curte", "Cinci membri cu materiale de prezentare într-o curte"],
    [4, 1179, 654, "Fotografia de grup", "Un grup mare în parc, cu diplome în mâini"],
    [7, 1200, 1600, "La aceeași masă", "Membrii clubului adunați în jurul unei mese cu materiale de lucru"],
    [28, 900, 1600, "Între activități", "Membri la o masă într-o curte"],
    [6, 900, 1600, "În sală", "Invitați la o masă de discuții în fața unei proiecții"],
    [5, 1600, 1200, "În decembrie", "Copii și voluntari reuniți pentru o fotografie de sărbători"],
    [2, 1179, 1545, "La masa cu prăjituri", "Fotografie de grup lângă o masă cu prăjituri în hol"],
    [3, 1098, 1600, "Pe scări", "Un grup de prieteni pe scările din interiorul unei clădiri"],
    [8, 590, 787, "În parc", "Membri și un câine lângă cortul Rotary"],
    [10, 1179, 1560, "La stand", "Stand Rotary cu un coș de mere și materiale de prezentare"],
    [11, 929, 1600, "Un stand în aer liber", "Materiale de prezentare și borcane așezate pe o bancă sub un copac"],
    [12, 1600, 1200, "În vizită", "Voluntari și copii adunați pentru o fotografie în interior"],
    [13, 1600, 1200, "Împreună, afară", "Fotografie de grup în fața unei case"],
    [14, 1170, 1547, "Înainte de eveniment", "Doi membri pe scări, ținând bilete în mâini"],
    [15, 1200, 1600, "Voluntari", "Trei voluntari în echipament de protecție într-o clinică"],
    [16, 1200, 1600, "Cu flori", "Două membre cu flori în fața unui spital"],
    [17, 1600, 1066, "La eveniment", "Membri reuniți în fața unui panou de eveniment"],
    [19, 1600, 1200, "Pe drum", "Prieteni fotografiați împreună într-un tren"],
    [20, 1600, 1200, "La conferință", "Un grup de membri cu ecusoane într-un hol"],
    [21, 1600, 1200, "O fotografie pe scări", "Un grup mare de membri pe scările unei clădiri"],
    [22, 900, 1600, "La întâlnire", "Doi membri ținând un clopoțel într-o sală"],
    [23, 1200, 1600, "O amintire tipărită", "O fotografie tipărită de la o întâlnire de club"],
    [24, 1111, 726, "Lângă scenă", "Prieteni împreună la un concert"],
    [29, 1179, 889, "În oraș", "Un grup mare adunat în fața unei biserici"],
  ] as const).map(([id, width, height, caption, alt]) => ({
    src: `/media/library/real-${String(id).padStart(2, "0")}.webp`, width, height, caption, alt,
  })),
];

// References into the full collection, in editorial order. No second dataset.
// These sources have no other editorial placement in the current local pages.
export const GALLERY_PREVIEW = [
  "/media/library/real-29.webp",
  "/imersiv/board-rotary.webp",
  "/imersiv/board-bake-sale.webp",
  "/imersiv/board-together.webp",
  "/media/library/real-04.webp",
] as const;

// Match the reference's opening sequence; the viewer retains the full originals.
const openingPhotos = new Set<string>(GALLERY_PREVIEW);
export const CLUB_SLIDER_PHOTOS = [
  ...GALLERY_PREVIEW.map(src => CLUB_PHOTOS.find(photo => photo.src === src)!),
  ...CLUB_PHOTOS.filter(photo => !openingPhotos.has(photo.src)),
].map(photo => ({ ...photo, aspectRatio: 4 / 5, position: photo.src === "/media/library/real-29.webp" ? "right center" : "center" }));


