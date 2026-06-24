import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
if (!stripeSecretKey) {
  console.warn("⚠️ Advertencia: STRIPE_SECRET_KEY no está configurada en las variables de entorno.");
}

const stripe = new Stripe(stripeSecretKey);
const app = express();

app.use(cors());
app.use(express.json());

// Endpoint de prueba de salud
app.get("/", (req, res) => {
  res.send("Poptok Stripe Payment Gateway Backend is running.");
});

// Endpoint para crear el Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  const { amount, businessName } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Monto no válido o inexistente." });
  }

  try {
    // El monto debe convertirse a centavos (ej: $100 USD = 10000 centavos)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        businessName: businessName || "Empresa Poptok",
        app: "poptok"
      },
      payment_method_types: ["card"]
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    console.error("Error al crear PaymentIntent:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de pagos Poptok ejecutándose en http://localhost:${PORT}`);
});
