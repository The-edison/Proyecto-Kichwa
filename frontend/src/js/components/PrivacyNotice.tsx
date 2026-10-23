import { Link } from '../navigation';

export function PrivacyNotice() {
    return <p className="account-privacy-notice">Antes de ingresar tus datos, consulta los <Link href="/informacion/terminos">Términos de uso</Link> y el <Link href="/informacion/privacidad">Aviso de privacidad</Link>. Si eres menor de edad, pide a tu representante legal que contacte con <Link href="/informacion/ayuda">soporte</Link> antes de crear tu cuenta.</p>;
}
