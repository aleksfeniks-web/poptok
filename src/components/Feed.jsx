import React, { useEffect, useState, useRef } from "react";
import "../index.css";
import VideoPlayer from "./VideoPlayer.jsx";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, updateDoc } from "firebase/firestore";
import axios from "axios";

const Feed = ({
  user,
  coins,
  setCoins,
  showUploadSection,
  setShowUploadSection,
  refreshTrigger,
  page,
  setPage,
  isOpen,
  setIsOpen, 
}) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interactions, setInteractions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const observerRef = useRef(null);

  // ✅ Manejo de autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateUserCoinsInDynamoDB = async (uid) => {
    try {
      const newCoins = coins + 1;
      setCoins(newCoins);

      const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
      const response = await fetch(`${apiUrl}/UpdateCoin`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, coins: newCoins }),
      });

      if (!response.ok) throw new Error("Error al actualizar monedas en DynamoDB");

      console.log("✅ Monedas actualizadas correctamente en DynamoDB");
    } catch (err) {
      console.error("❌ Error al actualizar monedas:", err);
    }
  };

  const updateVideoComments = async (riuzaki1234, comment, currentUser) => {
    try {
      if (!riuzaki1234 || !comment || !currentUser) {
        throw new Error("Faltan datos requeridos: riuzaki1234, comment o currentUser");
      }

      const newComment = {
        commentId: comment.commentId || Date.now().toString(),
        text: comment.text,  
        timestamp: comment.timestamp || new Date().toISOString(),
        userId: comment.userId || currentUser.uid,
        username: comment.username || currentUser.displayName || "Anónimo",
      };
    
      const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
      const response = await fetch(`${apiUrl}/UpdateVideoComments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          riuzaki1234,
          userId: currentUser.uid,
          comments: [newComment]   
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al guardar el comentario");
      }

      const responseData = await response.json(); 
      console.log("✅ Comentario guardado en API:", responseData.comments);
      
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.riuzaki1234 === riuzaki1234
            ? { ...v, comments: [...(v.comments || []), newComment] }
            : v
        )
      );
    } catch (err) {
      console.error("❌ Error en updateVideoComments:", err);
    }
  };

  // ✅ Función para cargar videos con sus comentarios desde la API
  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
      const response = await fetch(`${apiUrl}/getVideos?page=${page}&limit=5`);
      
      if (!response.ok) throw new Error("Error en la respuesta de la API");

      const data = await response.json();
      console.log("✅ Videos recibidos:", data);

      if (!Array.isArray(data)) throw new Error("La respuesta de la API no es un array");

      const processedVideos = data.map((v) => ({
        ...v,
        comments: Array.isArray(v.comments) ? v.comments : [], 
      }));

      // Append new videos (and prevent duplicating if they are already loaded)
      setVideos((prevVideos) => {
        const existingIds = new Set(prevVideos.map(v => v.riuzaki1234));
        const filteredNew = processedVideos.filter(v => !existingIds.has(v.riuzaki1234));
        return [...prevVideos, ...filteredNew];
      });

      // Cargar interacciones
      setInteractions((prevInteractions) => {
        const newInteractions = { ...prevInteractions };
        data.forEach((v) => {
          if (v.riuzaki1234 && !newInteractions[v.riuzaki1234]) {
            newInteractions[v.riuzaki1234] = {
              likes: v.likes || 0,
              comments: (v.comments || []).length, 
              favorites: v.favorites || 0,
              coins: v.coins || 0,
            };
          }
        });
        return newInteractions;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cargar videos al iniciar o cambiar paginación
  useEffect(() => {
    if (!isOpen) {
      fetchVideos();
    }
  }, [page, refreshTrigger, isOpen]);

  // ✅ Detectar fin de scroll para carga automática
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, setPage]);

  const updateInteractionsInDynamoDB = async (riuzaki1234, currentInteractions) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
      const response = await fetch(`${apiUrl}/UpdateItemCommand`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riuzaki1234,
          likes: currentInteractions.likes,
          comments: currentInteractions.comments,
          favorites: currentInteractions.favorites,
        }),
      });

      if (!response.ok) throw new Error("Error al actualizar interacciones en DynamoDB");
      console.log("✅ Interacciones actualizadas correctamente en DynamoDB");
    } catch (err) {
      console.error("❌ Error al actualizar interacciones:", err);
    }
  };

  // ✅ Función para manejar interacciones (likes, comentarios, favoritos)
  const handleInteraction = async (riuzaki1234, type) => {
    if (!currentUser) {
      console.error("Usuario no autenticado");
      return;
    }

    const uid = currentUser.uid;
    if (type === "coins") {
      updateUserCoinsInDynamoDB(uid);
      return;
    }

    setInteractions((prevInteractions) => {
      const updatedInteractions = {
        ...prevInteractions,
        [riuzaki1234]: {
          ...prevInteractions[riuzaki1234],
          [type]: (prevInteractions[riuzaki1234]?.[type] || 0) + 1,
        },
      };

      updateInteractionsInDynamoDB(riuzaki1234, updatedInteractions[riuzaki1234]);
      return updatedInteractions;
    });
  };

  return (
    <div className="feed-container">
      {loading && page === 1 && <p className="text-center text-gray-400" style={{ padding: "20px" }}>Cargando videos...</p>}
      {error && <p className="text-center text-red-500" style={{ padding: "20px" }}>{`Error: ${error}`}</p>}

      {videos.length === 0 && !loading ? (
        <p className="text-center text-gray-400" style={{ padding: "50px 20px" }}>No hay videos aún. ¡Sé el primero en subir uno!</p>
      ) : (
        videos.map((v) => (
          <div key={v.riuzaki1234} className="video-item">
            <VideoPlayer
              videoUrl={v.fileUrl}
              username={v.username}
              description={v.description}  
              interest={v.interest}  
              riuzaki1234={v.riuzaki1234}
              currentUser={currentUser}
              userId={v.userId}
              interactions={
                interactions[v.riuzaki1234] || {
                  likes: 0,
                  comments: [],
                  favorites: 0,
                  coins: 0,
                }
              }
              onInteraction={handleInteraction}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              updateVideoComments={updateVideoComments}
            />
          </div>
        ))
      )}

      {/* Elemento de referencia para scroll infinito */}
      <div ref={observerRef} style={{ height: "10px" }}></div>

      {loading && page > 1 && <p className="text-center text-gray-400" style={{ padding: "10px" }}>Cargando más videos...</p>}
      <div style={{ height: "60px" }}></div>
    </div>
  );
};

export default Feed;
