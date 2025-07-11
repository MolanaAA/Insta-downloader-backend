# cPanel Deployment Guide

## Prerequisites
- cPanel hosting account
- Node.js support (if available) or ability to run Node.js applications

## Deployment Steps

### 1. Upload Files
1. Upload all project files to your cPanel hosting
2. Place the files in the `public_html` directory or a subdirectory

### 2. Create Downloads Directory
1. In cPanel File Manager, navigate to `public_html`
2. Create a new folder called `downloads`
3. Set folder permissions to `755` (readable and executable by all, writable by owner)

### 3. Set File Permissions
1. Set the following file permissions:
   - `server/index.js`: `644`
   - `public_html/.htaccess`: `644`
   - `downloads/` folder: `755`

### 4. Configure Node.js (if available)
1. In cPanel, go to "Setup Node.js App"
2. Create a new Node.js application
3. Set the startup file to `server/index.js`
4. Set the Node.js version to 16 or higher
5. Configure the application URL

### 5. Alternative: Use PM2 or Forever
If Node.js apps are not directly supported, you can use PM2 or Forever:
```bash
npm install -g pm2
pm2 start server/index.js --name "instagram-downloader"
pm2 startup
pm2 save
```

### 6. Environment Variables
Set the following environment variables in your hosting panel:
- `PORT`: The port your application will run on (usually 3000 or 5000)
- `NODE_ENV`: Set to `production`

### 7. Build the React App
1. Navigate to the client directory
2. Run: `npm run build`
3. Upload the `build` folder contents to `public_html`

### 8. Test the Application
1. Visit your domain
2. Try downloading an Instagram reel
3. Check that the download link appears and works correctly

## Important Notes

### Downloads Folder
- The application will create a `downloads` folder in `public_html`
- This folder must be writable by the web server
- Files in this folder will be publicly accessible via `/downloads/filename.mp4`

### Security Considerations
- The downloads folder is publicly accessible
- Consider implementing authentication if needed
- Regularly clean up old downloaded files
- Monitor disk space usage

### Troubleshooting
- If downloads fail, check folder permissions
- If the app doesn't start, check Node.js version and dependencies
- Check error logs in cPanel for debugging information

## File Structure After Deployment
```
public_html/
├── downloads/          # Downloaded videos (created automatically)
├── .htaccess          # Apache configuration
├── index.html         # React app entry point
├── static/            # React app assets
└── server/
    └── index.js       # Node.js server
``` 