'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { MESSAGE_TYPE_LABELS, type MessageType } from '../schemas';

interface SchedulesLayoutProps {
  visibleTypes: MessageType[];
  contentByType: Record<MessageType, { details: React.ReactNode; delivery: React.ReactNode }>;
}

const tabTriggerClassName =
  'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export function SchedulesLayout({ visibleTypes, contentByType }: SchedulesLayoutProps) {
  const [selectedType, setSelectedType] = useState<MessageType>(visibleTypes[0]);

  return (
    <div className="flex gap-6">
      {/* Left vertical menu */}
      <nav className="flex w-52 shrink-0 flex-col gap-1">
        {visibleTypes.map((type) => (
          <Button
            key={type}
            variant="ghost"
            className={cn(
              'justify-start',
              selectedType === type
                ? 'bg-background hover:bg-background'
                : 'hover:bg-background/60',
            )}
            onClick={() => setSelectedType(type)}
          >
            {MESSAGE_TYPE_LABELS[type]}
          </Button>
        ))}
      </nav>

      {/* Right content with inner tabs */}
      <div className="min-w-0 flex-1">
        <Tabs defaultValue="details">
          <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="details" className={tabTriggerClassName}>
              Schedule Details
            </TabsTrigger>
            <TabsTrigger value="delivery" className={tabTriggerClassName}>
              Delivery Details
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            {contentByType[selectedType]?.details}
          </TabsContent>
          <TabsContent value="delivery">
            {contentByType[selectedType]?.delivery}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
