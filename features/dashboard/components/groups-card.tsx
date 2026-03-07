import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardHover } from '@/lib/utils';
import { GroupIcon } from '@/features/guests/components/groups/group-icon';
import type { GroupWithGuestsApp } from '@/features/guests/schemas';

function GroupRow({ group }: { group: GroupWithGuestsApp }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <GroupIcon iconName={group.icon} size="sm" />
      </div>
      <span className="flex-1 truncate font-medium">{group.name}</span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {group.guestCount}
      </span>
    </div>
  );
}

export function GroupsCard({ groups }: { groups: GroupWithGuestsApp[] }) {
  const brideGroups = groups.filter((g) => g.side === 'bride');
  const groomGroups = groups.filter((g) => g.side === 'groom');
  const noSideGroups = groups.filter((g) => !g.side);

  const sections = [
    { label: "Bride's Side", items: brideGroups },
    { label: "Groom's Side", items: groomGroups },
    { label: 'Other', items: noSideGroups },
  ].filter((s) => s.items.length > 0);

  return (
    <Card className={`flex flex-col ${cardHover}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Groups</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {groups.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No groups yet</p>
        ) : (
          sections.map(({ label, items }) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <div className="space-y-1.5">
                {items.map((group) => (
                  <GroupRow key={group.id} group={group} />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
