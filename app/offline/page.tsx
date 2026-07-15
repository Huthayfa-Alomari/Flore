export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4">
      <div className="text-center">
        <h1 className="font-amiri text-4xl font-bold text-flore-text-primary mb-4">
          أنت غير متصل
        </h1>
        <p className="text-flore-text-secondary">
          يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى
        </p>
      </div>
    </div>
  )
}