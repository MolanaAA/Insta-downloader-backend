# Instagram Reels Downloader

A beautiful web application built with React and Node.js that allows users to download Instagram reels by simply pasting the URL.

## Features

- 🎨 Modern and responsive UI with beautiful gradient design
- ⚡ Fast and efficient video downloading
- 📱 Mobile-friendly interface
- 🔄 Real-time download status with loading indicators
- 📁 Automatic file organization with timestamped filenames
- 🛡️ Error handling and user feedback

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. **Clone or download this project**

2. **Install dependencies for both backend and frontend:**
   ```bash
   npm run install-all
   ```

   Or install them separately:
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

## Usage

### Development Mode

To run both the backend server and React frontend in development mode:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- React development server on `http://localhost:3000`

### Production Mode

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

The app will be available at `http://localhost:5000`

## How to Use

1. Open the web application in your browser
2. Copy the URL of an Instagram reel you want to download
3. Paste the URL in the input field
4. Click "Download Reel"
5. The video will be downloaded to the server's `server/downloads` folder

## Project Structure

```
instagram-reels-downloader/
├── server/
│   ├── index.js          # Main server file
│   └── downloads/        # Downloaded videos folder
├── client/
│   ├── public/
│   │   └── index.html    # Main HTML file
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Styles
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   └── package.json      # Frontend dependencies
├── package.json          # Backend dependencies
└── README.md            # This file
```

## API Endpoints

- `POST /api/download` - Download Instagram reel
  - Body: `{ "url": "instagram_reel_url" }`
  - Returns: `{ "success": true, "filename": "filename.mp4", "filePath": "path/to/file" }`

## Technical Details

### Backend (Node.js + Express)
- Uses `axios` for HTTP requests
- Uses `cheerio` for HTML parsing
- Implements multiple methods to extract video URLs
- Handles CORS and serves static files
- Creates timestamped filenames for downloads

### Frontend (React)
- Modern functional components with hooks
- Beautiful UI with CSS gradients and animations
- Responsive design for all devices
- Real-time feedback and error handling
- Loading states and user notifications

## Important Notes

⚠️ **Legal Disclaimer**: This tool is for educational purposes only. Please respect Instagram's terms of service and only download content you have permission to download.

⚠️ **Rate Limiting**: Instagram may rate-limit requests if too many are made in a short time.

⚠️ **Video Extraction**: The app uses multiple methods to extract video URLs, but Instagram's structure may change, potentially affecting functionality.

## Troubleshooting

### Common Issues

1. **"Failed to extract video URL"**
   - The Instagram post might be private or deleted
   - Instagram's structure might have changed
   - Try with a different Instagram reel URL

2. **"Network Error"**
   - Check your internet connection
   - Instagram might be blocking the request
   - Try again later

3. **Port already in use**
   - Change the port in `server/index.js` (line 8)
   - Kill any processes using port 5000

### Development Issues

- If you get module not found errors, make sure all dependencies are installed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License. 