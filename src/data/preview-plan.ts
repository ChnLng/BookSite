export type PreviewPlanSection = {
  title: string;
  summary: string;
};

export const previewPlanSections: PreviewPlanSection[] = [
  {
    title: "Architecture",
    summary: "App Router pages stay focused on catalogue, account, admin and protected reading flows.",
  },
  {
    title: "Visual direction",
    summary: "A calm premium interface uses glass panels, warm light and compact page height.",
  },
  {
    title: "Page modules",
    summary: "Homepage, catalogue, account and admin each expose one clear primary task.",
  },
];

export const visualPillars = [
  "Story-led hero",
  "Structured catalogue",
  "Calm account experience",
] as const;
