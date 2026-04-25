import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer.
 * @param {string} folder - Cloudinary folder name.
 * @returns {Promise<string>} - The secure URL of the uploaded image.
 */
export async function uploadBuffer(buffer, folder = 'projects') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
