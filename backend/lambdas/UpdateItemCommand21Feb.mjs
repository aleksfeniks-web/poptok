import {
    DynamoDBClient,
    UpdateItemCommand,
  } from "@aws-sdk/client-dynamodb";
  
  const client = new DynamoDBClient({ region: "us-east-2" });
  
  export const handler = async (event) => {
    console.log("Evento recibido:", JSON.stringify(event, null, 2));
  
    // Manejo de solicitudes OPTIONS (CORS)
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: "",
      };
    }
  
    try {
      if (!event.body) throw new Error("El cuerpo de la solicitud está vacío.");
      const body = JSON.parse(event.body);
  
      // Extrae los campos que podrían llegar
      const {
        riuzaki1234,
        likes,
        comments,
        favorites,
        coins,
      } = body;
  
      if (!riuzaki1234) {
        throw new Error("Falta riuzaki1234 (Primary Key).");
      }
  
      // 1) Actualizar tabla 'videos' (si vienen likes/comments/favorites)
      if (
        likes !== undefined ||
        comments !== undefined ||
        favorites !== undefined
      ) {
        // Valida que no estén vacíos antes de actualizar
        const safeLikes = likes === undefined ? 0 : likes;
        const safeComments = comments === undefined ? 0 : comments;
        const safeFavorites = favorites === undefined ? 0 : favorites;
  
        console.log("Actualizando tabla 'videos'...");
        const paramsVideos = {
          TableName: "videos",
          Key: { riuzaki1234: { S: riuzaki1234 } },
          UpdateExpression:
            "SET likes = :likes, comments = :comments, favorites = :favorites",
          ExpressionAttributeValues: {
            ":likes": { N: String(safeLikes) },
            ":comments": { N: String(safeComments) },
            ":favorites": { N: String(safeFavorites) },
          },
          ReturnValues: "UPDATED_NEW",
        };
  
        const commandVideos = new UpdateItemCommand(paramsVideos);
        const resultVideos = await client.send(commandVideos);
        console.log("Tabla 'videos' actualizada:", resultVideos);
      }
  
      // 2) Actualizar tabla 'usuarios' (si viene coins)
      if (coins !== undefined) {
        console.log("Actualizando tabla 'usuarios'...");
        const paramsUsuarios = {
          TableName: "usuarios",
          Key: { riuzaki1234: { S: riuzaki1234 } },
          UpdateExpression: "SET coins = :coinsVal",
          ExpressionAttributeValues: {
            ":coinsVal": { N: String(coins) },
          },
          ReturnValues: "UPDATED_NEW",
        };
  
        const commandUsuarios = new UpdateItemCommand(paramsUsuarios);
        const resultUsuarios = await client.send(commandUsuarios);
        console.log("Tabla 'usuarios' actualizada:", resultUsuarios);
      }
  
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Actualización exitosa en las tablas correspondientes.",
        }),
      };
    } catch (error) {
      console.error("Error al actualizar las interacciones:", error);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin":
            "*",
          "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Error al actualizar las interacciones",
          error: error.message,
        }),
      };
    }
  };
