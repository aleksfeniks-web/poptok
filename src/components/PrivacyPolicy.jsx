import React from "react";

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="privacy-container" style={{ padding: "10px", maxHeight: "80vh", overflowY: "auto", fontSize: "14px", color: "#ccc" }}>
      <button className="back-button" onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", marginBottom: "15px" }}>
        ⬅ Volver
      </button>
      <h1 style={{ color: "#FF0050", fontSize: "20px" }}>Política de Privacidad</h1>
      <p>Última actualización: 19 de Junio de 2026</p>
      <p>Bienvenido a Poptok (“nosotros”, “nuestro” o “la plataforma”). Nos comprometemos a proteger la privacidad de nuestros usuarios y garantizar el uso adecuado de su información personal.</p>

      <h2>1. Información que recopilamos</h2>
      <p>Podemos recopilar la siguiente información cuando usas nuestra plataforma:</p>
      <ul>
        <li>Nombre de usuario y dirección de correo electrónico.</li>
        <li>Contenido subido, incluyendo videos y metadatos.</li>
        <li>Historial de interacciones con otros usuarios y contenido.</li>
      </ul>

      <h2>2. Cómo usamos tu información</h2>
      <p>Los datos recopilados se utilizan para:</p>
      <ul>
        <li>Proveer y mejorar nuestros servicios.</li>
        <li>Detectar fraudes y proteger la seguridad de los usuarios.</li>
        <li>Cumplir con obligaciones legales.</li>
        <li>Personalizar la experiencia de los usuarios en la plataforma.</li>
      </ul>

      <h2>3. Compartición de datos</h2>
      <p>No vendemos ni compartimos información personal con terceros, excepto en los siguientes casos:</p>
      <ul>
        <li>Con proveedores de servicios como AWS y Firebase para operar la plataforma.</li>
        <li>Para cumplir con requerimientos legales o solicitudes gubernamentales.</li>
      </ul>

      <h2>4. Derechos de los Usuarios</h2>
      <p>Los usuarios pueden acceder a su información, rectificar datos incorrectos o cancelar su cuenta enviando un correo a <a href="mailto:soporte@poptok.com" style={{ color: "#FF0050" }}>soporte@poptok.com</a>.</p>

      <h1 style={{ color: "#FF0050", fontSize: "20px", marginTop: "25px" }}>Términos y Condiciones</h1>
      <p>Al registrarse y usar Poptok, el usuario acepta cumplir con estos términos. Los usuarios son responsables del contenido que suben. Se prohíbe el material ofensivo o ilegal.</p>
    </div>
  );
};

export default PrivacyPolicy;
