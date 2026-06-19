import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler = async (event) => {
  // Define los headers CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Content-Type": "application/json",
  };

  console.log("📥 Evento recibido en Lambda:", JSON.stringify(event, null, 2));

  // Manejo de preflight (OPTIONS)
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === "OPTIONS") {
    console.log("🔹 Preflight OPTIONS request recibido");
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  try {
    if (!event.body) {
      throw new Error("❌ El cuerpo de la solicitud está vacío.");
    }

    // Manejo seguro del JSON del body
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
      throw new Error("❌ Error al parsear el body. Asegúrate de enviar un JSON válido.");
    }

    const { uid, coins } = body;

    if (!uid || coins === undefined) {
      throw new Error("❌ Parámetros faltantes: se requiere uid y coins.");
    }

    console.log("📌 Actualizando usuario:", uid, "con", coins, "coins");

    const params = {
      TableName: "usuarioscoin",
      Key: {
        uid: { S: uid },
      },
      UpdateExpression: "SET coins = :coins",
      ExpressionAttributeValues: {
        ":coins": { N: coins.toString() },
      },
      ReturnValues: "ALL_NEW",
    };

    const command = new UpdateItemCommand(params);
    const data = await dynamoDB.send(command);

    console.log("✅ Coins actualizados correctamente:", data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Coins actualizados correctamente",
        user: data.Attributes,
      }),
    };
  } catch (error) {
    console.error("❌ Error en Lambda:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Error al actualizar coins",
        error: error.message,
      }),
    };
  }
};
