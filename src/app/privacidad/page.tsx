import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="[fecha de publicación]">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          [NOMBRE LEGAL DEL TITULAR], RUC [RUC], [DIRECCIÓN], correo [CORREO DE PRIVACIDAD]. Tratamos tus datos personales conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador y su normativa.
        </p>
      </section>
      <section>
        <h2>2. Qué datos tratamos</h2>
        <ul>
          <li><strong>Cuenta:</strong> nombre, correo electrónico, contraseña (almacenada cifrada) y, si usas Google, los datos básicos de tu perfil que Google nos comparte.</li>
          <li><strong>Datos financieros que registras:</strong> movimientos, cuentas, categorías, presupuestos, recurrentes, clientes y proveedores (nombre, cédula o RUC, correo, teléfono), y los comprobantes que adjuntas.</li>
          <li><strong>Datos tributarios:</strong> cédula o RUC, régimen, cargas familiares y datos del espacio.</li>
          <li><strong>Datos técnicos:</strong> registros de seguridad y auditoría (por ejemplo, cambios administrativos), dirección IP y datos del dispositivo necesarios para operar y proteger el servicio.</li>
        </ul>
      </section>
      <section>
        <h2>3. Para qué los usamos</h2>
        <ul>
          <li>Prestarte el servicio y mantener tu cuenta (ejecución del contrato).</li>
          <li>Calcular estimaciones, mostrar tus reportes y enviarte avisos operativos, como invitaciones o confirmaciones.</li>
          <li>Proteger el servicio, prevenir abusos y cumplir obligaciones legales.</li>
          <li>Mejorar la aplicación con información agregada, sin identificarte.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </section>
      <section>
        <h2>4. Con quién los compartimos</h2>
        <p>
          Solo con proveedores que nos ayudan a operar el servicio y que actúan bajo nuestras instrucciones: <strong>Supabase</strong> (base de datos, autenticación y almacenamiento), <strong>Vercel</strong> (alojamiento de la aplicación) y, si inicias sesión con ella, <strong>Google</strong>. Dentro de un espacio de empresa, los datos son visibles para los miembros que el propietario haya invitado, según su rol. Podemos entregar información si una autoridad competente lo exige.
        </p>
      </section>
      <section>
        <h2>5. Transferencias internacionales</h2>
        <p>Estos proveedores pueden almacenar o procesar datos fuera del Ecuador. Exigimos medidas de seguridad adecuadas y contratos que protejan tu información.</p>
      </section>
      <section>
        <h2>6. Cuánto tiempo los conservamos</h2>
        <p>Mientras mantengas tu cuenta. Si la eliminas, borramos o anonimizamos tus datos en un plazo razonable, salvo los que debamos conservar por obligación legal.</p>
      </section>
      <section>
        <h2>7. Tus derechos</h2>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación y actualización, eliminación, oposición, portabilidad y suspensión del tratamiento, y a no ser objeto de decisiones basadas únicamente en tratamientos automatizados, escribiéndonos a [CORREO DE PRIVACIDAD]. Responderemos dentro de los plazos legales. También puedes acudir a la Superintendencia de Protección de Datos Personales.
        </p>
      </section>
      <section>
        <h2>8. Seguridad</h2>
        <p>
          Aplicamos controles de acceso por usuario y por espacio, conexión cifrada (HTTPS), almacenamiento privado de comprobantes y registro de cambios administrativos. Ningún sistema es infalible: protege tu contraseña y avísanos ante cualquier irregularidad.
        </p>
      </section>
      <section>
        <h2>9. Cookies y almacenamiento local</h2>
        <p>Usamos únicamente lo necesario para que funcione la aplicación: la sesión de tu cuenta, el espacio de trabajo activo y tu preferencia de tema (claro u oscuro). No usamos cookies de publicidad ni de seguimiento de terceros.</p>
      </section>
      <section>
        <h2>10. Menores de edad</h2>
        <p>El servicio está dirigido a personas mayores de edad. No tratamos intencionalmente datos de menores.</p>
      </section>
      <section>
        <h2>11. Cambios</h2>
        <p>Si modificamos esta política de forma importante, te avisaremos en la aplicación o por correo.</p>
      </section>
    </LegalPage>
  );
}
