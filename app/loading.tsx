// app/loading.tsx
export default function HomeLoading() {
    return (
        <div className="container mx-auto px-4 py-20">
            <div className="mb-8 h-10 w-64 animate-pulse rounded bg-gray-200 mx-auto" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-96 animate-pulse rounded-2xl bg-gray-200" />
                ))}
            </div>
        </div>
    )
}