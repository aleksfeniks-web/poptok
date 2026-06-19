import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });

export const handler = async (event) => {
    console.log("Evento recibido:", JSON.stringify(event, null, 2));

    // Manejo de solicitud OPTIONS para preflight
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method === 'OPTIONS') {
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
        const { riuzaki1234, likes, comments, favorites } = body;

        if (!riuzaki1234 || likes === undefined || comments === undefined || favorites === undefined) {
            throw new Error("Datos incompletos: se requieren riuzaki1234, likes, comments y favorites.");
        }

        console.log("Actualizando interacción en DynamoDB...");

        const params = {
            TableName: "videos",
            Key: { riuzaki1234: { S: riuzaki1234 } },
            UpdateExpression: "SET likes = :likes, comments = :comments, favorites = :favorites",
            ExpressionAttributeValues: {
                ":likes": { N: String(likes) },
                ":comments": { N: String(comments) },
                ":favorites": { N: String(favorites) },
            },
            ReturnValues: "UPDATED_NEW",
        };

        const command = new UpdateItemCommand(params);
        const result = await client.send(command);

        console.log("Actualización exitosa:", result);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "Interacción actualizada correctamente", result }),
        };
    } catch (error) {
        console.error("Error al actualizar la interacción:", error);

        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "Error al actualizar la interacción", error: error.message }),
        };
    }
};
