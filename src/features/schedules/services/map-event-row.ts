/**
 * Maps a joined `events` row (snake_case) to the shape the parameter resolvers
 * read.
 *
 * Lives on its own because both the Dispatcher and the SMS Fallback need it and
 * neither owns the other. It was previously a named export of the send engine,
 * which is exactly the kind of incidental coupling that made that engine
 * impossible to split.
 */

export function mapEventRow(rawEvent: Record<string, unknown>) {
  const invitations = rawEvent.invitations as Record<string, string> | null;
  const settings = rawEvent.event_settings as {
    // Optional `link` on both: a half-configured row, or a legacy Bit row that
    // still holds `phoneNumber` and no `link`. `isGiftingEnabled` treats a
    // missing link as "not configured".
    paybox_config?: { enabled: boolean; link?: string };
    bit_config?: { enabled: boolean; link?: string };
  } | null;
  const guestExperience = rawEvent.guests_experience as {
    send_table_numbers?: boolean;
  } | null;
  return {
    id: rawEvent.id as string,
    userId: rawEvent.user_id as string,
    title: rawEvent.title as string,
    // Null for an event with no date. Such an event cannot have schedules -
    // every offset is relative to the date - so this engine should never see
    // one, but the column is nullable and the type says so.
    eventDate: rawEvent.event_date as string | null,
    location:
      (rawEvent.location as {
        name: string;
        coords?: { lat: number; lng: number };
      } | null) ?? undefined,
    hostDetails:
      (rawEvent.host_details as Record<string, unknown> | null) ?? undefined,
    invitations: invitations
      ? { imageUrl: invitations.image_url }
      : undefined,
    receptionTime: (rawEvent.reception_time as string | null) ?? undefined,
    shortCode: (rawEvent.short_code as string | null) ?? undefined,
    // Read by the template resolver, not by any placeholder.
    eventSettings: settings
      ? { payboxConfig: settings.paybox_config, bitConfig: settings.bit_config }
      : undefined,
    guestExperience: guestExperience
      ? { sendTableNumbers: guestExperience.send_table_numbers }
      : undefined,
  };
}
