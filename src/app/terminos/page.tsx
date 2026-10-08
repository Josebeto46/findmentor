import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de uso" updated="[fecha de publicación]">
      <section>
        <h2>1. Quiénes somos y aceptación</h2>
        <p>
          FinMentor es un servicio de [NOMBRE LEGAL DEL TITULAR], con RUC [RUC], domiciliado en [CIUDAD, ECUADOR] (“nosotros”). Al crear una cuenta o usar la aplicación aceptas estos términos y la Política de privacidad. Si no estás de acuerdo, no uses el servicio.
        </p>
      </section>
      <section>
        <h2>2. Qué es FinMentor (y qué no es)</h2>
        <p>
          FinMentor te ayuda a registrar ingresos y gastos, ver tu flujo de caja, armar presupuestos y estimar impuestos en Ecuador. Las cifras tributarias (IVA, retenciones, impuesto a la renta, rebaja de gastos personales y fechas de vencimiento) son <strong>estimaciones de apoyo</strong> calculadas con lo que tú registras y con las tablas oficiales vigentes que mantenemos actualizadas. <strong>No constituyen asesoría contable ni tributaria</strong> ni sustituyen tus declaraciones oficiales ante el SRI. Tú eres responsable de verificar la información y de cumplir tus obligaciones.
        </p>
      </section>
      <section>
        <h2>3. Tu cuenta</h2>
        <ul>
          <li>Debes ser mayor de edad y dar información veraz.</li>
          <li>Eres responsable de tu contraseña y de lo que ocurra con tu cuenta. Avísanos si sospechas un acceso no autorizado.</li>
          <li>Puedes tener un espacio personal y uno o más espacios de empresa. El propietario de un espacio puede invitar a otras personas y asignarles el rol de editor o lector, y responde por ese acceso.</li>
        </ul>
      </section>
      <section>
        <h2>4. Planes, límites y acceso</h2>
        <p>
          Ofrecemos un plan gratuito con límites (por ejemplo, un número de transacciones al mes, de cuentas y de usuarios) y puede tener una fecha de vencimiento de acceso. Los límites y los días de acceso pueden cambiar según tu plan. Cuando el acceso vence o un espacio se suspende, conservas tus datos en modo de solo lectura. Podemos introducir planes de pago; si lo hacemos, te lo informaremos antes de cobrarte cualquier valor.
        </p>
      </section>
      <section>
        <h2>5. Uso aceptable</h2>
        <ul>
          <li>No uses el servicio para actividades ilícitas, ni para registrar datos de terceros sin derecho a hacerlo.</li>
          <li>No intentes vulnerar la seguridad, acceder a datos ajenos, saturar el servicio ni extraerlo de forma automatizada.</li>
          <li>Podemos suspender cuentas que incumplan estos términos o pongan en riesgo a otros usuarios.</li>
        </ul>
      </section>
      <section>
        <h2>6. Tus datos</h2>
        <p>
          Los datos y comprobantes que registras son tuyos. Nos autorizas a tratarlos únicamente para prestarte el servicio, según la Política de privacidad. Puedes exportar tu información cuando tu plan lo permite y pedirnos su eliminación.
        </p>
      </section>
      <section>
        <h2>7. Disponibilidad y cambios</h2>
        <p>
          Procuramos que el servicio esté disponible de forma continua, pero no garantizamos que no haya interrupciones, errores o pérdidas de datos. Te recomendamos conservar copias de tus comprobantes originales. Podemos modificar el servicio o estos términos; si el cambio es importante, te avisaremos con anticipación razonable.
        </p>
      </section>
      <section>
        <h2>8. Limitación de responsabilidad</h2>
        <p>
          En la medida que lo permita la ley, no respondemos por pérdidas indirectas, multas, recargos o intereses derivados del uso de las estimaciones o de la información registrada, ni por decisiones que tomes basándote en ellas.
        </p>
      </section>
      <section>
        <h2>9. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de la República del Ecuador. Las controversias se someterán a los jueces competentes de [CIUDAD], sin perjuicio de los derechos que la ley te otorgue como consumidor.</p>
      </section>
      <section>
        <h2>10. Contacto</h2>
        <p>[CORREO DE CONTACTO] · [TELÉFONO O DIRECCIÓN]</p>
      </section>
    </LegalPage>
  );
}
