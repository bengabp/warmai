export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">WarmAI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Email warmup automation
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
