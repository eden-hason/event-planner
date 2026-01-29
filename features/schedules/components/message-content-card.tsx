'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  IconMessage,
  IconPlus,
  IconX,
  IconEye,
  IconSend,
} from '@tabler/icons-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useComposedRefs } from '@/lib/compose-refs';
import { EventScheduleApp, UpdateSchedule } from '../schemas';

// Available variables that can be inserted into the message
// Keys should match the data properties you'll pass to lodash template
const messageVariables = [
  { key: 'guest_name', label: 'Guest Name' },
  { key: 'event_name', label: 'Event Name' },
  { key: 'event_date', label: 'Event Date' },
  { key: 'venue', label: 'Venue' },
  { key: 'rsvp_link', label: 'RSVP Link' },
] as const;

// Helper to check if a variable exists in the message body
function isVariableInMessage(
  messageBody: string,
  variableKey: string,
): boolean {
  const templateVar = `{{ ${variableKey} }}`;
  return messageBody.includes(templateVar);
}

interface MessageContentCardProps {
  schedule: EventScheduleApp | null;
}

export function MessageContentCard({ schedule }: MessageContentCardProps) {
  const form = useFormContext<UpdateSchedule>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Watch messageBody to reactively check which variables are already inserted
  const messageBody = useWatch({
    control: form.control,
    name: 'messageBody',
  });

  // Memoize the set of inserted variables for performance
  const insertedVariables = useMemo(() => {
    const body = messageBody || '';
    return new Set(
      messageVariables
        .filter((v) => isVariableInMessage(body, v.key))
        .map((v) => v.key),
    );
  }, [messageBody]);

  const insertVariable = useCallback(
    (variableKey: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const templateVar = `{{ ${variableKey} }}`;
      const currentValue = form.getValues('messageBody') || '';
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      // Insert the variable at cursor position
      const newValue =
        currentValue.substring(0, selectionStart) +
        templateVar +
        currentValue.substring(selectionEnd);

      // Update the form value
      form.setValue('messageBody', newValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      // Set cursor position after the inserted variable
      // Use setTimeout to ensure the value is updated first
      setTimeout(() => {
        const newCursorPos = selectionStart + templateVar.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [form],
  );

  const removeVariable = useCallback(
    (variableKey: string) => {
      const templateVar = `{{ ${variableKey} }}`;
      const currentValue = form.getValues('messageBody') || '';

      // Remove all occurrences of the variable
      const newValue = currentValue.replaceAll(templateVar, '');

      // Update the form value
      form.setValue('messageBody', newValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      // Focus the textarea
      textareaRef.current?.focus();
    },
    [form],
  );

  const toggleVariable = useCallback(
    (variableKey: string, isInserted: boolean) => {
      if (isInserted) {
        removeVariable(variableKey);
      } else {
        insertVariable(variableKey);
      }
    },
    [insertVariable, removeVariable],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconMessage className="size-5" />
          Message Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Variables section */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {messageVariables.map((variable) => {
                const isInserted = insertedVariables.has(variable.key);

                return (
                  <Button
                    key={variable.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!schedule}
                    onClick={() => toggleVariable(variable.key, isInserted)}
                    className={
                      isInserted
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md hover:border-blue-700 hover:bg-blue-700 hover:text-white hover:shadow-lg'
                        : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                    }
                  >
                    {isInserted ? (
                      <IconX className="size-3.5" />
                    ) : (
                      <IconPlus className="size-3.5" />
                    )}
                    {variable.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Click to insert or remove variables. Variables will be replaced
              with actual values when sending.
            </p>
          </div>

          {/* Textarea for message content */}
          <FormField
            control={form.control}
            name="messageBody"
            render={({ field }) => {
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const composedRef = useComposedRefs(textareaRef, field.ref);

              return (
                <FormItem>
                  <Label className="text-sm font-medium text-gray-700">
                    Message Template
                  </Label>
                  <FormControl>
                    <Textarea
                      ref={composedRef}
                      className="min-h-[280px] resize-y font-mono text-sm leading-relaxed"
                      placeholder="Enter your message here... Click the variable badges above to insert dynamic content."
                      disabled={!schedule}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="mt-1 text-xs text-gray-500">
                    Template syntax:{' '}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-blue-600">
                      {'{{ variable_name }}'}
                    </code>
                  </p>
                </FormItem>
              );
            }}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!schedule || !messageBody}
        >
          <IconEye className="size-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!schedule || !messageBody}
        >
          <IconSend className="size-4" />
          Send Test Message
        </Button>
      </CardFooter>
    </Card>
  );
}
