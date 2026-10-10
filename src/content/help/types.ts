export type HelpBlock = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
  screenshot?: { file: string; alt: string; caption?: string };
};

export type HelpPageDef = {
  title: string;
  subtitle: string;
  blocks: HelpBlock[];
};
