export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <div className="flex flex-col items-center justify-center py-24">
        <div className="border-primary mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
        <span className="text-muted-foreground text-sm">
          Loading confirmation...
        </span>
      </div>
    </main>
  );
}
