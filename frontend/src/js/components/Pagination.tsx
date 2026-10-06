export function Pagination({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (page: number) => void }) {
    if (lastPage <= 1) return null;
    return <div className="mt-5 flex flex-wrap items-center justify-end gap-3"><button className="secondary-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><span>{page} / {lastPage}</span><button className="secondary-button" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>Siguiente</button></div>;
}
