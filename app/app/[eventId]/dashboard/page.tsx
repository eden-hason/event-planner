import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import PieChartComponent from '@/components/pie-chart';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="grid grid-cols-3 gap-4 min-h-1/5">
      {/* First card - 1/3 width */}
      <Card className="overflow-hidden col-span-1 h-full">
        <div className="relative z-10">
          <CardHeader>
            <CardTitle className="text-2xl">
              <span className="font-bold text-primary">
                {currentUser?.displayName}&apos;s
              </span>{' '}
              Wedding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to your dashboard</p>
          </CardContent>
        </div>
      </Card>

      {/* Second card - 2/3 width */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Placeholder</CardTitle>
        </CardHeader>
        <CardContent>{/* <PieChartComponent /> */}</CardContent>
      </Card>
    </div>
  );
}
