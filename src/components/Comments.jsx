import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "../index.css";

const Comments = ({ riuzaki1234, onClose, onCommentSubmit }) => {
  const [comment, setComment] = useState("");
  const [commentsList, setCommentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const commentsRef = useRef(null);

  // ✅ Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("✅ Usuario autenticado en comentarios:", user);
        try { 
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          setCurrentUser({
            uid: user.uid,
            displayName: userData.name || user.displayName || "Anónimo",
            profilePic: userData.profilePic || user.photoURL || "/default-user.png",
          });
        } catch (err) {
          console.error("❌ Error al obtener datos del usuario en comentarios:", err);
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || "Anónimo",
            profilePic: user.photoURL || "/default-user.png", 
          }); 
        }
      } else {
        console.log("⚠️ No hay usuario autenticado en comentarios.");
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Cargar comentarios cuando el componente se monta o cambia el ID del video
  useEffect(() => {
    if (riuzaki1234) {
      setTimeout(() => setIsOpen(true), 50);
      fetchComments();
    }
  }, [riuzaki1234]);

  // 📌 Obtener comentarios desde Firestore
  const fetchComments = useCallback(async () => {
    if (!riuzaki1234) {
      setError("Error: No se encontró el ID del video.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const videoDoc = await getDoc(doc(db, "videos", riuzaki1234));
      if (!videoDoc.exists()) {
        console.warn("⚠️ No se encontró el video en Firestore.");
        setCommentsList([]);
        return;
      }

      const videoData = videoDoc.data();
      const comments = Array.isArray(videoData.comments) ? videoData.comments : [];

      // 🔹 Enriquecer comentarios con imágenes de perfil desde Firestore
      const profileCache = new Map();
      const enrichedComments = await Promise.all(
        comments.map(async (c) => {
          if (!profileCache.has(c.userId)) {
            try {
              const userDoc = await getDoc(doc(db, "users", c.userId));
              profileCache.set(
                c.userId,
                userDoc.exists() ? userDoc.data().profilePic || "/default-user.png" : "/default-user.png"
              );
            } catch (err) {
              profileCache.set(c.userId, "/default-user.png");
            }
          }

          return {
            id: c.commentId || c.id,
            text: c.text,
            timestamp: new Date(c.timestamp).toLocaleString(),
            username: c.username || "Anónimo",
            profilePic: profileCache.get(c.userId),
          };
        })
      );

      setCommentsList(enrichedComments);
    } catch (err) {
      console.error("❌ Error al obtener los comentarios:", err);
      setError("Error al cargar los comentarios.");
    } finally {
      setLoading(false);
    }
  }, [riuzaki1234]);

  // 📌 Manejar envío de un nuevo comentario
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!comment.trim()) return;
    if (!currentUser) {
      alert("⚠️ Debes iniciar sesión para comentar.");
      return;
    }

    console.log("📩 Intentando enviar comentario:", comment);

    try {
      const newComment = {
        commentId: Date.now().toString(),
        text: comment.trim(),
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        username: currentUser.displayName || "Anónimo",
        profilePic: currentUser.profilePic || "/default-user.png",
      };

      console.log("📩 Comentario que se enviará a la API:", newComment);
      await onCommentSubmit(newComment.text);
      console.log("✅ Comentario guardado en API");

      // 🔹 Actualizar el estado local con el nuevo comentario
      setCommentsList((prevComments) => [...prevComments, newComment]);
      setComment(""); // Limpiar el input después de enviar
    } catch (err) {
      console.error("❌ Error al enviar el comentario:", err);
      alert("Error al enviar el comentario. Inténtalo de nuevo.");
    }
  }, [comment, currentUser, onCommentSubmit, riuzaki1234]);

  // 📌 Manejo de cierre de la sección con `touchmove`
  useEffect(() => {
    const element = commentsRef.current;
    let startY = 0;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (["input", "textarea"].includes(e.target.tagName.toLowerCase())) return;

      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 50) {
        setIsOpen(false);
        setTimeout(onClose, 300);
      }
    };

    element?.addEventListener("touchstart", handleTouchStart);
    element?.addEventListener("touchmove", handleTouchMove);

    return () => {
      element?.removeEventListener("touchstart", handleTouchStart);
      element?.removeEventListener("touchmove", handleTouchMove);
    };
  }, [onClose]);

  return (
    <div className={`comments-overlay ${isOpen ? "open" : ""}`} ref={commentsRef}>
      <div className="comments-container">
        <button className="close-button" onClick={() => { setIsOpen(false); setTimeout(onClose, 300); }}>
          ×
        </button>

        {loading && <p>Cargando comentarios...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="comments-list">
          {commentsList.length > 0 ? (
            commentsList.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-profile">
                  <img src={c.profilePic} alt="Usuario" className="comment-profile-pic" />
                </div>
                <div className="comment-content">
                  <span className="comment-username">{c.username}</span>
                  <span className="comment-text">{c.text}</span>
                  <span className="comment-time">{c.timestamp}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-comments">No hay comentarios aún.</p>
          )}
        </div>

        {currentUser ? (
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario (máx. 100 caracteres)"
              maxLength={100}
            />
            <button type="submit">Enviar</button>
          </form>
        ) : (
          <p className="login-message">⚠️ Inicia sesión para comentar.</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(Comments);
