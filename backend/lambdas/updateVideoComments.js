import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  try {
    console.log("📩 Evento recibido:", JSON.stringify(event, null, 2));

    // ✅ Manejo de preflight OPTIONS
    if (event.requestContext?.http?.method === "OPTIONS") {
      console.log("✅ Request OPTIONS detectado. Respondiendo con 200.");
      return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    // 🔹 Verificar que `event.body` existe
    if (!event.body) {
      throw new Error("El cuerpo de la solicitud está vacío.");
    }

    // 🔹 Parsear el cuerpo de la solicitud
    const requestBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;

    const parsedBody = JSON.parse(requestBody);
    const { riuzaki1234, comments, userId } = parsedBody;

    // 🔹 Validar datos de entrada
    if (!riuzaki1234 || !comments || !userId) {
      throw new Error("Faltan datos requeridos: riuzaki1234, comments o userId.");
    }

    if (!Array.isArray(comments) || comments.length === 0) {
      throw new Error("comments debe ser un array no vacío.");
    }

    const newComment = comments[0]; // Tomar solo el comentario nuevo

    if (!newComment.commentId || !newComment.text || !newComment.timestamp || !newComment.userId) {
      throw new Error("El comentario debe tener commentId, text, timestamp y userId.");
    }

    // 🔹 Asegurar que `text` es correcto y no el ID del video
    if (newComment.text.includes("uploads/")) {
      console.warn("🚨 `text` parece ser un nombre de archivo en lugar del comentario:", newComment.text);
    }

    // 🔹 Formatear el comentario para DynamoDB correctamente
    const dynamoFormattedComment = {
      M: {
        commentId: { S: newComment.commentId },
        text: { S: newComment.text },
        timestamp: { S: newComment.timestamp },
        userId: { S: newComment.userId },
        username: { S: newComment.username || "Anónimo" }, // Evitar valores nulos
      },
    };
    
    const params = {
      TableName: "videos",
      Key: { riuzaki1234: { S: riuzaki1234 } }, // Clave primaria
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :empty_list), :newComment)",
      ExpressionAttributeValues: {
        ":empty_list": { L: [] }, // Lista vacía en formato DynamoDB
        ":newComment": { L: [dynamoFormattedComment] }, // Agregar el comentario como un Mapa dentro de una Lista
      },
      ReturnValues: "ALL_NEW",
    };

    console.log("🔹 Ejecutando UpdateItemCommand con:", JSON.stringify(params, null, 2));

    // 🔹 Actualizar DynamoDB
    const result = await client.send(new UpdateItemCommand(params));
    console.log("✅ Comentario agregado en DynamoDB correctamente:", JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "✅ Comentario agregado con éxito", comment: newComment }),
    };
  } catch (error) {
    console.error("❌ Error en Lambda:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al agregar el comentario", error: error.message }),
    };
  }
};
