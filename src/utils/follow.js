import { db, auth } from "../firebase.js";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";

// ✅ Obtener la lista de seguidos del usuario actual
export const getFollowingList = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data().following || [] : [];
  } catch (error) {
    console.error("❌ Error al obtener lista de seguidos:", error);
    return [];
  }
};

// ✅ Seguir o dejar de seguir a un usuario (Actualizar `following` y `followers`)
export const toggleFollow = async (targetUserId) => {
  const user = auth.currentUser;
  if (!user || user.uid === targetUserId) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const targetUserRef = doc(db, "users", targetUserId);

    const userSnap = await getDoc(userRef);
    const targetSnap = await getDoc(targetUserRef);

    if (!userSnap.exists() || !targetSnap.exists()) {
      console.warn("⚠ Usuario o seguido no encontrado en Firestore.");
      return false;
    }

    const isFollowing = userSnap.data().following?.includes(targetUserId);

    // ✅ Actualizar la lista de "following" en el usuario actual
    await updateDoc(userRef, {
      following: isFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId),
    });

    // ✅ Actualizar la lista de "followers" en el usuario seguido
    await updateDoc(targetUserRef, {
      followers: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });

    console.log(isFollowing ? `🚫 Dejaste de seguir a ${targetUserId}` : `✅ Ahora sigues a ${targetUserId}`);
    return !isFollowing;
  } catch (error) {
    console.error("❌ Error al seguir/dejar de seguir:", error);
    return false;
  }
};
