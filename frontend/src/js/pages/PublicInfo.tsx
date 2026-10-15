import { useParams } from 'react-router-dom';
import { Head, Link } from '../navigation';
import { PublicLayout } from '../layouts/PublicLayout';

const pages = {
    terminos: {
        title: 'Términos de uso',
        intro: 'Estas pautas explican cómo usar Yachay de forma responsable. Su versión definitiva debe revisarse antes de abrir el servicio al público.',
        sections: [
            { title: 'Aprender en Yachay', text: 'Puedes consultar las secciones públicas. Para guardar avances, resolver actividades o publicar una opinión necesitas una cuenta de estudiante. El contenido de los cursos puede cambiar cuando se revisan las lecciones.' },
            { title: 'Tu cuenta', text: 'Mantén tu contraseña en privado y usa tus propios datos. Un administrador puede gestionar el acceso a las cuentas y publicar el contenido educativo.' },
            { title: 'Opiniones de estudiantes', text: 'Comparte experiencias respetuosas sobre el aprendizaje. Evita publicar datos personales tuyos o de otras personas. Tu opinión puede editarse y aparece en el inicio con tu nombre abreviado.' },
        ],
    },
    privacidad: {
        title: 'Aviso de privacidad',
        intro: 'Yachay usa datos personales para crear cuentas, proteger el acceso y registrar el aprendizaje. Este aviso describe el funcionamiento actual; el plazo de conservación debe definirse antes de publicar el servicio.',
        sections: [
            { title: 'Datos que utiliza el sistema', text: 'Al registrarte se solicitan nombres, apellidos, correo y contraseña; la cédula es opcional. La plataforma guarda tus respuestas, resultados y progreso. También puede guardar un avatar y una opinión si decides añadirlos.' },
            { title: 'Para qué se usan', text: 'Los datos permiten autenticarte, mostrar tu avance, administrar los cursos y recuperar el acceso. Las contraseñas se guardan protegidas mediante hash. Si publicas una opinión, se muestra con tu nombre abreviado; tu correo y cédula no aparecen en esa sección.' },
            { title: 'Servicios externos y sesión', text: 'El acceso con Google es opcional y solo se habilita si la instalación está configurada para ello. El video de la sección cultural se reproduce desde YouTube. La sesión se gestiona por pestaña y se cierra tras un período de inactividad.' },
            { title: 'Consultas sobre tus datos', text: 'Puedes solicitar acceso, corrección o eliminación de tus datos al responsable de esta instalación mediante el correo indicado abajo. El plazo de conservación de los datos todavía debe definirse antes de ofrecer Yachay públicamente.' },
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
        title: 'Ayuda',
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
            </div>
            <section className="glass-panel public-info-contact" aria-labelledby="public-info-contact-title">
                <h2 id="public-info-contact-title">{topic === 'privacidad' ? 'Responsable y contacto' : 'Contacto de Yachay'}</h2>
                <p><strong>Edison Said Aucatoma</strong> · Guaranda, Ecuador</p>
                <a href="mailto:edison0986027130@gmail.com">edison0986027130@gmail.com</a>
            </section>
            <div className="public-info-actions">
                <Link href="/">Volver al inicio</Link>
                {topic !== 'ayuda' && <Link href="/informacion/ayuda">Ir a Ayuda</Link>}
            </div>
        </article>
    </PublicLayout>;
}
