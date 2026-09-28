import React from 'react';

const Terms = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#e0e3e7', lineHeight: '1.6', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '2rem' }}>Términos de Servicio de LedgerView</h1>
      <p style={{ color: '#86948a', marginBottom: '2rem' }}>Última actualización: 27 de septiembre de 2026</p>

      <p style={{ marginBottom: '2rem' }}>
        Al acceder, registrarte o utilizar LedgerView, aceptas estar sujeto a los siguientes Términos de Servicio. Si no estás de acuerdo con estas condiciones, o si esperas un servicio ininterrumpido y con garantías, no debes utilizar esta aplicación.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>1. Naturaleza del Proyecto (Portafolio y Código Abierto)</h2>
        <p>
          LedgerView es estrictamente un proyecto personal y experimental, desarrollado de forma individual con fines de aprendizaje, demostración de habilidades técnicas y uso propio. No es un producto comercial ni está respaldado por ninguna empresa u organización. El software se distribuye bajo la Licencia MIT, lo que significa que el código fuente es público, pero el servicio alojado se ofrece de forma gratuita y sin ningún nivel de servicio garantizado (SLA).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>2. Ausencia de Garantías de Continuidad y Disponibilidad</h2>
        <p>Los recursos de infraestructura que mantienen a LedgerView en línea son limitados. Por lo tanto:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Cierre del Servicio:</strong> El servicio puede ser modificado, suspendido o clausurado permanentemente en cualquier momento, por cualquier motivo y sin previo aviso.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Pérdida de Datos:</strong> Nos reservamos el derecho de eliminar, purgar o resetear la base de datos de usuarios y transacciones en cualquier momento.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Ausencia de Backups:</strong> No garantizamos la conservación, integridad ni el respaldo (backup) de la información que cargues en la plataforma. Es tu exclusiva responsabilidad mantener un registro paralelo o exportar tus datos regularmente si deseas conservarlos.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>3. Exención Total de Responsabilidad</h2>
        <p>
          El uso de LedgerView es bajo tu propio riesgo. El servicio se proporciona "TAL CUAL" (AS IS) y "SEGÚN DISPONIBILIDAD" (AS AVAILABLE).
        </p>
        <p style={{ marginTop: '1rem' }}>
          En la máxima medida permitida por la ley aplicable, el desarrollador se exime de toda responsabilidad por:
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Daños directos, indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de usar la aplicación.</li>
          <li style={{ marginBottom: '0.5rem' }}>Pérdida de datos, pérdida de ingresos, o decisiones financieras erróneas tomadas en base a la información visualizada en la plataforma.</li>
          <li style={{ marginBottom: '0.5rem' }}>Errores, inexactitudes o demoras en las cotizaciones de los activos financieros mostrados, ya que estos provienen de APIs e integraciones de terceros que pueden fallar.</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          La aplicación no proporciona asesoramiento financiero, legal ni impositivo. Toda métrica o cálculo mostrado tiene fines puramente informativos.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>4. Cuentas de Usuario y Conducta</h2>
        <p>
          El acceso a la plataforma es un privilegio, no un derecho. Nos reservamos el derecho de denegar el acceso, suspender o eliminar tu cuenta en cualquier momento, sin necesidad de justificación alguna, especialmente si se detecta un uso abusivo que comprometa los limitados recursos del servidor.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>5. Privacidad y Seguridad</h2>
        <p>
          Haremos un esfuerzo razonable por mantener la seguridad de la aplicación; sin embargo, al ser un proyecto gestionado por una sola persona en un entorno de recursos limitados, no podemos garantizar una protección infalible contra vulnerabilidades, ciberataques o brechas de datos. Al usar LedgerView, asumes este riesgo.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>6. Ley Aplicable y Jurisdicción</h2>
        <p>
          Cualquier conflicto derivado del uso de esta plataforma será interpretado bajo las leyes de la República Argentina, sometiéndose a la jurisdicción exclusiva de los tribunales competentes de Quilmes, Provincia de Buenos Aires, renunciando expresamente a cualquier otro fuero que pudiera corresponder.
        </p>
      </section>

      <p style={{ marginTop: '3rem', color: '#86948a', fontSize: '0.9rem', textAlign: 'center' }}>
        &copy; 2026 LedgerView.
      </p>
    </div>
  );
};

export default Terms;
