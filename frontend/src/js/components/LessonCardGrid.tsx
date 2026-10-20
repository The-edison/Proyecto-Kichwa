import type { ReactNode } from 'react';

export function LessonCardGrid({ children, className = 'cometa-lesson-cards' }: { children: ReactNode; className?: string }) {
    return <div className={`${className} lesson-card-grid`}>{children}</div>;
}
