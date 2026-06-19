import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

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

    // 🔹 Obtener videos de DynamoDB
    const params = {
      TableName: "videos",
    };

    const data = await client.send(new ScanCommand(params));

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No se encontraron videos." }),
      };
    }

    // 🔹 Formatear la respuesta con valores por defecto si no existen
    const videos = data.Items.map((item) => ({
      riuzaki1234: item.riuzaki1234?.S || "",
      fileUrl: item.fileUrl?.S || "",
      fileKey: item.fileKey?.S || "",
      username: item.username?.S || "Desconocido",
      createdAt: item.createdAt?.S || "",
      description: item.description?.S || "Sin descripción", // ✅ Agregado
      interest: item.interest?.S || "Sin interés", // ✅ Agregado
      comments: item.comments?.L
        ? item.comments.L.map((c) => ({
            commentId: c.M.commentId?.S || "",
            text: c.M.text?.S || "",
            timestamp: c.M.timestamp?.S || "",
            userId: c.M.userId?.S || "",
         
          }))
        : [], // ✅ Si no hay comentarios, devolver un array vacío
      likes: item.likes?.N ? parseInt(item.likes.N) : 0, // ✅ Si no hay likes, devolver 0
      favorites: item.favorites?.N ? parseInt(item.favorites.N) : 0,
      coins: item.coins?.N ? parseInt(item.coins.N) : 0,
    }));

    console.log("✅ Videos recuperados correctamente:", JSON.stringify(videos, null, 2));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(videos),
    };

  } catch (error) {
    console.error("❌ Error en Lambda:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al obtener videos", error: error.message }),
    };
  }
};
