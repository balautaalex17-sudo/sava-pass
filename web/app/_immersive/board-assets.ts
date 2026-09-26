type Portrait = { src: string | null; width: number; height: number; position: string; rotate?: "left" };

// Preserve a blank card for every member whose photo has not been supplied.
const EMPTY_PORTRAIT: Portrait = { src: null, width: 1200, height: 1600, position: "center" };

export const BOARD_PORTRAITS: Readonly<Record<string, Portrait>> = {
  "Rugină Maia": EMPTY_PORTRAIT,
  "Bogdan Mircea": EMPTY_PORTRAIT,
  "Țone Adelina": { src: "/imersiv/board-vice-president.png", width: 1600, height: 1200, position: "center", rotate: "left" },
  "Balașcă Carla": EMPTY_PORTRAIT,
  "Niemesch Cristian": { src: "/imersiv/board-treasurer.png", width: 1200, height: 1600, position: "center" },
  "Craciun Daria": { src: "/imersiv/board-pr.png", width: 1200, height: 1600, position: "center" },
  "Naghi Sabin": { src: "/imersiv/board-hr.png", width: 1200, height: 1600, position: "center" },
  "Bălulescu Sara": { src: "/imersiv/board-project-manager.png", width: 1200, height: 1600, position: "center" },
  "Ogrezeanu-Costescu Sofia": EMPTY_PORTRAIT,
};
