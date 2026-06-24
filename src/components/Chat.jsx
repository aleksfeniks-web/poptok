import "../index.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AiOutlineClose, AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillPersonFill, BsSend } from "react-icons/bs";
import { FiCoffee, FiSearch, FiGift } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import { auth, db } from "../firebase.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc, getDocs, or, and } from "firebase/firestore";

const Chat = ({ closeChat, coinBalance, sendCoin, unreadMessages, setUnreadMessages, initialFriend, userStatus }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState("messages"); // "messages" or "activity"
  const [activityNotifications, setActivityNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(initialFriend || "");
  const [selectedFriendData, setSelectedFriendData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [transferringCoin, setTransferringCoin] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  // ─── Fetch current user profile (for blocked users list) ────────────────────
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setCurrentUserProfile(snap.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  // ─── Fetch activity notifications in real-time ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "activity_notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivityNotifications(list);
    }, (err) => {
      console.error("Error fetching activity notifications:", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Mark activity notifications as read when on Activity Tab
  const markNotificationsAsRead = async () => {
    if (!user || activityNotifications.length === 0) return;
    const unreadAct = activityNotifications.filter(n => !n.read && n.type !== "purchase");
    if (unreadAct.length === 0) return;
    
    const batchPromises = unreadAct.map(async (n) => {
      try {
        const docRef = doc(db, "activity_notifications", n.id);
        await updateDoc(docRef, { read: true });
      } catch (e) {
        console.error("Error marking notification read:", e);
      }
    });
    await Promise.all(batchPromises);
  };

  useEffect(() => {
    if (activeTab === "activity") {
      markNotificationsAsRead();
    }
  }, [activeTab, activityNotifications, user]);

  // ─── Fetch friends (users) ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const friendsRef = collection(db, "users");
        const friendsSnapshot = await getDocs(friendsRef);
        const myBlockedUsers = currentUserProfile?.blockedUsers || [];
        const list = friendsSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            const contactBlockedUsers = data.blockedUsers || [];
            // Excluir usuario actual, usuarios bloqueados por mí y usuarios que me bloquearon
            return doc.id !== user.uid && 
                   !myBlockedUsers.includes(doc.id) && 
                   !contactBlockedUsers.includes(user.uid);
          })
          .map(doc => ({ id: doc.id, ...doc.data() }));
        setFriends(list);
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user, currentUserProfile]);

  // ─── Fetch videos for sharing ─────────────────────────────────────────────
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const snap = await getDocs(collection(db, "videos"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setVideos(list);
      } catch (err) {
        console.error("Error fetching videos for sharing:", err);
      }
    };
    fetchVideos();
  }, []);

  // ─── Fetch selected friend profile data ───────────────────────────────────
  useEffect(() => {
    if (!selectedFriend) {
      setSelectedFriendData(null);
      return;
    }
    const friend = friends.find(f => f.id === selectedFriend);
    if (friend) {
      setSelectedFriendData(friend);
    } else {
      // Fallback query if not in the cached list
      getDoc(doc(db, "users", selectedFriend)).then(snap => {
        if (snap.exists()) setSelectedFriendData({ id: snap.id, ...snap.data() });
      });
    }
  }, [selectedFriend, friends]);

  // ─── Fetch messages thread ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !selectedFriend) return;

    try {
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        or(
          and(
            where("senderId", "==", user.uid),
            where("receiverId", "==", selectedFriend)
          ),
          and(
            where("senderId", "==", selectedFriend),
            where("receiverId", "==", user.uid)
          )
        )
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedMessages = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp ? new Date(a.timestamp) : new Date(0));
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp ? new Date(b.timestamp) : new Date(0));
            return timeA - timeB;
          });
        setMessages(loadedMessages);

        // Check unread messages
        const unread = loadedMessages.some(msg => !msg.read && msg.receiverId === user.uid);
        if (setUnreadMessages) setUnreadMessages(unread);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error subscribing to messages:", error);
    }
  }, [user, selectedFriend, setUnreadMessages]);

  // ─── Mark messages as read ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || messages.length === 0) return;

    messages.forEach(async (msg) => {
      if (!msg.read && msg.receiverId === user.uid) {
        try {
          const msgRef = doc(db, "messages", msg.id);
          await updateDoc(msgRef, { read: true });
        } catch (error) {
          console.error("Error updating read status:", error);
        }
      }
    });

    if (setUnreadMessages) setUnreadMessages(false);
  }, [messages, user, setUnreadMessages]);

  // ─── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedFriend]);

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (textToSend) => {
    const content = typeof textToSend === "string" ? textToSend : message;
    if (!content.trim() || !user || !selectedFriend) return;
    if (userStatus === "restricted") {
      alert("Acceso denegado: Tu cuenta tiene restricciones y no puedes chatear.");
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        receiverId: selectedFriend,
        text: content.trim(),
        timestamp: new Date(),
        read: false,
      });

      if (typeof textToSend !== "string") {
        setMessage("");
      }
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  }, [message, user, selectedFriend]);

  // ─── Send Coin Transfer ───────────────────────────────────────────────────
  const handleSendCoin = async () => {
    if (coinBalance <= 0 || !selectedFriend || !user || transferringCoin) return;
    if (userStatus === "restricted") {
      alert("Acceso denegado: Tu cuenta tiene restricciones.");
      return;
    }

    setTransferringCoin(true);
    try {
      // 1. Decrement sender's coins in Firestore
      const senderRef = doc(db, "users", user.uid);
      const senderSnap = await getDoc(senderRef);
      if (senderSnap.exists()) {
        const senderCoins = senderSnap.data().coins || 0;
        await updateDoc(senderRef, { coins: Math.max(0, senderCoins - 1) });
      }

      // 2. Increment receiver's coins in Firestore
      const receiverRef = doc(db, "users", selectedFriend);
      const receiverSnap = await getDoc(receiverRef);
      if (receiverSnap.exists()) {
        const receiverCoins = receiverSnap.data().coins || 0;
        await updateDoc(receiverRef, { coins: receiverCoins + 1 });
      }

      // 3. Decrement in local App state
      sendCoin();

      // 4. Send system message in Chat
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        receiverId: selectedFriend,
        text: "🎁 ¡Te he enviado una moneda de regalo!",
        timestamp: new Date(),
        read: false,
      });
    } catch (err) {
      console.error("Error transferring coin:", err);
      alert("Error al transferir moneda.");
    } finally {
      setTransferringCoin(false);
    }
  };

  // ─── Avatar initials helper ───────────────────────────────────────────────
  const Avatar = ({ src, name, size = 38 }) => {
    const initials = (name || "?")[0].toUpperCase();
    if (src) return <img src={src} alt={name} className="chat-avatar-img" style={{ width: size, height: size, borderRadius: "50%" }} />;
    return (
      <div className="chat-avatar-fallback" style={{ width: size, height: size, borderRadius: "50%", fontSize: size * 0.42 }}>
        {initials}
      </div>
    );
  };

  // Filter friends list based on search query
  const filteredFriends = friends.filter(f =>
    (f.name || f.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-container">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="chat-header">
        {selectedFriend ? (
          <>
            <button className="chat-back-btn" onClick={() => setSelectedFriend("")}>
              <AiOutlineArrowLeft size={20} />
            </button>
            <div className="chat-header-user">
              <Avatar src={selectedFriendData?.profilePic} name={selectedFriendData?.name || selectedFriendData?.email?.split("@")[0] || "Usuario"} size={32} />
              <span className="chat-header-name">
                {selectedFriendData ? (selectedFriendData.name || selectedFriendData.email?.split("@")[0] || "Usuario de Poptok") : "Cargando..."}
              </span>
            </div>
          </>
        ) : (
          <h2>Bandeja de entrada</h2>
        )}
        <button onClick={closeChat} className="close-button">
          <AiOutlineClose size={20} />
        </button>
      </div>

      {/* Tab Navigation (only when no friend is selected) */}
      {!selectedFriend && (
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0,0,0,0.2)" }}>
          <button
            onClick={() => setActiveTab("messages")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: activeTab === "messages" ? "#ff0050" : "#aaa",
              fontWeight: "bold",
              padding: "12px",
              cursor: "pointer",
              borderBottom: activeTab === "messages" ? "2px solid #ff0050" : "none",
              fontSize: "14px",
              transition: "all 0.3s"
            }}
          >
            Mensajes
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: activeTab === "activity" ? "#ff0050" : "#aaa",
              fontWeight: "bold",
              padding: "12px",
              cursor: "pointer",
              borderBottom: activeTab === "activity" ? "2px solid #ff0050" : "none",
              fontSize: "14px",
              transition: "all 0.3s",
              position: "relative"
            }}
          >
            Actividad
            {activityNotifications.some(n => !n.read && n.type !== "purchase") && (
              <span style={{
                position: "absolute",
                top: "10px",
                right: "30%",
                background: "#ff0050",
                width: "6px",
                height: "6px",
                borderRadius: "50%"
              }} />
            )}
          </button>
        </div>
      )}

      {/* ─── Friends List View (No Friend Selected - Messages Tab) ─────────────────── */}
      {!selectedFriend && activeTab === "messages" && (
        <div className="chat-inbox-view">
          <div className="chat-search-bar">
            <FiSearch className="chat-search-icon" size={16} />
            <input
              type="text"
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="chat-friends-list">
            {filteredFriends.length === 0 ? (
              <div className="chat-empty-friends">
                <p>No se encontraron amigos</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="chat-friend-item"
                  onClick={() => setSelectedFriend(friend.id)}
                >
                  <Avatar src={friend.profilePic} name={friend.name || friend.email?.split("@")[0] || "Usuario"} />
                  <div className="chat-friend-info">
                    <h4>{friend.name || friend.email?.split("@")[0] || "Usuario de Poptok"}</h4>
                    <p>@{friend.email?.split("@")[0] || "poptok"}</p>
                  </div>
                  <div className="chat-friend-action">
                    <span className="chat-arrow-go">💬</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Activity Log View (No Friend Selected - Activity Tab) ─────────────────── */}
      {!selectedFriend && activeTab === "activity" && (
        <div className="chat-inbox-view" style={{ overflowY: "auto", maxHeight: "calc(100% - 110px)", padding: "10px" }}>
          {activityNotifications.filter(n => n.type !== "purchase").length === 0 ? (
            <div className="chat-empty-friends" style={{ padding: "40px 20px" }}>
              <p>No hay actividad reciente</p>
            </div>
          ) : (
            activityNotifications.filter(n => n.type !== "purchase").map((notif) => {
              let notifText = "";
              let icon = "🔔";
              if (notif.type === "like") {
                notifText = `le dio me gusta a tu video "${notif.videoTitle || ""}"`;
                icon = "❤️";
              } else if (notif.type === "favorite") {
                notifText = `agregó tu video "${notif.videoTitle || ""}" a favoritos`;
                icon = "⭐";
              } else if (notif.type === "share") {
                notifText = `compartió tu video "${notif.videoTitle || ""}"`;
                icon = "🔗";
              } else if (notif.type === "download") {
                notifText = `descargó tu video "${notif.videoTitle || ""}"`;
                icon = "📥";
              } else if (notif.type === "branded_offer") {
                notifText = `te envió una propuesta de contenido patrocinado: "${notif.campaignTitle || ""}" por $${notif.offerAmount} USD`;
                icon = "🏢";
              }
              
              return (
                <div
                  key={notif.id}
                  className="chat-friend-item"
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    background: notif.read ? "transparent" : "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    marginBottom: "5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "default"
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      @{notif.senderName}
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#ccc", wordBreak: "break-word" }}>
                      {notifText}
                    </p>
                    <span style={{ fontSize: "10px", color: "#777", marginTop: "4px", display: "inline-block" }}>
                      {notif.timestamp ? new Date(notif.timestamp).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </span>
                  </div>
                  {notif.type === "branded_offer" && notif.status === "pending" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", flexShrink: 0 }}>
                      <button
                        onClick={async () => {
                          try {
                            const notifRef = doc(db, "activity_notifications", notif.id);
                            await updateDoc(notifRef, { status: "accepted" });
                            alert("¡Propuesta de patrocinio aceptada!");
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{
                          background: "#25D366",
                          border: "none",
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const notifRef = doc(db, "activity_notifications", notif.id);
                            await updateDoc(notifRef, { status: "declined" });
                            alert("Propuesta declinada.");
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{
                          background: "#ff0050",
                          border: "none",
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Declinar
                      </button>
                    </div>
                  )}
                  {notif.type === "branded_offer" && notif.status && notif.status !== "pending" && (
                    <span style={{
                      fontSize: "10px",
                      color: notif.status === "accepted" ? "#25D366" : "#ff0050",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      flexShrink: 0
                    }}>
                      {notif.status === "accepted" ? "Aceptado" : "Declinado"}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Chat Thread View (Friend Selected) ─────────────────────────────── */}
      {selectedFriend && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty-thread">
                <p>Envía un mensaje para comenzar la conversación 👋</p>
              </div>
            )}
            {messages.map((msg) => {
              const isSentByMe = msg.senderId === user.uid;
              const isSystem = msg.text.startsWith("🎁");
              return (
                <div key={msg.id} className={`message-wrapper ${isSentByMe ? "sent" : "received"} ${isSystem ? "system" : ""}`}>
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                    <span className="message-time">
                      {msg.timestamp ? new Date(msg.timestamp.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (Coins + Sharing) */}
           <div className="chat-quick-actions">
            <button
              onClick={handleSendCoin}
              className="chat-coin-gift-btn"
              disabled={coinBalance <= 0 || transferringCoin || userStatus === "restricted"}
            >
              <FiGift size={14} /> Enviar Coin ({coinBalance})
            </button>
            <select
              className="chat-share-video-select"
              disabled={userStatus === "restricted"}
              onChange={(e) => {
                if (e.target.value) {
                  handleSendMessage(`¡Mira este video! 🎥 ${e.target.value}`);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Compartir video...</option>
              {videos.map((vid) => (
                <option key={vid.id} value={vid.fileUrl}>
                  {vid.description ? vid.description.substring(0, 20) + "..." : `Video #${vid.id.substring(0, 4)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-container">
            <div className="emoji-picker-wrapper">
              <button className="emoji-toggle-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
              {showEmojiPicker && (
                <div className="emoji-picker-box">
                  <EmojiPicker
                    onEmojiClick={(emoji) => setMessage(prev => prev + emoji.emoji)}
                    width={280}
                    height={350}
                  />
                </div>
              )}
            </div>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={userStatus === "restricted" ? "Tu cuenta está restringida..." : "Escribe un mensaje..."}
              maxLength={400}
              onKeyDown={(e) => { if (e.key === "Enter" && userStatus !== "restricted") handleSendMessage(); }}
              disabled={userStatus === "restricted"}
            />
            <button 
              className={`chat-send-btn ${message.trim() && userStatus !== "restricted" ? "active" : ""}`} 
              onClick={() => handleSendMessage()} 
              disabled={!message.trim() || userStatus === "restricted"}
            >
              <BsSend size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
