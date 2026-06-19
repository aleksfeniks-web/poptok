import { db } from "../firebase.js";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const saveScore = async (uid, score, coinsEarned) => {
  console.log(`[saveScore] Saving score for user ${uid}: score = ${score}, coinsEarned = ${coinsEarned}`);
  try {
    if (!uid) return false;
    const userRef = doc(db, "users", uid);
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentCoins = userSnap.data().coins || 0;
      await updateDoc(userRef, {
        coins: currentCoins + coinsEarned,
        highScore: Math.max(userSnap.data().highScore || 0, score)
      });
    } else {
      await setDoc(userRef, {
        coins: coinsEarned,
        highScore: score
      }, { merge: true });
    }
    
    console.log("✅ Coins rewarded and updated in Firestore successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error saving score / updating coins in Firestore:", error);
    return false;
  }
};
