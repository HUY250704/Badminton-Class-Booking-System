import asyncHandler from 'express-async-handler';
import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/ApiError.js';

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(501, 'Cloudinary upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.', 'CLOUDINARY_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
}

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export const uploadImage = asyncHandler(async (req, res) => {
  configureCloudinary();
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file', 'VALIDATION_ERROR', ['image']);
  }

  const folderName = ['avatars', 'classes', 'coaches'].includes(req.body.folder)
    ? req.body.folder
    : 'uploads';
  const result = await uploadBuffer(req.file.buffer, `lin-badminton/${folderName}`);

  res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id
  });
});
