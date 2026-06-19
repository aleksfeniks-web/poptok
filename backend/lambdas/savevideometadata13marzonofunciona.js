import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler = async (event) => {
    console.log("📥 Evento recibido:", JSON.stringify(event, null, 2));

    // 🔹 API Gateway HTTP API maneja el método en `event.routeKey`
    if (event.routeKey && event.routeKey.startsWith("OPTIONS")) {  
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            },
            body: ""
        };
    }

    try {
        let requestBody = event.body;
        if (event.isBase64Encoded) {
            requestBody = Buffer.from(event.body, "base64").toString("utf-8");
        }

        if (!requestBody) {
            throw new Error("El cuerpo de la solicitud está vacío.");
        }

        const { userId, fileKey, description,interest } = JSON.parse(requestBody);

        if (!userId || !fileKey || fileKey.trim() === "") {
            throw new Error("Faltan parámetros requeridos: userId o fileKey.");
        }

        const fileUrl = `https://mybucketvideos.s3.us-east-2.amazonaws.com/${fileKey}`;

        const command = new PutItemCommand({
            TableName: "videos",
            Item: {
                riuzaki1234: { S: fileKey },
                uid: { S: userId },
                fileKey: { S: fileKey },
                fileUrl: { S: fileUrl },
                createdAt: { S: new Date().toISOString() },
                comments: { L: [] },
                
               
            },

            if (description && description.trim() !== "") {
                Item.description = { S: description.trim() };
            }
    
            // ✅ Agregar interés solo si el usuario lo seleccionó
            if (interest && interest.trim() !== "") {
                Item.interest = { S: interest };
            }
            
        });

        await dynamoDB.send(command);
        console.log("✅ Video metadata guardada con éxito en DynamoDB!");

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: "✅ Video metadata guardada con éxito!" }),
        };
    } catch (error) {
        console.error("❌ Error al guardar metadata:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: "Error al guardar metadata", error: error.message }),
        };
    }
};
