import "../index.css";
import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { BsFillPersonFill, BsSend } from "react-icons/bs";
import { FiCoffee } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import { auth, db } from "../firebase.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from "firebase/firestore";

const Chat = ({ closeChat, coinBalance, sendCoin, videos, unreadMessages, setUnreadMessages }) => {
  const [message, setMessage] = useState(""); // Estado del mensaje actual
  const [messages, setMessages] = useState([]); // Estado de mensajes en pantalla
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Estado para mostrar emojis
  const [friends, setFriends] = useState([]); // ✅ Lista de amigos
  const [selectedFriend, setSelectedFriend] = useState(""); // ✅ Usuario seleccionado como destinatario

  const user = auth.currentUser; 

  // ✅ Obtener la lista de amigos desde Firestore
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const friendsRef = collection(db, "users"); // 📌 Los usuarios están en `users`
        const friendsSnapshot = await getDocs(friendsRef);
        
        const friendsList = friendsSnapshot.docs
          .filter(doc => doc.id !== user.uid) // 📌 Excluye al usuario actual
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        setFriends(friendsList);
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user]);

  // ✅ Cargar mensajes desde Firestore
  useEffect(() => {
    if (!user || !selectedFriend) return;
    
    try {
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("receiverId", "in", [user.uid, selectedFriend]),
        where("senderId", "in", [user.uid, selectedFriend]),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(loadedMessages);

        // ✅ Detectar mensajes no leídos
        const unread = loadedMessages.some(msg => !msg.read && msg.receiverId === user.uid);
        if (setUnreadMessages) setUnreadMessages(unread);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error subscribing to messages:", error);
    }
  }, [user, selectedFriend, setUnreadMessages]);

  // ✅ Enviar mensaje
  const handleSendMessage = async () => {
    if (!message.trim() || !user || !selectedFriend) return;

    try {
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        receiverId: selectedFriend,
        text: message,
        timestamp: new Date(),
        read: false, // 📌 Marcar como no leído
      });

      setMessage(""); // ✅ Limpiar el input después de enviar
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  // ✅ Marcar mensajes como leídos al abrir el chat
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

  return (
    <div className="chat-container">
      {/* Encabezado del chat */}
      <div className="chat-header">
        <h2>Chat</h2>
        <button onClick={closeChat} className="close-button">
          <AiOutlineClose size={24} />
        </button>
      </div>

      {/* Selector de usuario */}
      <div className="friend-selector">
        <label>Enviar a:</label>
        <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
          <option value="">Selecciona un amigo</option>
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.name || friend.email} {/* ✅ Mostrar nombre o email del amigo */}
            </option>
          ))}
        </select>
      </div>

      {/* Área de mensajes */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.senderId === user.uid ? "sent" : "received"}`}>
            <img src="https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png" alt="Usuario" />
            <div className="message-content">
              <h4>{msg.senderId === user.uid ? "Tú" : "Amigo"}</h4>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Entrada de texto y selector de emojis */}
      <div className="chat-input">
        <div className="emoji-container">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              <EmojiPicker onEmojiClick={(emoji) => setMessage(message + emoji.emoji)} />
            </div>
          )}
        </div>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={!selectedFriend} // ✅ Deshabilitar si no hay amigo seleccionado
        />
        <button onClick={handleSendMessage} disabled={!selectedFriend}>
          <BsSend size={20} />
        </button>
      </div>

      {/* Acciones adicionales (enviar coin y seleccionar video) */}
      <div className="chat-actions">
        <button
          onClick={() => {
            if (coinBalance > 0) {
              sendCoin();
            }
          }}
          disabled={coinBalance <= 0 || !selectedFriend}
        >
          Enviar Coin ({coinBalance})
        </button>
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleSendMessage(`Mira este video: ${e.target.value}`);
            }
          }}
          disabled={!selectedFriend}
        >
          <option value="">Selecciona un video</option>
          {videos && videos.map((video, index) => (
            <option key={index} value={video.url}>{video.title || `Video ${index + 1}`}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Chat;
