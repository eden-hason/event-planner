export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-101px)] flex-col items-center justify-center py-12">
      <div className="border-primary mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      <span className="text-muted-foreground text-sm">Loading...</span>
    </div>
  );
}
