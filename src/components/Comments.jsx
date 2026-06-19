import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FiX, FiSend } from "react-icons/fi";
import "../index.css";

const Comments = ({ riuzaki1234, onClose, onCommentSubmit }) => {
  const [comment, setComment] = useState("");
  const [commentsList, setCommentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const listEndRef = useRef(null);
  const inputRef = useRef(null);
  const sheetRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setCurrentUser(null); return; }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        setCurrentUser({
          uid: u.uid,
          displayName: data.name || u.displayName || "Anónimo",
          profilePic: data.profilePic || u.photoURL || null,
        });
      } catch {
        setCurrentUser({ uid: u.uid, displayName: u.displayName || "Anónimo", profilePic: u.photoURL || null });
      }
    });
    return () => unsub();
  }, []);

  // ── Fetch comments ────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    if (!riuzaki1234) return;
    // Demo Pexels/Mixkit videos don't have Firestore docs
    if (riuzaki1234.startsWith("demo-") || riuzaki1234.startsWith("pexels-")) {
      setCommentsList([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await getDoc(doc(db, "videos", riuzaki1234));
      if (!snap.exists()) { setCommentsList([]); return; }
      const raw = Array.isArray(snap.data().comments) ? snap.data().comments : [];

      // Enrich with profile pics (cache by userId)
      const cache = {};
      const enriched = await Promise.all(
        raw.map(async (c) => {
          if (!cache[c.userId]) {
            try {
              const u = await getDoc(doc(db, "users", c.userId));
              cache[c.userId] = u.exists() ? (u.data().profilePic || null) : null;
            } catch { cache[c.userId] = null; }
          }
          return {
            id: c.commentId || c.id || Math.random().toString(),
            text: c.text,
            timestamp: c.timestamp ? new Date(c.timestamp).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "",
            username: c.username || "Anónimo",
            profilePic: cache[c.userId],
          };
        })
      );
      setCommentsList(enriched);
    } catch (e) {
      setError("No se pudieron cargar los comentarios.");
    } finally {
      setLoading(false);
    }
  }, [riuzaki1234]);

  useEffect(() => {
    fetchComments();
    setTimeout(() => setVisible(true), 30);
  }, [fetchComments]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commentsList]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!comment.trim()) return;
    if (!currentUser) { alert("Inicia sesión para comentar."); return; }

    const newComment = {
      id: Date.now().toString(),
      text: comment.trim(),
      timestamp: new Date().toLocaleString("es", { dateStyle: "short", timeStyle: "short" }),
      username: currentUser.displayName,
      profilePic: currentUser.profilePic,
    };

    try {
      await onCommentSubmit(comment.trim());
      setCommentsList(prev => [...prev, newComment]);
      setComment("");
      inputRef.current?.focus();
    } catch (e) {
      console.error("Error al enviar comentario:", e);
    }
  }, [comment, currentUser, onCommentSubmit]);

  // ── Swipe to close ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = sheetRef.current;
    let startY = 0;
    const onStart = (e) => { startY = (e.touches?.[0] || e).clientY; };
    const onMove = (e) => {
      if (["input", "textarea"].includes(e.target.tagName.toLowerCase())) return;
      const dy = (e.touches?.[0] || e).clientY - startY;
      if (dy > 60) close();
    };
    el?.addEventListener("touchstart", onStart);
    el?.addEventListener("touchmove", onMove);
    return () => { el?.removeEventListener("touchstart", onStart); el?.removeEventListener("touchmove", onMove); };
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  // ── Avatar helper ─────────────────────────────────────────────────────────
  const Avatar = ({ src, name, size = 36 }) => {
    const initials = (name || "?")[0].toUpperCase();
    if (src) return <img src={src} alt={name} className="comment-avatar" style={{ width: size, height: size }} />;
    return (
      <div className="comment-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {initials}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`comments-backdrop ${visible ? "visible" : ""}`}
        onClick={close}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={`comments-sheet ${visible ? "open" : ""}`}
      >
        {/* Drag handle */}
        <div className="comments-handle" onClick={close} />

        {/* Header */}
        <div className="comments-header">
          <span className="comments-header-title">
            Comentarios{commentsList.length > 0 ? ` (${commentsList.length})` : ""}
          </span>
          <button className="comments-close-btn" onClick={close}><FiX size={18} /></button>
        </div>

        {/* List */}
        <div className="comments-scroll-area">
          {loading && (
            <div className="comments-loading">
              <div className="comments-spinner" />
              <p>Cargando comentarios...</p>
            </div>
          )}
          {error && <p className="comments-error">{error}</p>}

          {!loading && commentsList.length === 0 && !error && (
            <div className="comments-empty">
              <p>🗨️ Sé el primero en comentar</p>
            </div>
          )}

          {commentsList.map((c) => (
            <div key={c.id} className="comment-item">
              <Avatar src={c.profilePic} name={c.username} />
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-name">{c.username}</span>
                  <span className="comment-ts">{c.timestamp}</span>
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        {/* Input */}
        <div className="comments-input-bar">
          {currentUser ? (
            <>
              <Avatar src={currentUser.profilePic} name={currentUser.displayName} size={32} />
              <form className="comments-form" onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  className="comments-input"
                  type="text"
                  placeholder="Añade un comentario..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={200}
                />
                <button
                  type="submit"
                  className={`comments-send-btn ${comment.trim() ? "active" : ""}`}
                  disabled={!comment.trim()}
                >
                  <FiSend size={16} />
                </button>
              </form>
            </>
          ) : (
            <p className="comments-login-prompt">Inicia sesión para comentar</p>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(Comments);
