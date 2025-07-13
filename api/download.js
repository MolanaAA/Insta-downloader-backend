const { extractVideoUrl, CONFIG } = require('../server/apiHelpers');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url } = req.body;
  if (!url || !url.includes('instagram.com')) {
    res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    return;
  }

  let videoUrl = null;
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
      }
      videoUrl = await extractVideoUrl(url);
      if (videoUrl) break;
    } catch (error) {
      lastError = error;
      if (attempt === CONFIG.MAX_RETRIES) {
        res.status(500).json({ error: error.message });
        return;
      }
    }
  }

  if (!videoUrl) {
    res.status(404).json({ error: 'Could not find video URL in the Instagram post after multiple attempts.' });
    return;
  }

  try {
    // Download video as a buffer
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(response.data, 'binary');

    // Upload to Cloudinary
    cloudinary.uploader.upload_stream(
      { resource_type: 'video' },
      (error, result) => {
        if (error) {
          res.status(500).json({ error: 'Cloudinary upload failed', details: error });
        } else {
          res.status(200).json({ cloudinaryUrl: result.secure_url });
        }
      }
    ).end(videoBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 