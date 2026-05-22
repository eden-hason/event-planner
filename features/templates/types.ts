export type TemplateCategory = 'classic' | 'modern' | 'minimal' | 'floral' | 'festive' | 'elegant' | 'celebration';

export interface TemplatePalette {
  bg: string;
  bgGradient?: string;
  accent: string;
  text: string;
  muted: string;
  button: string;
}

export interface LandingTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  palette: TemplatePalette;
  previewImage?: string;
  /** 'live' = rendered from a real design component; 'palette' = abstract palette mockup */
  kind?: 'live' | 'palette';
  /** Coral + teal accent pair for live designs */
  accentPair?: [string, string];
}
