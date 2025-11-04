export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4" />
      <span className="text-muted-foreground text-sm">Loading dashboard...</span>
    </div>
  );
}