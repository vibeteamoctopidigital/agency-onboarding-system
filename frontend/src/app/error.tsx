"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-primary">Something went wrong</h1>
      <p className="mt-4 text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
