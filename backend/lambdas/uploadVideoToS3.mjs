import React, { useState, useEffect } from "react";
import { auth } from "../firebase.js"; // Importamos Firebase para obtener el usuario logueado

const UploadVideo = ({ onUploadSuccess, setPage }) => {
    const [videoFile, setVideoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null); // Estado para el usuario autenticado

    // Obtenemos el usuario logueado de Firebase
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Convertir archivo de video a Base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(",")[1]; // Extraer base64
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("video/")) {
            setVideoFile(file);
        } else {
            alert("Por favor, selecciona un archivo de video válido.");
            setVideoFile(null);
        }
    };

    const handleUpload = async () => {
        if (!videoFile) {
            alert("Selecciona un video para subir.");
            return;
        }

        if (!user) {
            alert("Debes iniciar sesión para subir un video.");
            return;
        }

        setLoading(true);

        try {
            const videoBase64 = await fileToBase64(videoFile);

            // Crear objeto JSON con formato esperado
            const requestBody = {
                body: JSON.stringify({
                    uid: user.uid,
                    username: user.displayName || user.email, // Tomamos el nombre del usuario o su email
                    videoData: videoBase64,
                    fileName: videoFile.name,
                }),
            };

            console.log("📤 Enviando datos...");
            console.log("📁 Archivo:", videoFile.name);
            console.log("👤 Usuario:", user.displayName || user.email);
            console.log("🔑 UID:", user.uid); // Verificar que el UID se está enviando
            const response = await fetch(`${process.env.REACT_APP_API_URL}/uploadVideo/uploadVideo`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Error en la respuesta (${response.status}): ${responseText}`);
            }

            const data = JSON.parse(responseText);
            console.log("✅ Respuesta de la API:", data);

            alert("✅ Video subido con éxito!");

            // ✅ Llamar a onUploadSuccess para cerrar la ventana y actualizar el feed
            if (onUploadSuccess) onUploadSuccess();

            // ✅ Asegurar que el feed se refresque correctamente
            if (setPage) {
                setPage(1); // 🔄 Recargar los videos desde la primera página
            }    

        } catch (error) {
            console.error("❌ Error en la subida del video:", error);
            alert(`Error al subir el video: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-section">
            <h2>Subir Video</h2>
            
            {user ? (
                <p><strong>Subiendo como:</strong> {user.displayName || user.email}</p>
            ) : (
                <p style={{ color: "red" }}>⚠ Debes iniciar sesión para subir un video.</p>
            )}

            <input 
                id="file-upload"
                type="file" 
                accept="video/*"
                onChange={handleFileChange}
                className="upload-input"
                style={{display:"none"}}
            />
            <label htmlFor="file-upload" className="custom-file-upload">
                📂 Seleccionar Archivo
            </label>
            {!videoFile && <p className="text-gray-400">Ningún archivo seleccionado</p>}
            <button 
                onClick={handleUpload} 
                className="upload-button"
                disabled={loading || !user} // Bloquea el botón si no hay usuario logueado
            >
                {loading ? "Subiendo..." : "Subir Video"}
            </button>
            <button 
                onClick={onUploadSuccess} // Cerrar la ventana si el usuario cancela
                className="cancel-button"
            >
                Cancelar
            </button>
        </div>
    );
};

export default UploadVideo;

