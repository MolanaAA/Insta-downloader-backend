const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { extractVideoUrl, CONFIG, extractInstagramVideoWithPuppeteer } = require('./apiHelpers');

cloudinary.config({
  cloud_name: 'dgn6w4tyy',
  api_key: '116156825473626',
  api_secret: '6JLqdbYyQrRBEFE-IGZdY_OTrBU',
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Using CONFIG imported from apiHelpers.js

// Main API endpoint - Cloudinary upload only
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('instagram.com')) {
      console.log('❌ Invalid URL provided:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }
    
    console.log('🚀 Starting video extraction process...');
    console.log('📱 Instagram URL:', url);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    let videoUrl = null;
    let lastError = null;
    
    // Retry logic with detailed logging
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`\n🔄 Attempt ${attempt}/${CONFIG.MAX_RETRIES}`);
        
        if (attempt > 1) {
          const retryDelay = CONFIG.RETRY_DELAY * attempt;
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        console.log('🔍 Extracting video URL...');
        videoUrl = await extractVideoUrl(url);
        
        if (videoUrl) {
          console.log('✅ Video URL extracted successfully!');
          console.log('🔗 Video URL:', videoUrl);
          break;
        } else {
          console.log('❌ Video URL extraction failed');
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
      }
    }
    
    if (!videoUrl) {
      console.log('💥 All extraction attempts failed');
      return res.status(404).json({ 
        error: `Failed to extract video URL after ${CONFIG.MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}` 
      });
    }
    
    // Upload to Cloudinary
    console.log('\n☁️ Starting Cloudinary upload...');
    console.log('📤 Downloading video to buffer first...');
    
    let videoResponse;
    try {
      // Download video to buffer first
      videoResponse = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': 'https://www.instagram.com/',
          'Origin': 'https://www.instagram.com'
        },
        timeout: 60000,
        maxRedirects: 5
      });
    } catch (downloadError) {
      console.log('❌ Direct CDN download failed:', downloadError.message);
      if (downloadError.response?.status === 403) {
        console.log('🔒 403 Forbidden - CDN requires session authentication');
        console.log('🔄 This is expected for Instagram CDN URLs with session tokens');
        throw new Error('Instagram CDN access denied. This URL requires session authentication and cannot be accessed directly. Try using the Puppeteer endpoint instead.');
      }
      throw downloadError;
    }
    
    console.log('✅ Video downloaded to buffer');
    console.log('📊 Buffer size:', (videoResponse.data.length / 1024 / 1024).toFixed(2), 'MB');
    
    // Convert buffer to base64 for Cloudinary upload
    const videoBuffer = Buffer.from(videoResponse.data);
    const base64Video = videoBuffer.toString('base64');
    const dataURI = `data:video/mp4;base64,${base64Video}`;
    
    console.log('📤 Uploading buffer to Cloudinary...');
    
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'video',
      folder: 'instagram-videos',
      public_id: `instagram_video_${Date.now()}`,
      overwrite: true,
      invalidate: true
    });
    
    console.log('✅ Cloudinary upload successful!');
    console.log('📊 Upload Details:');
    console.log('   - Cloudinary URL:', uploadResult.secure_url);
    console.log('   - Public ID:', uploadResult.public_id);
    console.log('   - Format:', uploadResult.format);
    console.log('   - Duration:', uploadResult.duration, 'seconds');
    console.log('   - Size:', (uploadResult.bytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('   - Width:', uploadResult.width, 'px');
    console.log('   - Height:', uploadResult.height, 'px');
    console.log('   - Created at:', uploadResult.created_at);
    
    res.json({ 
      success: true, 
      originalVideoUrl: videoUrl,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      format: uploadResult.format,
      duration: uploadResult.duration,
      size: uploadResult.bytes,
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height
      },
      createdAt: uploadResult.created_at,
      message: 'Video extracted and uploaded to Cloudinary successfully!' 
    });
    
  } catch (error) {
    console.error('💥 API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced API endpoint with Puppeteer fallback
app.post('/api/download-puppeteer', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('instagram.com')) {
      console.log('❌ Invalid URL provided:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }
    
    console.log('🚀 Starting video extraction with Puppeteer fallback...');
    console.log('📱 Instagram URL:', url);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    let videoUrl = null;
    let lastError = null;
    let extractionMethod = '';
    
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`\n🔄 Attempt ${attempt}/${CONFIG.MAX_RETRIES}`);
        
        if (attempt > 1) {
          const retryDelay = CONFIG.RETRY_DELAY * attempt;
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        // Try Puppeteer first (more reliable for session-based URLs)
        console.log('🤖 Trying Puppeteer extraction...');
        const puppeteerResult = await extractInstagramVideoWithPuppeteer(url);
        
        if (puppeteerResult && puppeteerResult.videoBuffer) {
          extractionMethod = 'Puppeteer';
          console.log('✅ Puppeteer extraction successful!');
          
          // Upload the video buffer directly to Cloudinary
          console.log('\n☁️ Starting Cloudinary upload from Puppeteer buffer...');
          console.log('📊 Buffer size:', (puppeteerResult.videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');
          
          // Convert buffer to base64 for Cloudinary upload
          const base64Video = puppeteerResult.videoBuffer.toString('base64');
          const dataURI = `data:video/mp4;base64,${base64Video}`;
          
          console.log('📤 Uploading buffer to Cloudinary...');
          
          const uploadResult = await cloudinary.uploader.upload(dataURI, {
            resource_type: 'video',
            folder: 'instagram-videos',
            public_id: `instagram_video_${Date.now()}`,
            overwrite: true,
            invalidate: true
          });
          
          console.log('✅ Cloudinary upload successful!');
          console.log('📊 Upload Details:');
          console.log('   - Cloudinary URL:', uploadResult.secure_url);
          console.log('   - Public ID:', uploadResult.public_id);
          console.log('   - Format:', uploadResult.format);
          console.log('   - Duration:', uploadResult.duration, 'seconds');
          console.log('   - Size:', (uploadResult.bytes / 1024 / 1024).toFixed(2), 'MB');
          console.log('   - Width:', uploadResult.width, 'px');
          console.log('   - Height:', uploadResult.height, 'px');
          console.log('   - Created at:', uploadResult.created_at);
          
          res.json({ 
            success: true, 
            originalVideoUrl: puppeteerResult.videoUrl,
            extractionMethod: extractionMethod,
            cloudinaryUrl: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            format: uploadResult.format,
            duration: uploadResult.duration,
            size: uploadResult.bytes,
            dimensions: {
              width: uploadResult.width,
              height: uploadResult.height
            },
            createdAt: uploadResult.created_at,
            message: 'Video extracted and uploaded to Cloudinary successfully!' 
          });
          return;
        } else {
          console.log('❌ Puppeteer extraction failed, trying standard extraction...');
          videoUrl = await extractVideoUrl(url);
          
          if (videoUrl) {
            extractionMethod = 'Standard API';
            console.log('✅ Standard extraction successful!');
            break;
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
      }
    }
    
    if (!videoUrl) {
      console.log('💥 All extraction attempts failed');
      return res.status(404).json({ 
        error: `Failed to extract video URL after ${CONFIG.MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}` 
      });
    }
    
    console.log('🔗 Video URL:', videoUrl);
    console.log('🎯 Extraction method:', extractionMethod);
    
    // Upload to Cloudinary
    console.log('\n☁️ Starting Cloudinary upload...');
    console.log('📤 Downloading video to buffer first...');
    
    // Download video to buffer first
    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      },
      timeout: 60000,
      maxRedirects: 5
    });
    
    console.log('✅ Video downloaded to buffer');
    console.log('📊 Buffer size:', (videoResponse.data.length / 1024 / 1024).toFixed(2), 'MB');
    
    // Convert buffer to base64 for Cloudinary upload
    const videoBuffer = Buffer.from(videoResponse.data);
    const base64Video = videoBuffer.toString('base64');
    const dataURI = `data:video/mp4;base64,${base64Video}`;
    
    console.log('📤 Uploading buffer to Cloudinary...');
    
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'video',
      folder: 'instagram-videos',
      public_id: `instagram_video_${Date.now()}`,
      overwrite: true,
      invalidate: true
    });
    
    console.log('✅ Cloudinary upload successful!');
    console.log('📊 Upload Details:');
    console.log('   - Cloudinary URL:', uploadResult.secure_url);
    console.log('   - Public ID:', uploadResult.public_id);
    console.log('   - Format:', uploadResult.format);
    console.log('   - Duration:', uploadResult.duration, 'seconds');
    console.log('   - Size:', (uploadResult.bytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('   - Width:', uploadResult.width, 'px');
    console.log('   - Height:', uploadResult.height, 'px');
    console.log('   - Created at:', uploadResult.created_at);
    
    res.json({ 
      success: true, 
      originalVideoUrl: videoUrl,
      extractionMethod: extractionMethod,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      format: uploadResult.format,
      duration: uploadResult.duration,
      size: uploadResult.bytes,
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height
      },
      createdAt: uploadResult.created_at,
      message: 'Video extracted and uploaded to Cloudinary successfully!' 
    });
    
  } catch (error) {
    console.error('💥 Puppeteer API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested at:', new Date().toISOString());
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cloudinary: {
      cloud_name: 'dgn6w4tyy',
      status: 'Configured'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Instagram Video Downloader Server Started!');
  console.log('📍 Server running on port:', PORT);
  console.log('🏥 Health check:', `http://localhost:${PORT}/api/health`);
  console.log('📥 Download endpoint:', `http://localhost:${PORT}/api/download`);
  console.log('🤖 Puppeteer endpoint:', `http://localhost:${PORT}/api/download-puppeteer`);
  console.log('☁️ Cloudinary: Configured (cloud_name: dgn6w4tyy)');
  console.log('⏰ Started at:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}); 