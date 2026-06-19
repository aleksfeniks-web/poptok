const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: "us-east-2" });
const TABLE_NAME = "videos"; // ⚠️ Asegúrate de usar el nombre correcto de tu tabla en DynamoDB

exports.handler = async (event) => {
  try {
    // 📌 Obtener `uid` desde el query string
    const { uid } = event.queryStringParameters || {};

    if (!uid) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Se requiere un UID" }),
      };
    }

    console.log(`📥 Solicitando videos del usuario: ${uid}`);

    // 📌 Obtener videos del usuario desde DynamoDB
    const params = {
      TableName: videos,
      IndexName: "riuzaki1234", // ⚠️ Si usas un índice secundario global (GSI)
      KeyConditionExpression: "uid = :uid",
      ExpressionAttributeValues: {
        ":uid": uid,
      },
    };

    const result = await dynamoDB.query(params).promise();

    console.log(`✅ Videos obtenidos: ${JSON.stringify(result.Items)}`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // ✅ Permite solicitudes desde cualquier origen
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("❌ Error al obtener los videos:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
