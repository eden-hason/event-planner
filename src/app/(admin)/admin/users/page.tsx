import { listUsers } from '@/features/admin/queries';
import { UsersTable } from '@/features/admin/components/users-table';

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {users.length} registered user{users.length !== 1 ? 's' : ''}
        </p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
