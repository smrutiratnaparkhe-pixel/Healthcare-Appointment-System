const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

let supabase = null;

// Initialize Supabase if credentials are provided
if (config.supabase.url && config.supabase.serviceRoleKey && !config.supabase.url.includes('your-project-id')) {
  supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  realtime: {
    transport: ws
  }
});
  console.log('✅ Supabase Storage initialized');
}

/**
 * Upload a file to Supabase Storage (or fallback to local file system)
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original file name
 * @param {string} mimeType - File mime type
 * @param {string} folder - Destination folder (e.g., 'reports', 'doctors')
 * @returns {Promise<Object>} - Object containing the stored path
 */
async function uploadFile(fileBuffer, originalName, mimeType, folder = 'general') {
  // Sanitize filename
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${folder}/${uuidv4()}_${sanitizedName}`;

  if (!supabase) {
    // Local fallback
    const uploadDir = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const mockPath = `${folder}/${uuidv4()}_${sanitizedName}`;
    const filePath = path.join(__dirname, '../../uploads', mockPath);
    
    fs.writeFileSync(filePath, fileBuffer);
    
    return {
      storagePath: mockPath,
      storageUrl: null,
    };
  }

  // Upload to Supabase Storage bucket 'mediconnect' (or default 'storage')
  // Note: Assuming you have a bucket created called "medical-records" or similar. We will use 'medical-records'.
  const bucketName = 'medical-records';

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return {
    storagePath: data.path,
    storageUrl: null, // Private files don't have public URLs, we will use signed URLs
  };
}

/**
 * Get a signed URL for secure download
 * @param {string} storagePath - Path in Supabase storage
 * @param {number} expiresInMinutes - Minutes until expiration
 * @returns {Promise<string>} - The signed URL
 */
async function getSignedUrl(storagePath, expiresInMinutes = 30) {
  if (!supabase) {
    return `http://localhost:5000/api/reports/download-fallback/${encodeURIComponent(storagePath)}`;
  }

  const bucketName = 'medical-records';
  const expiresInSeconds = expiresInMinutes * 60;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error(`Failed to generate signed URL for ${storagePath}`, error);
    throw new Error('Could not generate download link');
  }

  return data.signedUrl;
}

/**
 * Delete file from Supabase Storage
 */
async function deleteFile(storagePath) {
  if (!supabase) {
    const filePath = path.join(__dirname, '../../uploads', storagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  const bucketName = 'medical-records';
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([storagePath]);

  if (error) {
    console.warn(`File not found for deletion or error: ${storagePath}`, error);
  }
}

module.exports = {
  uploadFile,
  getSignedUrl,
  deleteFile,
};
