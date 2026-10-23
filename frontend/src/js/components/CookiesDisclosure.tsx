export interface PrivacyInformation {
    contact: { email: string; responsible_name: string | null; address: string | null; phone: string | null; legal_basis: string | null; retention: string | null };
    session: { cookie: string; lifetime_minutes: number; expires_on_close: boolean; secure: boolean; http_only: boolean; same_site: string };
    google_enabled: boolean;
    password_breach_check: boolean;
    gmail_smtp: boolean;
    password_reset_minutes: number;
}

const localRecords = [
    ['yachay.tab-session', 'Identifica la sesión de esta pestaña. Se retira al cerrar sesión; sessionStorage se borra al cerrar la pestaña.', 'Necesaria · sessionStorage'],
    ['yachay:guided-attempt:v1:…', 'Guarda respuestas y borradores de actividades durante la pestaña para que puedas volver a ellas.', 'Funcional educativa · sessionStorage'],
    ['yachay-learning-navigation:…', 'Recuerda qué niveles y módulos has desplegado durante la pestaña.', 'Preferencia · sessionStorage'],
    ['yachay-theme-scope', 'Identifica el tema visual de la cuenta en esta pestaña; se elimina al cerrarla.', 'Preferencia · sessionStorage'],
    ['yachay-theme / yachay-theme:student / yachay-theme:admin', 'Recuerda el tema claro u oscuro que eliges.', 'Preferencia · localStorage'],
    ['yachay-home-language', 'Recuerda el idioma del inicio cuando lo cambias.', 'Preferencia · localStorage'],
    ['yachay-sidebar-collapsed', 'Recuerda si contraes el menú lateral.', 'Preferencia · localStorage'],
    ['yachay:catalog-changed', 'Avisa a otras pestañas de una actualización del catálogo realizada por el administrador.', 'Funcional · localStorage'],
] as const;

export function CookiesDisclosure({ information }: { information?: PrivacyInformation }) {
    return <section id="cookies" tabIndex={-1} className="glass-panel" aria-labelledby="cookies-title">
        <h2 id="cookies-title">Cookies y almacenamiento del navegador</h2>
        <p>Yachay utiliza cookies propias para la sesión y la protección contra solicitudes falsificadas. Son necesarias para la seguridad. No se han integrado herramientas de analítica publicitaria ni píxeles de seguimiento.</p>
        {information && <dl className="privacy-storage-list">
            <div><dt>{information.session.cookie}</dt><dd>Yachay · Necesaria. Mantiene la sesión. {information.session.expires_on_close ? 'Cookie de sesión: se descarta al cerrar el navegador, sujeto a su función de restauración.' : `Caduca a los ${information.session.lifetime_minutes} minutos; se renueva con la actividad.`} La sesión del servidor vence tras {information.session.lifetime_minutes} minutos de inactividad. HttpOnly: {information.session.http_only ? 'sí' : 'no'}; SameSite: {information.session.same_site}; Secure: {information.session.secure ? 'sí' : 'no'}.</dd></div>
            <div><dt>XSRF-TOKEN</dt><dd>Yachay · Necesaria. Permite verificar las solicitudes que modifican datos. Duración: {information.session.lifetime_minutes} minutos desde su emisión, renovable con la actividad. El navegador la lee para enviar la protección CSRF.</dd></div>
        </dl>}
        <details className="privacy-storage-details"><summary>Ver el almacenamiento funcional y de preferencias</summary><p>Todos los registros siguientes pertenecen a Yachay. sessionStorage dura durante la pestaña; localStorage no tiene una caducidad programada y permanece hasta que lo cambies o borres desde el navegador.</p><dl className="privacy-storage-list">{localRecords.map(([name, purpose, category]) => <div key={name}><dt>{name}</dt><dd><strong>{category}.</strong> {purpose}</dd></div>)}</dl></details>
        <h3>Video de YouTube</h3><p>El inicio incluye un reproductor de YouTube, de Google, mediante youtube-nocookie.com. Se carga de forma diferida al acercarte a la sección del video y conecta tu navegador con Google. El proveedor recibe datos de conexión y puede usar almacenamiento según tu navegador, tu cuenta y la interacción con el reproductor. Puedes consultar la <a href="https://policies.google.com/technologies/cookies?hl=es" target="_blank" rel="noreferrer">información de cookies de Google</a>.</p>
        <h3>Cómo gestionarlo</h3><p>Para gestionar permisos, bloquear contenido externo o borrar cookies y datos guardados por Yachay o Google, usa la configuración de sitios de tu navegador. Borrar la sesión puede cerrar tu acceso; borrar los borradores puede perder respuestas aún no enviadas.</p>
    </section>;
}
