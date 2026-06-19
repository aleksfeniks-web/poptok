import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "us-east-2" });
const dynamoDB = new DynamoDBClient({ region: "us-east-2" });
const BUCKET_NAME = "mybucketvideos";

export const handler = async (event) => {
    try {
        console.log("Evento recibido:", JSON.stringify(event, null, 2));

        // ✅ Validar que el contenido no esté vacío
        if (!event.body) {
            throw new Error("El cuerpo de la solicitud está vacío.");
        }

        // ✅ Extraer información del evento (multipart/form-data)
        const boundary = event.headers["Content-Type"].split("boundary=")[1];
        const parts = event.body.split(`--${boundary}`);

        // ✅ Obtener el archivo binario del video
        const filePart = parts.find((part) => part.includes("Content-Type: video/"));
        const fileData = filePart.split("\r\n\r\n")[1];
        const fileBuffer = Buffer.from(fileData, "binary");

        // ✅ Generar nombre del archivo
        const videoKey = `videos/${uuidv4()}.mp4`;
        const tempInputPath = path.join(os.tmpdir(), "input.mp4");
        const tempOutputPath = path.join(os.tmpdir(), "output.mp4");

        // ✅ Guardar el archivo en un directorio temporal
        fs.writeFileSync(tempInputPath, fileBuffer);

        console.log("Procesando video con FFmpeg...");

        // ✅ Usar FFmpeg para convertir a 720p
        execSync(
            `ffmpeg -i ${tempInputPath} -vf "scale=1280:720" -preset fast -c:v libx264 -c:a aac ${tempOutputPath}`
        );

        console.log("✅ Video procesado con éxito!");

        // ✅ Subir el video procesado a S3
        const processedFileBuffer = fs.readFileSync(tempOutputPath);
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: videoKey,
                Body: processedFileBuffer,
                ContentType: "video/mp4",
            })
        );

        console.log("✅ Video subido exitosamente!");

        // ✅ Generar URL del video en S3
        const videoUrl = `https://${BUCKET_NAME}.s3.us-east-2.amazonaws.com/${videoKey}`;

        // ✅ Guardar la metadata en DynamoDB
        await dynamoDB.send(
            new PutItemCommand({
                TableName: "videos",
                Item: {
                    riuzaki1234: { S: uuidv4() },
                    videoUrl: { S: videoUrl },
                    fileName: { S: videoKey },
                    createdAt: { S: new Date().toISOString() },
                },
            })
        );

        console.log("✅ Metadata guardada en DynamoDB!");

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "Video procesado y subido con éxito!", url: videoUrl }),
        };
    } catch (error) {
        console.error("❌ Error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Error al subir el video", error: error.message }),
        };
    }
};
