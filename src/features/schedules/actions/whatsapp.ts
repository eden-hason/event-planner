'use server';

import type { MediaParameter, ButtonComponent } from '../utils/parameter-resolvers';
import { buildWhatsAppComponents } from '../utils/send-payload';
import { postWhatsAppTemplate, type WhatsAppSendResult } from '../services/post-whatsapp';
import { TEST_MESSAGE_TAG } from '../utils/whatsapp-callback-tag';

// Deliberately not re-exported: a `'use server'` module turns every export into
// a callable action endpoint, and the bundler treats even a type re-export as
// one. The type is published from the barrel instead.

/**
 * Renders parameters into components and posts them.
 *
 * Kept as a Server Action for the one path that builds a message and sends it
 * in one breath - the test message an Owner sends themselves. The pipeline does
 * not use it: the Dispatcher renders and the Worker posts, and the two are
 * deliberately not one call.
 *
 * The transport itself lives in `services/post-whatsapp.ts` and is not exported
 * from here, because everything a `'use server'` module exports is reachable
 * over the network.
 */
export async function sendWhatsAppTemplateMessage(params: {
  to: string;
  templateName: string;
  languageCode: string;
  parameters?: MediaParameter[];
  headerParameters?: MediaParameter[];
  buttonParameters?: ButtonComponent[];
}): Promise<WhatsAppSendResult> {
  return postWhatsAppTemplate({
    channel: 'whatsapp',
    to: params.to,
    templateName: params.templateName,
    languageCode: params.languageCode,
    components: buildWhatsAppComponents(params),
  }, TEST_MESSAGE_TAG);
}
