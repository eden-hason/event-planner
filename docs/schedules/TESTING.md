# Testing Guide: Schedule Executor

This guide helps you manually test the schedule message executor implementation.

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   ```bash
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   ```

2. **Database Setup**:
   - Event with at least 2-3 guests
   - Guests must have valid phone numbers (Israeli format: 0541234567 or +972541234567)
   - WhatsApp template created in database
   - Schedule created with `status = 'scheduled'` and `template_id` set

## Test Scenarios

### 1. Happy Path Test

**Setup:**
```sql
-- Create a test schedule (via UI or SQL)
-- Ensure schedule has:
-- - status = 'scheduled'
-- - template_id = valid UUID from whatsapp_templates table
-- - event_id = your test event
```

**Execute:**
```typescript
import { executeSchedule } from '@/features/schedules/actions';

const result = await executeSchedule('your-schedule-id');
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Successfully sent 3 messages",
  "summary": {
    "scheduleId": "...",
    "totalGuests": 3,
    "sentCount": 3,
    "failedCount": 0,
    "skippedCount": 0,
    "deliveryIds": ["id1", "id2", "id3"]
  }
}
```

**Verify:**
- [ ] All guests received WhatsApp messages
- [ ] Messages contain correct personalized content
- [ ] Schedule status updated to 'sent'
- [ ] Schedule `sent_at` timestamp is set
- [ ] Message delivery records created in `message_deliveries` table

**SQL Verification:**
```sql
-- Check schedule updated
SELECT status, sent_at FROM schedules WHERE id = 'your-schedule-id';

-- Check delivery records created
SELECT
  guest_id,
  status,
  sent_at,
  whatsapp_message_id,
  error_message
FROM message_deliveries
WHERE schedule_id = 'your-schedule-id';

-- Check delivery stats
SELECT status, COUNT(*)
FROM message_deliveries
WHERE schedule_id = 'your-schedule-id'
GROUP BY status;
```

### 2. Idempotency Test

**Setup:** Use the same schedule from Test #1 (already executed)

**Execute:**
```typescript
const result = await executeSchedule('same-schedule-id');
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Cannot execute schedule with status: sent"
}
```

**Verify:**
- [ ] Second execution rejected
- [ ] No duplicate messages sent
- [ ] No duplicate delivery records created

### 3. Target Filter Test

**Setup:**
```sql
-- Create schedule with target filter
UPDATE schedules
SET target_filter = '{"guest_status": ["confirmed"]}'::jsonb
WHERE id = 'your-schedule-id';

-- Ensure event has mix of guest statuses
UPDATE guests SET rsvp_status = 'confirmed' WHERE id = 'guest-1';
UPDATE guests SET rsvp_status = 'pending' WHERE id = 'guest-2';
UPDATE guests SET rsvp_status = 'declined' WHERE id = 'guest-3';

-- Reset schedule to 'scheduled' status for testing
UPDATE schedules
SET status = 'scheduled', sent_at = NULL
WHERE id = 'your-schedule-id';
```

**Execute:**
```typescript
const result = await executeSchedule('your-schedule-id');
```

**Expected Result:**
- Only confirmed guests receive messages
- Pending/declined guests counted in `skippedCount`

**Verify:**
```sql
-- Should only have deliveries for confirmed guests
SELECT g.name, g.rsvp_status, md.status
FROM message_deliveries md
JOIN guests g ON g.id = md.guest_id
WHERE md.schedule_id = 'your-schedule-id';
```

### 4. Invalid Phone Number Test

**Setup:**
```sql
-- Add guest with invalid phone
INSERT INTO guests (event_id, name, phone_number, rsvp_status)
VALUES ('your-event-id', 'Invalid Phone Guest', '123', 'confirmed');

-- Add guest without phone
INSERT INTO guests (event_id, name, phone_number, rsvp_status)
VALUES ('your-event-id', 'No Phone Guest', NULL, 'confirmed');
```

**Execute:**
```typescript
const result = await executeSchedule('your-schedule-id');
```

**Expected Result:**
- Guests with invalid/missing phones skipped
- Other guests with valid phones still receive messages
- `skippedCount` includes invalid phone guests

**Verify:**
- [ ] No delivery records for guests with invalid phones
- [ ] No errors in console for skipped guests

### 5. Edge Case: Draft Status

**Setup:**
```sql
UPDATE schedules
SET status = 'draft'
WHERE id = 'your-schedule-id';
```

**Execute:**
```typescript
const result = await executeSchedule('your-schedule-id');
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Cannot execute schedule with status: draft"
}
```

### 6. Edge Case: No Template

**Setup:**
```sql
UPDATE schedules
SET template_id = NULL, status = 'scheduled'
WHERE id = 'your-schedule-id';
```

**Execute:**
```typescript
const result = await executeSchedule('your-schedule-id');
```

**Expected Result:**
```json
{
  "success": false,
  "message": "No template assigned to schedule"
}
```

### 7. Edge Case: No Guests

**Setup:**
```sql
-- Create event with no guests
-- Create schedule for that event
```

**Execute:**
```typescript
const result = await executeSchedule('empty-schedule-id');
```

**Expected Result:**
```json
{
  "success": false,
  "message": "No guests found for event"
}
```

### 8. Partial Failure Test

**Setup:**
- Mix of valid and invalid phone numbers
- Some guests might fail due to WhatsApp API errors

**Expected Behavior:**
- Successful sends create delivery records with `status = 'sent'`
- Failed sends create delivery records with `status = 'failed'` and `error_message`
- Schedule status = 'sent' if ANY messages succeeded
- Schedule status = 'failed' if ALL messages failed

**Verify:**
```sql
-- Check for both success and failures
SELECT
  status,
  COUNT(*) as count,
  COUNT(whatsapp_message_id) as with_message_id,
  COUNT(error_message) as with_errors
FROM message_deliveries
WHERE schedule_id = 'your-schedule-id'
GROUP BY status;
```

## Phone Number Formatting Tests

Test the utility functions directly:

```typescript
import {
  validatePhoneNumber,
  formatPhoneE164
} from '@/features/schedules/utils';

// Valid Israeli numbers
console.log(validatePhoneNumber('0541234567')); // true
console.log(validatePhoneNumber('+972541234567')); // true
console.log(validatePhoneNumber('972541234567')); // true
console.log(validatePhoneNumber('054-123-4567')); // true (with formatting)

// Invalid numbers
console.log(validatePhoneNumber('123')); // false (too short)
console.log(validatePhoneNumber('')); // false (empty)
console.log(validatePhoneNumber(null)); // false

// E.164 formatting
console.log(formatPhoneE164('0541234567')); // +972541234567
console.log(formatPhoneE164('972541234567')); // +972541234567
console.log(formatPhoneE164('+972541234567')); // +972541234567
console.log(formatPhoneE164('054-123-4567')); // +972541234567
```

## Template Parameter Tests

Test placeholder replacement:

```typescript
import { buildTemplateParameters } from '@/features/schedules/utils';

const params = buildTemplateParameters(
  'Hi {{guest_name}}, you are invited to {{event_title}} on {{event_date}}',
  'Sarah & David Wedding',
  '2026-06-15',
  'John Smith'
);

// Expected:
// [
//   { type: 'text', text: 'John Smith' },
//   { type: 'text', text: 'Sarah & David Wedding' },
//   { type: 'text', text: 'Monday, June 15, 2026' }
// ]
```

## Delivery Analytics Tests

Test the analytics queries:

```typescript
import {
  getMessageDeliveriesByScheduleId,
  getDeliveryStats
} from '@/features/schedules/queries';

// Get all deliveries
const deliveries = await getMessageDeliveriesByScheduleId('schedule-id');
console.log(deliveries);

// Get stats
const stats = await getDeliveryStats('schedule-id');
console.log(stats);
// Expected: { total: 5, sent: 4, delivered: 0, read: 0, failed: 1 }
```

## Debugging Tips

### Check WhatsApp API Configuration
```typescript
// Test basic connectivity
import { sendWhatsAppTestMessage } from '@/features/schedules/actions';
const result = await sendWhatsAppTestMessage();
console.log(result);
```

### Check Database State
```sql
-- View schedule with template info
SELECT
  s.*,
  wt.template_name,
  wt.display_name,
  e.title as event_title
FROM schedules s
LEFT JOIN whatsapp_templates wt ON wt.id = s.template_id
LEFT JOIN events e ON e.id = s.event_id
WHERE s.id = 'your-schedule-id';

-- View guests for event
SELECT
  id,
  name,
  phone_number,
  rsvp_status,
  group_id
FROM guests
WHERE event_id = 'your-event-id'
ORDER BY name;
```

### Enable Detailed Logging
Check your terminal/logs for these messages:
- `Error fetching schedule:` - Schedule not found or RLS blocked
- `WhatsApp API error:` - Meta API issues (check credentials, template names)
- `Failed to send to [guest]:` - Individual send failures
- `Error inserting delivery records:` - Database issues

## Common Issues & Solutions

### Issue: "WhatsApp is not configured"
**Solution:** Check `.env.local` has `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`

### Issue: "Template not found"
**Solution:** Verify template exists in database and `template_id` matches

### Issue: "No eligible guests after applying filters"
**Solution:** Check `target_filter` JSONB and ensure guests match criteria

### Issue: WhatsApp API returns error
**Solution:**
- Verify template is approved in Meta Business Manager
- Check template name matches exactly (case-sensitive)
- Ensure phone number is in E.164 format
- Verify WhatsApp number is registered and active

### Issue: RLS blocks query
**Solution:** Ensure authenticated user owns the event (check `events.user_id`)

## Success Criteria Checklist

- [ ] Schedule executes without errors
- [ ] All eligible guests receive messages
- [ ] Messages contain correct personalized content
- [ ] Delivery records created with correct status
- [ ] Schedule status updated appropriately
- [ ] Idempotency works (second call rejected)
- [ ] Target filters work correctly
- [ ] Invalid phone numbers handled gracefully
- [ ] Partial failures handled correctly
- [ ] All database queries complete successfully
- [ ] Cache revalidation triggered

## Next Steps

After manual testing passes:
1. Consider adding API route wrapper for external access (optional)
2. Add rate limiting for large guest lists (>100 guests)
3. Implement webhook handler for delivery status updates
4. Build UI components to trigger execution
5. Add scheduled execution via cron jobs
6. Implement delivery analytics dashboard
