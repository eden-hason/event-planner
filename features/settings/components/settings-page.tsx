'use client';

import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function SettingsPage() {
  useFeatureHeader({
    title: 'Settings',
    description: 'Manage your event settings',
  });

  return (
    <Tabs defaultValue="team">
      <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="team"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Team & Collaborators
        </TabsTrigger>
      </TabsList>
      <TabsContent value="team" />
    </Tabs>
  );
}
