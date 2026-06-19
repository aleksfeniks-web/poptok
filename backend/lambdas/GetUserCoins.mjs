export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  try {
    // Obtener UID de la solicitud
    const uid = event.queryStringParameters?.uid;
    if (!uid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Falta el parámetro uid" }),
      };
    }

    // Llamada a DynamoDB (ejemplo)
    const userCoins = 10; // Aquí iría la lógica para obtener las monedas desde DynamoDB

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ coins: userCoins }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error al obtener monedas", error: error.message }),
    };
  }
};
