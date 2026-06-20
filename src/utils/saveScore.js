import { db } from "../firebase.js";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const saveScore = async (uid, score, coinsEarned) => {
  console.log(`[saveScore] Saving score for user ${uid}: score = ${score}, coinsEarned = ${coinsEarned}`);
  try {
    if (!uid) return false;
    const userRef = doc(db, "users", uid);
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const currentCoins = data.coins || 0;
      const coinCounts = data.coinCounts || {
        coin_1: currentCoins,
        coin_2: 0,
        coin_3: 0,
        coin_4: 0,
        coin_5: 0,
        coin_6: 0
      };
      
      coinCounts.coin_1 = (coinCounts.coin_1 || 0) + coinsEarned;

      await updateDoc(userRef, {
        coins: currentCoins + coinsEarned,
        coinCounts: coinCounts,
        highScore: Math.max(data.highScore || 0, score)
      });
    } else {
      await setDoc(userRef, {
        coins: coinsEarned,
        coinCounts: {
          coin_1: coinsEarned,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        },
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
