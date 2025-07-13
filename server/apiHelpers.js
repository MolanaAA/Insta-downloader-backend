const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

// Advanced anti-detection configuration
const CONFIG = {
  MIN_DELAY: 2000,
  MAX_DELAY: 8000,
  MAX_REQUESTS_PER_MINUTE: 3,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  USE_PROXIES: false,
  PROXY_LIST: []
};

class BrowserFingerprint {
  constructor() {
    this.screenResolutions = [
      '1920x1080', '1366x768', '1536x864', '1440x900', '1280x720',
      '2560x1440', '1600x900', '1024x768', '1280x800', '1920x1200'
    ];
    this.colorDepths = [24, 32];
    this.timezones = [
      'America/New_York', 'America/Los_Angeles', 'Europe/London',
      'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
    ];
    this.languages = [
      'en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en-CA,en;q=0.9',
      'fr-FR,fr;q=0.9', 'de-DE,de;q=0.9', 'es-ES,es;q=0.9'
    ];
  }
  generate() {
    const screenRes = this.screenResolutions[Math.floor(Math.random() * this.screenResolutions.length)];
    const [width, height] = screenRes.split('x');
    const colorDepth = this.colorDepths[Math.floor(Math.random() * this.colorDepths.length)];
    const timezone = this.timezones[Math.floor(Math.random() * this.timezones.length)];
    const language = this.languages[Math.floor(Math.random() * this.languages.length)];
    return {
      screenWidth: parseInt(width),
      screenHeight: parseInt(height),
      colorDepth,
      timezone,
      language,
      platform: Math.random() > 0.5 ? 'Win32' : 'MacIntel',
      hardwareConcurrency: Math.random() > 0.5 ? 4 : 8,
      deviceMemory: Math.random() > 0.5 ? 4 : 8
    };
  }
}

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

const sessionManager = new SessionManager();
const rateLimiter = new RateLimiter();

function getRandomDelay() {
  return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY)) + CONFIG.MIN_DELAY;
}
function getRandomProxy() {
  if (!CONFIG.USE_PROXIES || CONFIG.PROXY_LIST.length === 0) {
    return null;
  }
  return CONFIG.PROXY_LIST[Math.floor(Math.random() * CONFIG.PROXY_LIST.length)];
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
    'sec-ch-ua-platform-version': fingerprint.platform === 'Win32' ? '10.0.0' : '10_15_7',
    'sec-ch-ua-arch': 'x86',
    'sec-ch-ua-bitness': '64',
    'sec-ch-ua-full-version': '120.0.6099.109',
    'sec-ch-ua-full-version-list': '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.109", "Google Chrome";v="120.0.6099.109"',
    'sec-ch-ua-model': '',
    'sec-ch-ua-wow64': '?0',
    'Cookie': sessionManager.getCookieString(session.id),
    'Viewport-Width': fingerprint.screenWidth.toString(),
    'Device-Memory': fingerprint.deviceMemory.toString(),
    'Downlink': '10',
    'ECT': '4g',
    'RTT': '50'
  };
}
async function extractVideoUrlWithGraphQL(shortcode, session) {
  try {
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
      maxRedirects: 5,
      proxy: getRandomProxy()
    });
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }
    if (response.data && response.data.data && response.data.data.shortcode_media) {
      const media = response.data.data.shortcode_media;
      if (media.video_url) {
        return media.video_url;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}
async function extractVideoUrlAlternative(shortcode, session) {
  try {
    const apiUrl = `https://www.instagram.com/api/v1/media/${shortcode}/info/`;
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    const response = await axios.get(apiUrl, {
      headers,
      timeout: 10000,
      maxRedirects: 5,
      proxy: getRandomProxy()
    });
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }
    if (response.data && response.data.items && response.data.items[0]) {
      const item = response.data.items[0];
      if (item.video_versions && item.video_versions.length > 0) {
        const videoVersions = item.video_versions.sort((a, b) => b.width - a.width);
        const videoUrl = videoVersions[0].url;
        return videoUrl;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}
async function extractVideoUrlMobile(shortcode, session) {
  try {
    const mobileUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    const mobileResponse = await axios.get(mobileUrl, {
      headers,
      timeout: 10000,
      proxy: getRandomProxy()
    });
    if (mobileResponse.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, mobileResponse.headers['set-cookie']);
    }
    const mobileHtml = mobileResponse.data;
    const mobileVideoMatch = mobileHtml.match(/src="([^"]*\.mp4[^"]*)"/);
    if (mobileVideoMatch) {
      const videoUrl = mobileVideoMatch[1];
      return videoUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}
async function extractVideoUrl(instagramUrl) {
  try {
    const session = sessionManager.createSession();
    if (!rateLimiter.isAllowed(session.id)) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }
    const cleanUrl = instagramUrl.split('?')[0];
    const shortcodeMatch = cleanUrl.match(/\/reel\/([^\/]+)/);
    if (!shortcodeMatch) {
      throw new Error('Could not extract shortcode from Instagram URL');
    }
    const shortcode = shortcodeMatch[1];
    const delay = getRandomDelay();
    await new Promise(resolve => setTimeout(resolve, delay));
    const graphqlVideoUrl = await extractVideoUrlWithGraphQL(shortcode, session);
    if (graphqlVideoUrl) {
      return graphqlVideoUrl;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const alternativeVideoUrl = await extractVideoUrlAlternative(shortcode, session);
    if (alternativeVideoUrl) {
      return alternativeVideoUrl;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const mobileVideoUrl = await extractVideoUrlMobile(shortcode, session);
    if (mobileVideoUrl) {
      return mobileVideoUrl;
    }
    const headers = generateAdvancedHeaders(session, 'https://www.instagram.com/');
    const response = await axios.get(cleanUrl, {
      headers,
      timeout: 15000,
      maxRedirects: 5,
      proxy: getRandomProxy()
    });
    if (response.headers['set-cookie']) {
      sessionManager.updateCookies(session.id, response.headers['set-cookie']);
    }
    const html = response.data;
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
        return videoUrl;
      }
    }
    const $ = cheerio.load(html);
    const videoTag = $('video source').attr('src') || $('video').attr('src');
    if (videoTag) {
      return videoTag;
    }
    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo) {
      return ogVideo;
    }
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('video_url')) {
        const videoMatch = scriptContent.match(/"video_url":"([^"]+)"/);
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
          return videoUrl;
        }
      }
    });
    const videoUrlMatches = html.match(/https:\/\/[^"]*\.mp4[^"]*/g);
    if (videoUrlMatches && videoUrlMatches.length > 0) {
      return videoUrlMatches[0];
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to extract video URL from Instagram: ${error.message}`);
  }
}

// Modified for Vercel: returns axios response stream, not file path
async function downloadVideo(videoUrl) {
  try {
    const cleanVideoUrl = videoUrl.replace(/\\/g, '');
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
      maxRedirects: 5,
      proxy: getRandomProxy()
    });
    return response;
  } catch (error) {
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

async function extractInstagramVideoWithPuppeteer(instagramUrl) {
  let browser;
  try {
    console.log('🤖 Starting Puppeteer browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set realistic browser viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable network interception to capture video responses
    await page.setRequestInterception(true);
    let videoResponse = null;
    
    page.on('request', (request) => {
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.mp4') && response.status() === 200) {
        console.log('🎯 Captured video response:', url);
        try {
          const buffer = await response.buffer();
          videoResponse = {
            url: url,
            buffer: buffer
          };
        } catch (error) {
          console.log('Failed to capture video buffer:', error.message);
        }
      }
    });
    
    // Set extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    console.log('🌐 Navigating to Instagram URL...');
    await page.goto(instagramUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // After navigation, try to close/remove the Instagram login modal
    try {
      // Wait for the modal close button and click it
      await page.waitForSelector('div[role="dialog"] button[aria-label="Close"]', { timeout: 7000 });
      await page.click('div[role="dialog"] button[aria-label="Close"]');
      console.log('✅ Closed Instagram login modal');
    } catch (e) {
      console.log('ℹ️ No login modal appeared, continuing...');
    }
    // Fallback: Remove modal and overlay via JS
    await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      if (modal) modal.remove();
      // Remove overlays if present
      const overlays = document.querySelectorAll('div[style*="background-color: rgba"]');
      overlays.forEach(el => el.remove());
    });
    // Optionally scroll/interact to trigger video load
    await page.evaluate(() => window.scrollBy(0, 200));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for the page to load completely and for video to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Wait for video element to be present
    try {
      await page.waitForSelector('video', { timeout: 10000 });
      console.log('✅ Video element found on page');
    } catch (error) {
      console.log('⚠️ No video element found, continuing with URL extraction...');
    }
    
    console.log('🔍 Looking for video element...');
    
    // Try multiple methods to find the video
    const videoUrl = await page.evaluate(() => {
      // Method 1: Look for video tag
      const video = document.querySelector('video');
      if (video && video.src) {
        return video.src;
      }
      
      // Method 2: Look for video source
      const videoSource = document.querySelector('video source');
      if (videoSource && videoSource.src) {
        return videoSource.src;
      }
      
      // Method 3: Look for og:video meta tag
      const ogVideo = document.querySelector('meta[property="og:video"]');
      if (ogVideo && ogVideo.content) {
        return ogVideo.content;
      }
      
      // Method 4: Look for video in JSON-LD structured data
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data.contentUrl && data.contentUrl.includes('.mp4')) {
            return data.contentUrl;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      // Method 5: Look for video URL in page source
      const pageSource = document.documentElement.outerHTML;
      const videoPatterns = [
        /"video_url":"([^"]+)"/,
        /"video_url":"([^"]*\\u0026[^"]*)"/,
        /"contentUrl":"([^"]*\.mp4[^"]*)"/,
        /"url":"([^"]*\.mp4[^"]*)"/,
        /video_url":"([^"]+)"/,
        /"video_versions":\[[^\]]*"url":"([^"]+)"/
      ];
      
      for (const pattern of videoPatterns) {
        const match = pageSource.match(pattern);
        if (match) {
          let url = match[1];
          url = url.replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
          return url;
        }
      }
      
      return null;
    });
    
    if (videoUrl) {
      console.log('✅ Video URL found via Puppeteer:', videoUrl);
      
      // Download the video directly in the browser context with proper headers
      console.log('📥 Downloading video in browser context...');
      const videoBuffer = await page.evaluate(async (url) => {
        try {
          // Clean the URL (remove escaped characters)
          const cleanUrl = url.replace(/\\/g, '');
          
          const response = await fetch(cleanUrl, {
            method: 'GET',
            headers: {
              'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Referer': 'https://www.instagram.com/',
              'Origin': 'https://www.instagram.com',
              'Sec-Fetch-Dest': 'video',
              'Sec-Fetch-Mode': 'no-cors',
              'Sec-Fetch-Site': 'cross-site',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          console.log('Download successful, size:', arrayBuffer.byteLength);
          return Array.from(new Uint8Array(arrayBuffer));
        } catch (error) {
          console.error('Download error:', error.message);
          return null;
        }
      }, videoUrl);
      
      if (videoBuffer) {
        console.log('✅ Video downloaded successfully via Puppeteer');
        await browser.close();
        return {
          videoUrl: videoUrl,
          videoBuffer: Buffer.from(videoBuffer),
          method: 'Puppeteer'
        };
      } else {
        console.log('❌ Failed to download video via fetch, trying alternative method...');
        
        // Try alternative method: get video data from video element
        const videoData = await page.evaluate(() => {
          const video = document.querySelector('video');
          if (video && video.src) {
            return video.src;
          }
          return null;
        });
        
        if (videoData) {
          console.log('🔄 Trying to download via video element src...');
          // Try downloading with a different approach
          const alternativeBuffer = await page.evaluate(async (videoSrc) => {
            try {
              const response = await fetch(videoSrc, {
                method: 'GET',
                headers: {
                  'Accept': '*/*',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'Referer': window.location.href,
                  'User-Agent': navigator.userAgent
                }
              });
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              return Array.from(new Uint8Array(arrayBuffer));
            } catch (error) {
              console.error('Alternative download failed:', error.message);
              return null;
            }
          }, videoData);
          
          if (alternativeBuffer) {
            console.log('✅ Video downloaded via alternative method');
            await browser.close();
            return {
              videoUrl: videoData,
              videoBuffer: Buffer.from(alternativeBuffer),
              method: 'Puppeteer Alternative'
            };
          }
        }
        
        console.log('❌ All Puppeteer download methods failed');
      }
    }
    
    // Check if we captured video via network interception
    if (videoResponse) {
      console.log('✅ Video captured via network interception');
      await browser.close();
      return {
        videoUrl: videoResponse.url,
        videoBuffer: videoResponse.buffer,
        method: 'Puppeteer Network Interception'
      };
    }
    
    console.log('❌ No video URL found via Puppeteer');
    await browser.close();
    return null;
    
  } catch (error) {
    console.error('🤖 Puppeteer error:', error.message);
    if (browser) {
      await browser.close();
    }
    return null;
  }
}

module.exports = {
  extractVideoUrl,
  downloadVideo,
  CONFIG,
  SessionManager,
  RateLimiter,
  extractInstagramVideoWithPuppeteer,
}; 