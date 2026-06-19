import React from "react";

const Copyright = ({ onBack }) => {
  return (
    <div className="copyright-container" style={{ padding: "10px", maxHeight: "80vh", overflowY: "auto", fontSize: "14px", color: "#ccc" }}>
      <button className="back-button" onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", marginBottom: "15px" }}>
        ⬅ Volver
      </button>
      <h1 style={{ color: "#FF0050", fontSize: "20px" }}>Protección de Derechos</h1>
      <p>📢 Aviso de Derechos de Autor (Copyright)</p>
      <p>Última actualización: 19 de Junio de 2026</p>
      <p>Poptok respeta los derechos de propiedad intelectual y espera que sus usuarios hagan lo mismo.</p>

      <h2>1. Responsabilidad del contenido</h2>
      <p>Los usuarios son responsables del contenido que suben a la plataforma. Al subir un video, garantizas que tienes los derechos necesarios para compartirlo.</p>

      <h2>2. Procedimiento de quejas</h2>
      <p>Si crees que tu contenido ha sido publicado en Poptok sin autorización, envía un correo a <a href="mailto:legal@poptok.com" style={{ color: "#FF0050" }}>legal@poptok.com</a> con la información pertinente (identificación del contenido y pruebas de autoría).</p>

      <h2>3. Contacto</h2>
      <p>Para reportar cualquier reclamación de derechos de autor, escribe a <a href="mailto:soporte@poptok.com" style={{ color: "#FF0050" }}>soporte@poptok.com</a>.</p>
    </div>
  );
};

export default Copyright;
