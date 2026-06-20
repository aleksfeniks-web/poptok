import "../index.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AiOutlineClose, AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillPersonFill, BsSend } from "react-icons/bs";
import { FiCoffee, FiSearch, FiGift } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import { auth, db } from "../firebase.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc, getDocs, or, and } from "firebase/firestore";

const Chat = ({ closeChat, coinBalance, sendCoin, unreadMessages, setUnreadMessages, initialFriend }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(initialFriend || "");
  const [selectedFriendData, setSelectedFriendData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [transferringCoin, setTransferringCoin] = useState(false);

  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  // ─── Fetch friends (users) ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const friendsRef = collection(db, "users");
        const friendsSnapshot = await getDocs(friendsRef);
        const list = friendsSnapshot.docs
          .filter(doc => doc.id !== user.uid)
          .map(doc => ({ id: doc.id, ...doc.data() }));
        setFriends(list);
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user]);

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

      {/* ─── Friends List View (No Friend Selected) ─────────────────────────── */}
      {!selectedFriend && (
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
              disabled={coinBalance <= 0 || transferringCoin}
            >
              <FiGift size={14} /> Enviar Coin ({coinBalance})
            </button>
            <select
              className="chat-share-video-select"
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
              placeholder="Escribe un mensaje..."
              maxLength={400}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
            />
            <button className={`chat-send-btn ${message.trim() ? "active" : ""}`} onClick={() => handleSendMessage()} disabled={!message.trim()}>
              <BsSend size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
