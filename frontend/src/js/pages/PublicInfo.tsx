import { useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Head, Link } from '../navigation';
import { PublicLayout } from '../layouts/PublicLayout';
import { useApi } from '../hooks/useApi';
import { CookiesDisclosure, type PrivacyInformation } from '../components/CookiesDisclosure';

const pages = {
    terminos: {
        title: 'Términos de uso',
        intro: 'Yachay es una plataforma educativa para aprender kichwa. Estas condiciones explican el uso de sus cuentas, contenidos y espacios de participación.',
        sections: [
            { title: 'Aprender en Yachay', text: 'Puedes consultar las secciones públicas. Para guardar avances, resolver actividades o publicar una opinión necesitas una cuenta de estudiante. El contenido de los cursos puede cambiar cuando se revisan las lecciones.' },
            { title: 'Tu cuenta', text: 'Usa información veraz y un correo al que tengas acceso. Cuida tus credenciales, no compartas la contraseña ni uses la cuenta de otra persona. Google es una alternativa opcional. Si eres menor de edad, pide a tu representante legal que contacte con soporte antes de crear tu cuenta.' },
            { title: 'Uso del contenido', text: 'Puedes consultar las lecciones y practicar para tu aprendizaje personal. Respeta la autoría de los textos, imágenes, audios y recursos enlazados; su disponibilidad no concede una licencia general para redistribuirlos. Yachay no anuncia una certificación oficial ni garantiza un resultado educativo específico.' },
            { title: 'Convivencia y seguridad', text: 'No se permite suplantar identidades, acosar, divulgar datos ajenos, intentar acceder a cuentas o información sin autorización ni interferir con la plataforma. La administración puede bloquear cuentas ante usos indebidos; las incidencias pueden comunicarse a soporte.' },
            { title: 'Opiniones de estudiantes', text: 'Comparte experiencias respetuosas sobre el aprendizaje. Evita publicar datos personales tuyos o de otras personas. Tu opinión puede editarse y aparece en el inicio con tu nombre abreviado.' },
        ],
    },
    privacidad: {
        title: 'Aviso de privacidad',
        intro: 'Aquí puedes conocer qué información usa Yachay para ofrecer el aprendizaje, qué opciones son voluntarias y cómo consultar o gestionar tus datos.',
        sections: [
            { title: 'Datos y origen', text: 'La información se guarda en la base de datos de Yachay. El registro con correo solicita nombres, apellidos, correo y contraseña; la cédula es opcional. Se conservan respuestas, intentos, resultados, calificaciones, puntos y avance para ofrecer las actividades. Puedes elegir un avatar ilustrado y publicar una opinión. La sesión y la seguridad también pueden tratar la dirección IP, información del navegador y registros técnicos de acceso o errores.' },
            { title: 'Finalidades y acceso a la información', text: 'Los datos permiten crear y proteger la cuenta, recuperar el acceso, corregir actividades, mostrar tu progreso y administrar el aprendizaje. Los administradores pueden consultar estudiantes y resultados. Si publicas una opinión, su texto y tu nombre abreviado aparecen públicamente; tu correo y cédula no se muestran en esa sección. Publicar opiniones es opcional.' },
            { title: 'Datos obligatorios y exactitud', text: 'El nombre, el correo y una contraseña válida son necesarios para crear una cuenta con correo. La cédula y el avatar son opcionales. Un correo incorrecto puede impedir recuperar o verificar el acceso. La contraseña se almacena mediante hash; no se guarda como texto legible.' },
            { title: 'Calificación automática', text: 'La plataforma compara tus respuestas con las soluciones de las actividades, calcula calificaciones y actualiza avances y puntos. Estos resultados forman parte del aprendizaje. Si detectas un resultado incorrecto, puedes comunicar la actividad a soporte para su revisión.' },
            { title: 'Conservación', text: 'No existe eliminación automática por inactividad de cuentas, respuestas, resultados u opiniones en la implementación actual. Cerrar sesión no borra tu historial educativo. Puedes solicitar la eliminación; las solicitudes y las obligaciones aplicables deben revisarse antes de suprimir los datos relacionados.' },
            { title: 'Aprendizaje e investigación', text: 'Crear una cuenta permite utilizar el servicio educativo; no constituye una autorización general para investigación académica. Cualquier estudio con datos de estudiantes requiere información propia sobre su finalidad, participantes, datos y condiciones de participación, y la legitimación que corresponda, separada del acceso educativo.' },
            { title: 'Personas menores de edad', text: 'El tratamiento de datos de menores requiere las autorizaciones y salvaguardas aplicables. Para menores de 15 años interviene su representante legal; desde los 15 años la LOPDP permite otorgar consentimiento explícito con información clara sobre sus fines. Contacta con soporte para gestionar el registro de una persona menor de edad. Leer estos avisos no sustituye la autorización o verificación que corresponda.' },
            { title: 'Tus derechos y reclamos', text: 'Puedes escribir al contacto de esta página para solicitar información y acceso a tus datos, rectificación o actualización, eliminación, oposición, limitación, portabilidad o revisión de una valoración automatizada, según corresponda. Indica el correo de la cuenta y la solicitud, sin enviar tu contraseña. Cuando un tratamiento depende de tu consentimiento, puedes retirarlo sin afectar el tratamiento anterior que haya sido lícito.' },
        ],
    },
    accesibilidad: {
        title: 'Accesibilidad',
        intro: 'Queremos que Yachay pueda usarse con claridad desde computadora, tableta y teléfono.',
        sections: [
            { title: 'Opciones disponibles', text: 'La interfaz ofrece navegación con teclado, etiquetas para controles, mensajes de error visibles y temas claro y oscuro. El tamaño de la pantalla adapta la disposición del contenido.' },
            { title: 'Mejoras continuas', text: 'Usamos las pautas WCAG del W3C como referencia para revisar contraste, navegación y comprensión. Esto no constituye una declaración de conformidad de toda la plataforma.' },
            { title: 'Si encuentras una barrera', text: 'Indica la página, la acción que intentabas realizar, tu dispositivo y la dificultad encontrada al equipo que administra esta instalación.' },
        ],
    },
    enfoque: {
        title: 'Nuestro enfoque',
        intro: 'Yachay propone aprender kichwa con respeto por la lengua y las comunidades que la mantienen viva.',
        sections: [
            { title: 'Aprender paso a paso', text: 'Los contenidos se organizan en niveles, módulos y unidades. Las actividades permiten practicar, revisar respuestas y volver a los temas que necesites.' },
            { title: 'La lengua en contexto', text: 'El aprendizaje combina vocabulario, ejercicios y recursos culturales. El diccionario ayuda a consultar palabras en kichwa y español.' },
            { title: 'Contenido revisado', text: 'El equipo administrador prepara y publica los materiales. Los módulos en borrador no se muestran al estudiante hasta que estén listos.' },
        ],
    },
    preguntas: {
        title: 'Preguntas frecuentes',
        intro: 'Respuestas rápidas para empezar a usar Yachay.',
        sections: [
            { title: '¿Cómo comienzo?', text: 'Crea una cuenta de estudiante o inicia sesión. Después abre Mi aprendizaje para ver los niveles y actividades disponibles.' },
            { title: '¿Por qué debo iniciar sesión en otra pestaña?', text: 'Por seguridad, cada pestaña mantiene su propia sesión. Inicia sesión también en la pestaña nueva.' },
            { title: '¿Qué hago si olvidé mi contraseña?', text: 'En Iniciar sesión, abre Recuperar contraseña y sigue el enlace enviado a tu correo. La entrega del mensaje depende de la configuración de correo de esta instalación.' },
            { title: '¿Puedo corregir una opinión?', text: 'Sí. En la sección de opiniones puedes abrir el editor y actualizar el texto que compartiste.' },
            { title: '¿Dónde veo mi avance?', text: 'Entra en Mi progreso desde el panel de estudiante para consultar tus resultados y lo que has completado.' },
        ],
    },
    ayuda: {
        title: 'Ayuda y contacto',
        intro: 'Encuentra el siguiente paso para resolver las dudas más comunes.',
        sections: [
            { title: 'Acceso a tu cuenta', text: 'Si no puedes entrar, comprueba tu correo y contraseña. Usa Recuperar contraseña si necesitas crear una nueva.' },
            { title: 'Contenido y avance', text: 'En Mi aprendizaje encontrarás los cursos publicados. En Mi progreso podrás revisar tu avance; el diccionario está disponible como recurso de consulta.' },
            { title: 'Soporte de esta instalación', text: 'Si el problema continúa, escribe al contacto indicado abajo. Incluye la página y una descripción del error, pero nunca tu contraseña.' },
        ],
    },
} as const;

export default function PublicInfo() {
    const { topic } = useParams();
    const location = useLocation();
    const information = useApi<PrivacyInformation>('/privacy');
    useEffect(() => {
        if (topic === 'privacidad' && location.hash === '#cookies') {
            requestAnimationFrame(() => { const section = document.getElementById('cookies'); section?.scrollIntoView(); section?.focus({ preventScroll: true }); });
        }
    }, [topic, location.hash, location.key, information.data]);
    const page = pages[topic as keyof typeof pages];
    if (!page) return <PublicLayout><div className="public-info-page"><h1>Página no encontrada</h1><Link href="/">Volver al inicio</Link></div></PublicLayout>;

    return <PublicLayout>
        <Head title={`${page.title} | Yachay`} />
        <article className="public-info-page">
            <span className="eyebrow">INFORMACIÓN DE YACHAY</span>
            <h1>{page.title}</h1>
            <p className="public-info-intro">{page.intro}</p>
            <div className="public-info-sections">
                {page.sections.map(section => <section key={section.title} className="glass-panel">
                    <h2>{section.title}</h2>
                    <p>{section.text}</p>
                </section>)}
                {topic === 'privacidad' && <>
                    {information.data?.contact.legal_basis && <section className="glass-panel"><h2>Base jurídica</h2><p>{information.data.contact.legal_basis}</p></section>}
                    {information.data?.contact.retention && <section className="glass-panel"><h2>Conservación y copias de seguridad</h2><p>{information.data.contact.retention}</p></section>}
                    <section className="glass-panel"><h2>Servicios externos</h2><p>Google recibe datos de conexión al cargarse el reproductor de YouTube del inicio o cuando decides usar el acceso con Google. Para el acceso, Yachay recibe de Google nombre, correo verificado e identificador de cuenta; no descarga tu foto ni conserva tokens de Google en la cuenta. Estos servicios pueden tratar datos fuera de Ecuador conforme a sus condiciones. <a href="https://policies.google.com/privacy?hl=es" target="_blank" rel="noreferrer">Consulta la privacidad de Google</a>.</p>
                    {information.data?.gmail_smtp && <p>Los correos de recuperación y verificación se envían mediante el servicio SMTP de Google; se comunica el correo del destinatario y el contenido necesario del mensaje.</p>}
                    {information.data?.password_breach_check && <p>La comprobación de contraseñas expuestas usa Pwned Passwords: el servidor envía solo los cinco primeros caracteres del hash SHA-1 para consultar coincidencias, sin enviar tu contraseña completa ni tu correo. La contraseña se guarda con un hash distinto para autenticarte.</p>}</section>
                    <section className="glass-panel"><h2>Autoridad de protección de datos</h2><p>Puedes acudir a la Superintendencia de Protección de Datos Personales de Ecuador (SPDP) para presentar reclamos o denuncias conforme al procedimiento aplicable. <a href="https://www.spdp.gob.ec/preguntas-frecuentes/" target="_blank" rel="noreferrer">Canales oficiales de atención</a> y <a href="https://www.spdp.gob.ec/marco-normativo/" target="_blank" rel="noreferrer">normativa de protección de datos</a>.</p></section>
                    <CookiesDisclosure information={information.data ?? undefined} />
                </>}
            </div>
            <section className="glass-panel public-info-contact" aria-labelledby="public-info-contact-title">
                <h2 id="public-info-contact-title">{topic === 'privacidad' && information.data?.contact.responsible_name ? 'Responsable y contacto' : 'Contacto de Yachay'}</h2>
                {information.data?.contact.responsible_name && <p><strong>{information.data.contact.responsible_name}</strong></p>}
                {information.data?.contact.address && <p>{information.data.contact.address}</p>}
                {information.data?.contact.phone && <p>Teléfono: {information.data.contact.phone}</p>}
                <a href={`mailto:${information.data?.contact.email || 'kichwa.soporte@gmail.com'}`}>{information.data?.contact.email || 'kichwa.soporte@gmail.com'}</a>
            </section>
            <div className="public-info-actions">
                <Link href="/">Volver al inicio</Link>
                {topic !== 'ayuda' && <Link href="/informacion/ayuda">Ir a Ayuda</Link>}
                {topic === 'ayuda' && <><Link href="/recuperar-contrasena">Recuperar contraseña</Link><Link href="/informacion/preguntas">Consultar preguntas frecuentes</Link></>}
            </div>
        </article>
    </PublicLayout>;
}
