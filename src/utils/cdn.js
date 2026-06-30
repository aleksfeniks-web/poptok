export const getCDNUrl = (url) => {
  if (!url) return "";

  // Obtener la URL del CDN configurada en variables de entorno
  const cdnUrl = import.meta.env.VITE_CDN_URL;
  if (cdnUrl) {
    // Si es una URL de Firebase Storage, reescribirla con el dominio del CDN
    if (url.includes("firebasestorage.googleapis.com")) {
      return url.replace("https://firebasestorage.googleapis.com", cdnUrl);
    }
    // Si es una URL de AWS S3, reescribirla con el dominio del CDN
    if (url.includes(".s3.us-east-2.amazonaws.com")) {
      return url.replace(/https:\/\/[a-zA-Z0-9.-]+\.s3\.[a-zA-Z0-9-]+\.amazonaws\.com/, cdnUrl);
    }
  }

  return url;
};
