import React from "react";

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="privacy-container" style={{ padding: "10px", maxHeight: "80vh", overflowY: "auto", fontSize: "14px", color: "#ccc" }}>
      <button className="back-button" onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", marginBottom: "15px" }}>
        ⬅ Volver
      </button>
      <h1 style={{ color: "#FF0050", fontSize: "20px" }}>Aviso de Privacidad Integral</h1>
      <p style={{ fontSize: "12px" }}>Última actualización: 22 de Junio de 2026</p>
      
      <p>
        <strong>Poptok S.A. de C.V.</strong> (en lo sucesivo, "Poptok" o "el Responsable"), con domicilio en Paseo de la Reforma 222, Colonia Juárez, Alcaldía Cuauhtémoc, C.P. 06600, Ciudad de México, México, es el responsable del tratamiento, uso y protección de sus datos personales. Este Aviso se emite en cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de México.
      </p>

      <h2>1. Datos Personales que Recopilamos</h2>
      <p>Para cumplir con las finalidades descritas en este aviso, recopilamos los siguientes datos personales:</p>
      <ul>
        <li>Datos de identificación y contacto: Nombre de usuario, correo electrónico y número de teléfono celular (opcional, para contacto comercial vía WhatsApp en la Tienda).</li>
        <li>Contenido multimedia y metadatos: Videos subidos, fotos de perfil, comentarios e interacciones.</li>
        <li>Datos de comunicación: Mensajes enviados a través del chat interno de la plataforma.</li>
      </ul>

      <h2>2. Finalidades del Tratamiento de Datos</h2>
      <p>Tratamos sus datos personales para las siguientes finalidades divididas en:</p>
      
      <h3>Finalidades Primarias (Necesarias para el servicio)</h3>
      <ul>
        <li>Crear y gestionar su cuenta de perfil en Poptok.</li>
        <li>Publicar y reproducir sus videos y contenido en la plataforma.</li>
        <li>Habilitar el funcionamiento de la Tienda (Marketplace) para conectar a compradores y vendedores a través de WhatsApp o chat interno.</li>
        <li>Procesar y facilitar la mensajería interna entre usuarios.</li>
        <li>Mantener la seguridad de la plataforma, investigar posibles abusos y moderar contenido inapropiado.</li>
      </ul>

      <h3>Finalidades Secundarias (No necesarias pero útiles)</h3>
      <ul>
        <li>Realizar análisis estadísticos y de uso de la plataforma para mejorar el servicio.</li>
        <li>Personalizar el contenido recomendado e intereses en su feed de videos.</li>
      </ul>

      <h2>3. Transferencia de sus Datos Personales</h2>
      <p>
        Poptok no vende, alquila ni comercializa sus datos personales con terceros. Sus datos son compartidos únicamente con proveedores de servicios en la nube como Firebase (Google Cloud) y AWS, necesarios para hospedar y hacer funcionar la aplicación. Estas transferencias no requieren su consentimiento según el artículo 37 de la LFPDPPP.
      </p>

      <h2>4. Medios para Ejercer los Derechos ARCO</h2>
      <p>
        De conformidad con la LFPDPPP, usted tiene derecho a **Acceder** a sus datos personales, **Rectificarles** si son inexactos, **Cancelarles** (borrarles) de nuestros registros o **Oponerse** al uso para fines específicos. 
      </p>
      <p>
        Para ejercer sus derechos ARCO, puede hacerlo de las siguientes maneras:
      </p>
      <ul>
        <li>
          <strong>De forma automática en la App:</strong> Puede ir a la configuración de su perfil y pulsar **"Descargar mis datos"** para ejercer su derecho de Acceso, o pulsar **"Eliminar mi cuenta"** para ejercer su derecho de Cancelación permanente. Sus datos y videos se borrarán de inmediato de nuestros servidores activos.
        </li>
        <li>
          <strong>Vía correo electrónico:</strong> Envíe su solicitud formal redactada conforme a la ley al departamento de protección de datos al correo <a href="mailto:support@poptok.app" style={{ color: "#FF0050" }}>support@poptok.app</a>. Su solicitud será atendida en un plazo máximo de 20 días hábiles.
        </li>
      </ul>

      <h2>5. Seguridad de sus Datos</h2>
      <p>
        Implementamos medidas de seguridad administrativas, técnicas y físicas avanzadas (como encriptación y control de acceso restringido en bases de datos de Firebase) para proteger sus datos contra daño, pérdida, alteración, destrucción o uso no autorizado.
      </p>

      <h2>6. Prevención de la Explotación y el Abuso Sexual Infantil (EASI)</h2>
      <p>Poptok mantiene una política de <strong>tolerancia cero</strong> frente a la explotación y el abuso sexual infantil (EASI), así como contra el Material de Abuso Sexual Infantil (CSAM). En cumplimiento estricto con las políticas de Google Play:</p>
      <ul>
        <li>Queda terminantemente prohibido subir, transmitir, solicitar o compartir cualquier tipo de contenido relacionado con la explotación o el abuso de menores.</li>
        <li>Implementamos herramientas de moderación proactiva y reporte de usuarios para detectar y eliminar inmediatamente cualquier contenido sospechoso.</li>
        <li>Cualquier infracción a esta política resultará en la eliminación permanente y definitiva de la cuenta del usuario, el bloqueo de su dispositivo y la denuncia inmediata a las autoridades competentes (incluyendo organizaciones globales como NCMEC).</li>
      </ul>

      <h2>7. Cambios al Aviso de Privacidad</h2>
      <p>
        Nos reservamos el derecho de efectuar modificaciones o actualizaciones a este aviso de privacidad en cualquier momento. Cualquier cambio será publicado dentro de esta sección en la plataforma Poptok.
      </p>

      <h1 style={{ color: "#FF0050", fontSize: "20px", marginTop: "25px" }}>Términos y Condiciones</h1>
      <p>Al registrarse y usar Poptok, el usuario acepta cumplir con estos términos. Los usuarios son responsables del contenido que suben. Se prohíbe el material ofensivo o ilegal.</p>
    </div>
  );
};

export default PrivacyPolicy;
