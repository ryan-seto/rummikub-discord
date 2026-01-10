# Rummikub Discord Activity - Landing Page

This is the landing page for the Rummikub Discord Activity project.

## Adding Your Media

### Screenshots
1. Create a `screenshots` folder in this directory
2. Add your screenshot images with these recommended names:
   - `lobby.png` - The lobby/ready screen
   - `gameplay.png` - Active gameplay screenshot
   - `video-thumbnail.png` - Thumbnail for the video (optional)

### Videos
1. Create a `videos` folder in this directory
2. Add your gameplay demo video:
   - `gameplay-demo.mp4` - Short gameplay clip (recommended: 30-60 seconds)
   - Keep file size under 10MB for better loading

**Tip:** You can use OBS or Discord's built-in screen recording to capture gameplay.

## Deploying to GitHub Pages

### Option 1: Using the docs folder (Recommended)
1. Push your changes to GitHub:
   ```bash
   git add docs/
   git commit -m "Add landing page"
   git push
   ```

2. Go to your repository settings on GitHub
3. Navigate to **Pages** (in the left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/docs`
5. Click **Save**
6. Your site will be live at: `https://ryan-seto.github.io/rummikub-discord/`

### Option 2: Using a gh-pages branch
1. Install gh-pages:
   ```bash
   npm install -g gh-pages
   ```

2. Deploy:
   ```bash
   gh-pages -d docs
   ```

## Customization

### Update Personal Links
- Replace GitHub username in `index.html` if different
- Update footer links to point to your GitHub profile

### Add More Screenshots
Edit `index.html` and add more `.media-item` divs in the media section:

```html
<div class="media-item">
    <img src="screenshots/your-image.png" alt="Description" loading="lazy">
    <p class="caption">Your caption here</p>
</div>
```

### Change Colors
Edit `styles.css` and modify the `:root` variables to match your preferred color scheme.

## Testing Locally

1. Open `index.html` in your browser directly, or
2. Use a simple HTTP server:
   ```bash
   # Python 3
   python -m http.server 8000

   # Then visit http://localhost:8000
   ```
