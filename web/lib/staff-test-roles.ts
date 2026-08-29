import type { StaffRole } from "@/lib/roles";

export const STAFF_TEST_ROLE_VALUES = [
  "admin",
  "board",
  "scanner",
  "interviewer",
] as const satisfies readonly StaffRole[];

export type StaffTestRole = (typeof STAFF_TEST_ROLE_VALUES)[number];

export const STAFF_TEST_ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Administrator",
    description: "Toate instrumentele și permisiunile",
    destination: "/board",
  },
  {
    value: "board",
    label: "Board",
    description: "Aceleași instrumente și permisiuni ca administratorul",
    destination: "/board",
  },
  {
    value: "scanner",
    label: "Scanner bilete",
    description: "Validare bilete și confirmări cash",
    destination: "/board/scaneaza-bilete",
  },
  {
    value: "interviewer",
    label: "Intervievator",
    description: "Candidați alocați și evaluări private",
    destination: "/board/interviuri",
  },
] as const satisfies readonly {
  value: StaffTestRole;
  label: string;
  description: string;
  destination: `/${string}`;
}[];

export function staffTestDestination(role: StaffTestRole) {
  return STAFF_TEST_ROLE_OPTIONS.find((option) => option.value === role)!
    .destination;
}
