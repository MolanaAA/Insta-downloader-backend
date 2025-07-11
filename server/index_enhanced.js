const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
fs.ensureDirSync(downloadsDir);

// Serve downloaded files
app.use('/downloads', express.static(downloadsDir));

// Advanced anti-detection configuration
const CONFIG = {
  MIN_DELAY: 2000,
  MAX_DELAY: 8000,
  MAX_REQUESTS_PER_MINUTE: 3,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000
};

// Session store and rate limiting
const sessionStore = new Map();
const rateLimitStore = new Map();

// Advanced browser fingerprinting
class BrowserFingerprint {
  constructor() {
    this.screenResolutions = [
      '1920x1080', '1366x768', '1536x864', '1440x900', '1280x720',
      '2560x1440', '1600x900', '1024x768', '1280x800', '1920x1200'
    ];
    this.languages = [
      'en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en-CA,en;q=0.9',
      'fr-FR,fr;q=0.9', 'de-DE,de;q=0.9', 'es-ES,es;q=0.9'
    ];
  }

  generate() {
    const screenRes = this.screenResolutions[Math.floor(Math.random() * this.screenResolutions.length)];
    const [width, height] = screenRes.split('x');
    const language = this.languages[Math.floor(Math.random() * this.languages.length)];
    
    return {
      screenWidth: parseInt(width),
      screenHeight: parseInt(height),
      language,
      platform: Math.random() > 0.5 ? 'Win32' : 'MacIntel',
      hardwareConcurrency: Math.random() > 0.5 ? 4 : 8,
      deviceMemory: Math.random() > 0.5 ? 4 : 8
    };
  }
}

// Enhanced user agent generator
class UserAgentGenerator {
  constructor() {
    this.chromeVersions = ['120.0.0.0', '119.0.0.0', '118.0.0.0', '117.0.0.0'];
    this.firefoxVersions = ['121.0', '120.0', '119.0', '118.0'];
    this.safariVersions = ['17.1', '17.0', '16.6', '16.5'];
  }

  generateChrome() {
    const version = this.chromeVersions[Math.floor(Math.random() * this.chromeVersions.length)];
    const platform = Math.random() > 0.5 ? 'Windows NT 10.0; Win64; x64' : 'Macintosh; Intel Mac OS X 10_15_7';
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
  }

  generateFirefox() {
    const version = this.firefoxVersions[Math.floor(Math.random() * this.firefoxVersions.length)];
    const platform = Math.random() > 0.5 ? 'Windows NT 10.0; Win64; x64; rv:109.0' : 'Macintosh; Intel Mac OS X 10.15; rv:109.0';
    return `Mozilla/5.0 (${platform}) Gecko/20100101 Firefox/${version}`;
  }

  generateSafari() {
    const version = this.safariVersions[Math.floor(Math.random() * this.safariVersions.length)];
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
  }

  generate() {
    const browsers = [
      () => this.generateChrome(),
      () => this.generateFirefox(),
      () => this.generateSafari()
    ];
    return browsers[Math.floor(Math.random() * browsers.length)]();
  }
}

// Session management
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.fingerprint = new BrowserFingerprint();
    this.userAgentGen = new UserAgentGenerator();
  }

  createSession() {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const fingerprint = this.fingerprint.generate();
    const userAgent = this.userAgentGen.generate();
    
    const session = {
      id: sessionId,
      fingerprint,
      userAgent,
      cookies: new Map(),
      createdAt: Date.now(),
      lastUsed: Date.now(),
      requestCount: 0
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && Date.now() - session.lastUsed < CONFIG.SESSION_TIMEOUT) {
      session.lastUsed = Date.now();
      session.requestCount++;
      return session;
    }
    return null;
  }

  updateCookies(sessionId, cookies) {
    const session = this.sessions.get(sessionId);
    if (session) {
      cookies.forEach(cookie => {
        const [name] = cookie.split('=');
        session.cookies.set(name, cookie);
      });
    }
  }

  getCookieString(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      return Array.from(session.cookies.values()).join('; ');
    }
    return '';
  }
}

// Rate limiting
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - 60000;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requests = this.requests.get(identifier);
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validRequests);
    
    if (validRequests.length >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    validRequests.push(now);
    return true;
  }
}

// Initialize managers
const sessionManager = new SessionManager();
const rateLimiter = new RateLimiter();

// Utility functions
function getRandomDelay() {
  return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY)) + CONFIG.MIN_DELAY;
}

function generateAdvancedHeaders(session, referer = 'https://www.instagram.com/') {
  const fingerprint = session.fingerprint;
  
  return {
    'User-Agent': session.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': fingerprint.language,
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Referer': referer,
    'DNT': '1',
    'X-IG-App-ID': '936619743392459',
    'X-IG-WWW-Claim': '0',
    'X-ASBD-ID': '129477',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Instagram-AJAX': '1006632969',
    'X-CSRFToken': 'missing',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': `"${fingerprint.platform === 'Win32' ? 'Windows' : 'macOS'}"`,
    'Cookie': sessionManager.getCookieString(session.id),
    'Viewport-Width': fingerprint.screenWidth.toString(),
    'Device-Memory': fingerprint.deviceMemory.toString()
  };
}

// Enhanced GraphQL extraction with session management
async function extractVideoUrlWithGraphQL(shortcode, session) {
  try {
    console.log('Trying enhanced GraphQL API approach for shortcode:', shortcode);
    
    const graphqlUrl = 'https://www.instagram.com/graphql/query/';
    const queryHash = '9f8827793ef34641b2fb195d4d41151c';
    
    const variables = {
      shortcode: shortcode,
      child_comment_count: 3,
      fetch_comment_count: 40,
      parent_comment_count: 24,
      has_threaded_comments: true
    };

    const params = new URLSearchParams({
      query_hash: queryHash,
      variables: JSON.stringify(variables)
    });

    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    
    const response = await axios.get(`${graphqlUrl}?${params}`, {
      headers,
      timeout: 15000,
      maxRedirects: 5
    });

    // Update cookies from response
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }

    console.log('GraphQL response status:', response.status);
    
    if (response.data && response.data.data && response.data.data.shortcode_media) {
      const media = response.data.data.shortcode_media;
      if (media.video_url) {
        console.log('Found video URL via GraphQL:', media.video_url);
        return media.video_url;
      }
    }
    
    return null;
  } catch (error) {
    console.log('GraphQL API approach failed:', error.message);
    return null;
  }
}

// Enhanced alternative API extraction
async function extractVideoUrlAlternative(shortcode, session) {
  try {
    console.log('Trying enhanced alternative extraction method for shortcode:', shortcode);
    
    const apiUrl = `https://www.instagram.com/api/v1/media/${shortcode}/info/`;
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    
    const response = await axios.get(apiUrl, {
      headers,
      timeout: 10000,
      maxRedirects: 5
    });

    // Update cookies from response
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }
    
    console.log('Alternative API response status:', response.status);
    
    if (response.data && response.data.items && response.data.items[0]) {
      const item = response.data.items[0];
      if (item.video_versions && item.video_versions.length > 0) {
        const videoVersions = item.video_versions.sort((a, b) => b.width - a.width);
        const videoUrl = videoVersions[0].url;
        console.log('Found video URL via alternative API:', videoUrl);
        return videoUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.log('Alternative API approach failed:', error.message);
    return null;
  }
}

// Enhanced mobile API extraction
async function extractVideoUrlMobile(shortcode, session) {
  try {
    const mobileUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
    console.log('Trying enhanced mobile embed URL:', mobileUrl);
    
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    
    const mobileResponse = await axios.get(mobileUrl, {
      headers,
      timeout: 10000
    });

    // Update cookies from response
    if (mobileResponse.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, mobileResponse.headers['set-cookie']);
    }
    
    const mobileHtml = mobileResponse.data;
    console.log('Mobile response status:', mobileResponse.status);
    
    // Look for video URL in mobile embed
    const mobileVideoMatch = mobileHtml.match(/src="([^"]*\.mp4[^"]*)"/);
    if (mobileVideoMatch) {
      const videoUrl = mobileVideoMatch[1];
      console.log('Found video URL in mobile embed:', videoUrl);
      return videoUrl;
    }
    
    return null;
  } catch (error) {
    console.log('Mobile API approach failed:', error.message);
    return null;
  }
}

// Enhanced main extraction function with session management
async function extractVideoUrl(instagramUrl) {
  try {
    console.log('Attempting to extract video URL from:', instagramUrl);
    
    // Create or get session
    const session = sessionManager.createSession();
    console.log('Using session:', session.id);
    
    // Rate limiting check
    if (!rateLimiter.isAllowed(session.id)) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }
    
    // Clean the URL
    const cleanUrl = instagramUrl.split('?')[0];
    console.log('Clean URL:', cleanUrl);
    
    // Extract shortcode
    const shortcodeMatch = cleanUrl.match(/\/reel\/([^\/]+)/);
    if (!shortcodeMatch) {
      throw new Error('Could not extract shortcode from Instagram URL');
    }
    const shortcode = shortcodeMatch[1];
    console.log('Extracted shortcode:', shortcode);
    
    // Add random delay to simulate human behavior
    const delay = getRandomDelay();
    console.log(`Waiting ${delay}ms before making requests...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Method 1: Enhanced GraphQL API
    const graphqlVideoUrl = await extractVideoUrlWithGraphQL(shortcode, session);
    if (graphqlVideoUrl) {
      return graphqlVideoUrl;
    }
    
    // Add delay between methods
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Method 2: Enhanced alternative API
    const alternativeVideoUrl = await extractVideoUrlAlternative(shortcode, session);
    if (alternativeVideoUrl) {
      return alternativeVideoUrl;
    }
    
    // Add delay between methods
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Method 3: Enhanced mobile API
    const mobileVideoUrl = await extractVideoUrlMobile(shortcode, session);
    if (mobileVideoUrl) {
      return mobileVideoUrl;
    }
    
    // Method 4: Enhanced direct page scraping
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    
    const response = await axios.get(cleanUrl, {
      headers,
      timeout: 15000,
      maxRedirects: 5
    });

    // Update cookies from response
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }

    console.log('Response status:', response.status);
    const html = response.data;
    console.log('HTML length:', html.length);

    // Enhanced pattern matching with multiple fallbacks
    const videoPatterns = [
      /"video_url":"([^"]+)"/,
      /"video_url":"([^"]*\\u0026[^"]*)"/,
      /"contentUrl":"([^"]*\.mp4[^"]*)"/,
      /"contentUrl":"([^"]*video[^"]*)"/,
      /"url":"([^"]*\.mp4[^"]*)"/,
      /"url":"([^"]*video[^"]*)"/,
      /video_url":"([^"]+)"/,
      /video_url":"([^"]*\\u0026[^"]*)"/,
      /"video_versions":\[[^\]]*"url":"([^"]+)"/,
      /"video_versions":\[[^\]]*"url":"([^"]*\\u0026[^"]*)"/
    ];

    for (const pattern of videoPatterns) {
      const match = html.match(pattern);
      if (match) {
        let videoUrl = match[1];
        videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
        console.log('Found video URL with pattern:', pattern, 'URL:', videoUrl);
        return videoUrl;
      }
    }

    // Enhanced Cheerio parsing
    const $ = cheerio.load(html);
    
    // Look for video tag
    const videoTag = $('video source').attr('src') || $('video').attr('src');
    if (videoTag) {
      console.log('Found video URL in video tag:', videoTag);
      return videoTag;
    }
    
    // Look for og:video meta tag
    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo) {
      console.log('Found video URL in og:video:', ogVideo);
      return ogVideo;
    }

    // Enhanced script parsing
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('video_url')) {
        const videoMatch = scriptContent.match(/"video_url":"([^"]+)"/);
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
          console.log('Found video URL in script:', videoUrl);
          return videoUrl;
        }
      }
    });

    // Final fallback: look for any video URL
    const videoUrlMatches = html.match(/https:\/\/[^"]*\.mp4[^"]*/g);
    if (videoUrlMatches && videoUrlMatches.length > 0) {
      console.log('Found potential video URLs:', videoUrlMatches);
      return videoUrlMatches[0];
    }

    console.log('No video URL found with any method');
    return null;

  } catch (error) {
    console.error('Error extracting video URL:', error.message);
    throw new Error(`Failed to extract video URL from Instagram: ${error.message}`);
  }
}

// Enhanced video download function
async function downloadVideo(videoUrl, filename) {
  try {
    console.log('Downloading video from:', videoUrl);
    
    const cleanVideoUrl = videoUrl.replace(/\\/g, '');
    console.log('Clean video URL:', cleanVideoUrl);
    
    // Create session for download
    const session = sessionManager.createSession();
    
    const response = await axios({
      method: 'GET',
      url: cleanVideoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': session.userAgent,
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': session.fingerprint.language,
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Range': 'bytes=0-'
      },
      timeout: 60000,
      maxRedirects: 5
    });

    const filePath = path.join(downloadsDir, filename);
    const writer = fs.createWriteStream(filePath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Video downloaded successfully to:', filePath);
        resolve(filePath);
      });
      writer.on('error', (err) => {
        console.error('Error writing file:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading video:', error.message);
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

// Enhanced API endpoint with retry logic
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    console.log('Processing URL:', url);
    
    let videoUrl = null;
    let lastError = null;
    
    // Retry logic with different sessions
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${CONFIG.MAX_RETRIES}`);
        
        // Add delay between retries
        if (attempt > 1) {
          const retryDelay = CONFIG.RETRY_DELAY * attempt;
          console.log(`Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        videoUrl = await extractVideoUrl(url);
        if (videoUrl) {
          break;
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt === CONFIG.MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    if (!videoUrl) {
      console.log('All extraction methods failed after retries');
      
      return res.status(404).json({ 
        error: 'Could not find video URL in the Instagram post after multiple attempts. This could be due to Instagram blocking the request, the post being private, or Instagram changing their page structure.',
        suggestions: [
          'Try with a different Instagram reel',
          'Make sure the post is public',
          'Wait a few minutes and try again',
          'Check if the URL is correct',
          'Instagram may be blocking automated requests',
          'Try using a different network or VPN'
        ]
      });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `instagram_reel_${timestamp}.mp4`;
    
    // Download video
    const filePath = await downloadVideo(videoUrl, filename);
    
    // Create download URL for the user
    const downloadUrl = `/downloads/${filename}`;
    
    res.json({
      success: true,
      message: 'Video downloaded successfully',
      filename: filename,
      filePath: filePath,
      downloadUrl: downloadUrl
    });
    
  } catch (error) {
    console.error('Download error:', error.message);
    
    let errorMessage = error.message;
    if (error.message.includes('ENOTFOUND')) {
      errorMessage = 'Network error: Could not connect to Instagram. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout: Instagram is taking too long to respond. Please try again.';
    } else if (error.message.includes('403')) {
      errorMessage = 'Access denied: Instagram is blocking the request. This is common with automated tools. Please try again later or use a different post.';
    } else if (error.message.includes('404')) {
      errorMessage = 'Post not found: The Instagram post might be private or deleted.';
    } else if (error.message.includes('Rate limit')) {
      errorMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      originalError: error.message
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Enhanced server running on port ${PORT}`);
  console.log(`Download directory: ${downloadsDir}`);
  console.log('Advanced anti-detection features enabled:');
  console.log('- Session management with browser fingerprinting');
  console.log('- Rate limiting and request delays');
  console.log('- Multiple extraction methods with retry logic');
  console.log('- Advanced headers and user agent rotation');
  console.log('- Cookie management and session persistence');
});
