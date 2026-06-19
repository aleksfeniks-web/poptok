import React, { useState, useEffect } from "react";
import { auth } from "../firebase.js"; 
import { FaArrowUp, FaCheck, FaTimes } from "react-icons/fa";

const UploadVideo = ({ onUploadSuccess, setPage }) => {
    const [videoFile, setVideoFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]); // ✅ Estado para imágenes
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    
    const interestOptions = [
        "Random", "Anime & Manga", "Latest News", "Humor", "Memes", "Gaming",
        "WTF", "Relationship & Dating", "Motor Vehicles", "Animals & Pets",
        "Science & Tech", "ASMR", "Sports", "Movies & TV", "Food & Drinks", 
        "Lifestyle", "Superhero", "Crypto", "IA", "WoW"
    ];

    const [selectedInterest, setSelectedInterest] = useState("");
    const [description, setDescription] = useState(""); // ✅ Estado para descripción
    
    // ✅ Obtener usuario logueado de Firebase
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    // ✅ Selector de archivos
    const handleFileSelection = (type) => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = type === 'images';
        fileInput.accept = type === 'video' ? "video/*" : "image/*";

        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (type === 'video') {
                const file = files[0];
                if (file && file.type.startsWith("video/")) {
                    setVideoFile(file);
                    setImageFiles([]); // Reset images
                } else {
                    alert("Por favor, selecciona un archivo de video válido.");
                }
            } else if (type === 'images') {
                const validImages = files.filter(file => file.type.startsWith("image/"));
                if (validImages.length > 0) {
                    setImageFiles(validImages);
                    setVideoFile(null); // Reset video
                } else {
                    alert("Por favor, selecciona archivos de imagen válidos.");
                }
            }
        };

        fileInput.click();
    };

    // ✅ Obtener URL firmada de S3
    const getSignedUrl = async (fileName, fileType) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
            const response = await fetch(`${apiUrl}/getUploadUrl?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`);
            if (!response.ok) throw new Error("No se pudo obtener la URL de subida.");
            return await response.json(); // Espera retornar { uploadUrl, fileKey }
        } catch (error) {
            console.error("❌ Error al obtener la URL firmada:", error);
            alert("Error al obtener la URL de subida.");
            throw error;
        }
    };
    
    // ✅ Subir archivo a S3
    const uploadToS3 = async (file) => {
        try {
            const { uploadUrl, fileKey } = await getSignedUrl(file.name, file.type);

            await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            console.log("✅ Archivo subido a S3!");
            return fileKey;
        } catch (error) {
            console.error("❌ Error al subir el archivo a S3:", error);
            alert("Error al subir el archivo a S3.");
            throw error;
        }
    };

    // ✅ Manejo de la subida
    const handleUpload = async () => {
        if ((!videoFile && imageFiles.length === 0) || !user) {
            alert("Selecciona un video o imágenes y asegúrate de estar autenticado.");
            return;
        }

        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";

            if (videoFile) {
                console.log("🔄 Subiendo video a S3...");
                const fileKey = await uploadToS3(videoFile);
                console.log("✅ Video subido a S3. fileKey:", fileKey);

                // Guardar en DynamoDB
                await fetch(`${apiUrl}/saveVideoMetadata`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.uid,
                        fileKey: fileKey,
                        createdAt: new Date().toISOString(),
                        description: description.trim(),
                        interest: selectedInterest 
                    }),
                });

                alert("✅ Video subido con éxito!");
            } else if (imageFiles.length > 0) {
                console.log("🔄 Subiendo imágenes a S3...");
                for (const imageFile of imageFiles) {
                    const fileKey = await uploadToS3(imageFile);
                    console.log("✅ Imagen subida a S3. fileKey:", fileKey);

                    // Guardar en DynamoDB
                    await fetch(`${apiUrl}/saveVideoMetadata`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: user.uid,
                            fileKey: fileKey,
                            createdAt: new Date().toISOString(),
                            description: description.trim(),
                            interest: selectedInterest 
                        }),
                    });
                }

                alert("✅ Imágenes subidas con éxito!");
            }

            // Limpiar estados
            setVideoFile(null);
            setImageFiles([]);
            setDescription("");
            setSelectedInterest("");

            if (onUploadSuccess) onUploadSuccess();
            if (setPage) setPage(1);
        } catch (error) {
            console.error("❌ Error en la subida del archivo:", error);
            alert(`Error al subir el archivo: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-section">
            <h2>Subir Video o Imágenes</h2>

            <label htmlFor="description">Descripción:</label>
            <textarea
                id="description"
                placeholder="Describe tu video o imagen..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="description-input"
                style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "5px", padding: "8px", boxSizing: "border-box" }}
            />
                
            <label htmlFor="interest" style={{ marginTop: "10px", display: "block" }}>Categoría:</label>
            <select 
                id="interest" 
                value={selectedInterest} 
                onChange={(e) => setSelectedInterest(e.target.value)}
                style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "5px", padding: "8px" }}
            >
                <option value="">-- Selecciona --</option>
                {interestOptions.map((interest, index) => (
                    <option key={index} value={interest}>{interest}</option>
                ))}
            </select>

            {/* Vista previa */}
            {videoFile && (
                <div className="video-preview" style={{ marginTop: "15px" }}>
                    <video width="100%" height="auto" controls style={{ borderRadius: "5px", background: "#000" }}>
                        <source src={URL.createObjectURL(videoFile)} type="video/mp4" />
                    </video>
                </div>
            )}

            {imageFiles.length > 0 && (
                <div className="image-preview" style={{ marginTop: "15px", display: "flex", gap: "5px", flexWrap: "wrap" }}>
                    {imageFiles.map((imageFile, index) => (
                        <img key={index} src={URL.createObjectURL(imageFile)} alt={`Preview ${index}`} style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "5px" }} />
                    ))}
                </div>
            )}

            {/* Botones de selección */}
            <div className="upload-controls" style={{ display: "flex", gap: "10px", marginTop: "15px", justifyContent: "center" }}>
                <button 
                    onClick={() => handleFileSelection('video')} 
                    className="upload-button"
                    disabled={loading || !user}
                    style={{ fontSize: "14px" }}
                >
                   🎥 Video
                </button>

                <button 
                    onClick={() => handleFileSelection('images')} 
                    className="upload-button"
                    disabled={loading || !user}
                    style={{ fontSize: "14px" }}
                >
                   📸 Fotos
                </button>
            </div>

            {/* Botón de publicar */}
            {(videoFile || imageFiles.length > 0) && (
                <button 
                    onClick={handleUpload} 
                    className="upload-button"
                    disabled={loading || !user}
                    style={{ width: "100%", borderRadius: "20px", marginTop: "15px", background: "#FF0050", color: "#fff", fontWeight: "bold" }}
                >
                    {loading ? "Publicando..." : "Publicar"}
                </button>
            )}

            {/* Cancelar */}
            <button 
                onClick={onUploadSuccess}
                className="cancel-button"
                style={{ width: "100%", borderRadius: "20px", marginTop: "10px" }}
            >
                Cancelar
            </button>
        </div>
    );
};

export default UploadVideo;
