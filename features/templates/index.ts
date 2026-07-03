// Components
export { TemplatesPage } from './components';

// Registry (client)
export {
  renderTemplate,
  type DesignProps,
  type SubmitValues,
} from './registry';

// Template library data
export { TEMPLATE_LIBRARY, DEFAULT_TEMPLATE_ID } from './data/template-library';

// Constants
export { DESIGN_NATURAL_WIDTH } from './constants';

// Utils (pure)
export {
  buildCoupleName,
  buildFormattedDate,
  buildTime,
  buildDishOptions,
  DIETARY_EMOJI,
  DIETARY_LABEL,
  type DishOption,
} from './utils';

// Types
export type {
  TemplateCategory,
  TemplatePalette,
  LandingTemplate,
} from './types';
