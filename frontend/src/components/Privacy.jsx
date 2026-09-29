import React from 'react';

const Privacy = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#e0e3e7', lineHeight: '1.6', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '2rem' }}>Política de Privacidad de Valuonic</h1>
      <p style={{ color: '#86948a', marginBottom: '2rem' }}>Última actualización: 27 de septiembre de 2026</p>

      <p style={{ marginBottom: '1rem' }}>
        En Valuonic valoramos la transparencia. Al ser un proyecto personal y experimental desarrollado con fines de aprendizaje y demostración, queremos que entiendas exactamente cómo manejamos la información que decides cargar en nuestra plataforma.
      </p>
      <p style={{ marginBottom: '2rem' }}>
        Al utilizar Valuonic, aceptas las prácticas descritas en esta política. Si no te sientes cómodo con el nivel de privacidad y seguridad aquí descrito, te recomendamos no utilizar la aplicación.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>1. ¿Qué información recopilamos?</h2>
        <p>Para que la aplicación funcione, necesitamos recopilar ciertos datos:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Datos de Autenticación:</strong> Al iniciar sesión o registrarte (por ejemplo, mediante Google), recibimos información básica de tu perfil, como tu dirección de correo electrónico, nombre y foto de perfil.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Datos de Inversión (Portafolio):</strong> Recopilamos todas las transacciones que registras manualmente en la plataforma (activos, cantidades, precios de compra/venta, fechas y plataformas de origen).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>2. Visibilidad de los Datos y Falta de Cifrado (Importante)</h2>
        <p>
          <strong style={{ color: '#fff' }}>Valuonic NO utiliza cifrado de extremo a extremo (End-to-End Encryption).</strong>
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Los datos de tus transacciones y portafolio se almacenan en texto plano o con formatos estándar en nuestra base de datos (PostgreSQL).</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Acceso del Desarrollador:</strong> El administrador y desarrollador del proyecto tiene la capacidad técnica de conectarse a la base de datos y visualizar la información cargada por los usuarios.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Uso estricto del acceso:</strong> Este acceso se utiliza única y exclusivamente para tareas de desarrollo, mantenimiento, optimización de la base de datos o resolución de problemas técnicos (debugging). No revisamos carteras por curiosidad ni analizamos tu patrimonio personal.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>3. Cero Comercialización de Datos</h2>
        <p>
          Queremos ser absolutamente claros: bajo ninguna circunstancia venderemos, alquilaremos, compartiremos ni comercializaremos tu información personal o financiera a terceros. Tus datos no se utilizan para publicidad dirigida, ni se ceden a empresas de marketing o entidades financieras. El proyecto no tiene fines de lucro mediante la explotación de datos.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>4. Seguridad y Limitaciones</h2>
        <p>
          Aplicamos las medidas de seguridad que están a nuestro alcance para proteger la base de datos y la infraestructura web. Sin embargo, al ser un proyecto individual gestionado con recursos y conocimientos limitados:
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>No podemos garantizar un entorno de seguridad de "grado empresarial" o bancario.</li>
          <li style={{ marginBottom: '0.5rem' }}>No estamos exentos de sufrir vulnerabilidades, ciberataques o brechas de seguridad.</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          Al ingresar tus datos en Valuonic, asumes plenamente el riesgo de que tu información pueda verse comprometida en caso de un incidente de seguridad.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong style={{ color: '#fff' }}>Recomendación:</strong> No utilices Valuonic si consideras que la divulgación accidental de tu portafolio de inversiones podría causarte un daño grave. Trata la información que cargas aquí con el mismo cuidado que tendrías en un foro público.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>5. Retención y Eliminación de Datos</h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '1rem' }}>
          <li style={{ marginBottom: '1rem' }}><strong style={{ color: '#fff' }}>Eliminación voluntaria y autónoma:</strong> La aplicación cuenta con una función específica integrada que te permite eliminar tu cuenta en cualquier momento. Al utilizar esta opción, tu perfil, junto con absolutamente todos los datos de tu portafolio y registros de transacciones, serán borrados de forma inmediata de nuestra base de datos activa.</li>
          <li style={{ marginBottom: '1rem' }}><strong style={{ color: '#fff' }}>Acción irreversible:</strong> Es tu responsabilidad utilizar esta función con precaución. Al ser un proyecto con recursos limitados y sin garantías de retención de datos, la eliminación de la cuenta es un proceso permanente e irreversible. Una vez eliminada, no existe forma técnica de recuperar tu información ni tus registros financieros.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Eliminación administrativa:</strong> Independientemente de tu capacidad para borrar la cuenta, y como se detalla en nuestros Términos de Servicio, nos reservamos el derecho de purgar, borrar o reiniciar la base de datos en cualquier momento sin previo aviso, lo que también resultará en la eliminación total de tu información.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>6. Proveedores de Terceros</h2>
        <p>
          Utilizamos servicios de terceros para el funcionamiento de la app (por ejemplo, Google para la autenticación, y posibles proveedores de infraestructura en la nube o APIs de cotizaciones). Estos proveedores tienen sus propias políticas de privacidad que escapan a nuestro control.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>7. Cambios en esta Política</h2>
        <p>
          Podemos actualizar esta Política de Privacidad en cualquier momento. El uso continuo de Valuonic tras cualquier modificación implica tu aceptación de las nuevas condiciones.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>8. Contacto</h2>
        <p>
          Si tienes dudas sobre esta Política de Privacidad, puedes contactarnos a través de los medios provistos en el repositorio de código abierto o en la propia aplicación.
        </p>
      </section>

      <p style={{ marginTop: '3rem', color: '#86948a', fontSize: '0.9rem', textAlign: 'center' }}>
        &copy; 2026 Valuonic.
      </p>
    </div>
  );
};

export default Privacy;
