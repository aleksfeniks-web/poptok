import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "us-east-2" });
const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

const allowedFileTypes = ["mp4", "mov", "avi"];

export const handler = async (event) => {
    try {
        // Verificar si el cuerpo de la solicitud está en formato base64
        const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;

        // Parsear el cuerpo de la solicitud (si es JSON)
        const { video, username } = JSON.parse(body || "{}");

        if (!video || !username) {
            throw new Error("Datos incompletos. Se requieren 'video' y 'username'.");
        }

        // Extraer el tipo de archivo del nombre del video
        const fileType = video.name.split(".").pop().toLowerCase();

        if (!allowedFileTypes.includes(fileType)) {
            throw new Error("Tipo de archivo no permitido.");
        }

        // Generar un nombre único para el video en S3
        const videoKey = `videos/${uuidv4()}.${fileType}`;

        console.log("Subiendo video a S3...");

        // Subir el video a S3
        await s3.send(
            new PutObjectCommand({
                Bucket: "mybucketvideos",
                Key: videoKey,
                Body: Buffer.from(video.data, "base64"), // Asegúrate de que el video esté en base64
                ContentType: `video/${fileType}`,
            })
        );

        console.log("Guardando en DynamoDB...");

        // Generar la URL del video en S3
        const videoUrl = `https://mybucketvideos.s3.us-east-2.amazonaws.com/${videoKey}`;

        // Guardar los metadatos en DynamoDB
        await dynamoDB.send(
            new PutItemCommand({
                TableName: "videos",
                Item: {
                    riuzaki1234: { S: uuidv4() }, // Asegúrate de que la clave primaria sea correcta
                    username: { S: username },
                    videoUrl: { S: videoUrl },
                    createdAt: { S: new Date().toISOString() },
                },
            })
        );

        console.log("Éxito!");

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            body: JSON.stringify({ message: "Video subido!", url: videoUrl }),
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            body: JSON.stringify({ message: "Error al subir el video", error: error.message }),
        };
    }
};
