import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler = async (event) => {
  const videoId = event.queryStringParameters?.videoId;

  if (!videoId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Falta el videoId" }),
    };
  }

  const params = {
    TableName: "videos",
    Key: { riuzaki1234: { S: videoId } },
    ProjectionExpression: "comments",
  };

  try {
    const result = await dynamoDB.send(new GetItemCommand(params));

    if (!result.Item || !result.Item.comments) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "OPTIONS, GET",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "No se encontraron comentarios" }),
      };
    }

    const comments = result.Item.comments.L.map((item) => ({
      id: item.M.commentId.S,
      text: item.M.text.S,
      timestamp: item.M.timestamp.S,
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comments }),
    };
  } catch (error) {
    console.error("❌ Error en Lambda:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Error al recuperar los comentarios", error: error.message }),
    };
  }
};
