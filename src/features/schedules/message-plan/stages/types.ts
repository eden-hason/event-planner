import type { MessageShape, Wording } from '../shape';
import type { BodyPart, MessageButton, Wrapper } from '../message-parts';

export type TemplateCategory = 'MARKETING' | 'UTILITY';

/**
 * One stage of the plan, as code (ADR 0055): its Kululu Wording, its Wrapper,
 * its buttons and the category each wording was submitted under. A stage
 * module exports one of these; `stages/index.ts` dispatches a shape to it.
 */
export interface StageDefinition<S extends MessageShape> {
  stage: S['stage'];
  /** The Kululu Wording for a shape, exactly as submitted to Meta. */
  kululuBody(shape: Extract<S, { wording: 'kululu' }>): BodyPart[];
  /** The Wrapper's lines. Only the Thank You's closing line depends on the gift. */
  wrapper(options: { gift: boolean }): Wrapper;
  /** The buttons, in the order Meta indexes them. The same for both wordings. */
  buttons(shape: S): readonly MessageButton[];
  /** The category each wording was submitted under (what Meta gave is in meta-templates.ts). */
  submittedCategory: Record<Wording, TemplateCategory>;
}
