import { useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { StudentOpinionForm } from './StudentOpinionForm';

export function StudentOpinionMenu() {
    const details = useRef<HTMLDetailsElement>(null);
    const [activated, setActivated] = useState(false);
    return <details ref={details} className="topbar-dropdown student-opinion-menu" name="campus-popovers" onToggle={event => { if (event.currentTarget.open) setActivated(true); }}>
        <summary className="glass-icon-button" aria-label="Comparte tu opinión" title="Comparte tu opinión"><MessageCircle size={20} aria-hidden="true" /></summary>
        <div className="dropdown-panel student-opinion-panel">
            <div className="student-opinion-heading">
                <span className="student-opinion-symbol" aria-hidden="true"><MessageCircle size={23} /></span>
                <div><span className="eyebrow">TU VOZ EN YACHAY</span><h2>Comparte tu experiencia</h2></div>
                <button type="button" className="glass-icon-button" aria-label="Cerrar opiniones" onClick={() => { if (details.current) { details.current.open = false; details.current.querySelector('summary')?.focus(); } }}><X size={18} aria-hidden="true" /></button>
            </div>
            {activated && <StudentOpinionForm />}
        </div>
    </details>;
}
