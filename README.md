# ARUNJIT.K — Cyberpunk Security Portfolio

A single-page, 3D interactive portfolio website for Arunjit K — Senior Security Analyst with 8+ years of experience in Threat Hunting, Incident Response, and Cloud Security.

![Cyberpunk Portfolio](https://img.shields.io/badge/design-cyberpunkMatrix-green) ![Three.js](https://img.shields.io/badge/3D-Three.js-blue) ![Express.js](https://img.shields.io/badge/backend-Express-orange)

## Preview

![Portfolio Preview](https://via.placeholder.com/800x450/0A0A0A/00FF41?text=ARUNJIT.K+PORTFOLIO)

## Features

### Visual Effects
- **Matrix Digital Rain** — Animated falling code rain background (canvas-based)
- **CRT Scanlines** — Subtle horizontal scanline overlay for retro monitor feel
- **Glitch Animations** — CSS-driven glitch effects on titles and hover states
- **Custom Cursor** — Glowing cursor with GPU-accelerated trail effect
- **Vignette & Grid** — Depth-enhancing vignette and perspective grid layers

### 3D Elements (Three.js - Lazy Loaded)
- **Hero Globe** — Rotating wireframe globe in the hero section
- **Skills Sphere** — Interactive 3D skills visualization (falls back to hex grid)

### Interactive Features
- **Terminal Easter Egg** — Press `` ` `` to open a secret terminal
- **Konami Code** — Enter ↑↑↓↓←→←→BA for a surprise
- **Scroll Reveals** — Sections animate in on scroll
- **Filterable Skills** — Filter skills by category (Core, SIEM, Cloud, etc.)

### Backend / Real-time
- **Contact Form** — Sends notifications via Email (Resend) + Telegram
- **Download Lead Capture** — Gathers visitor info for resume downloads
- **Hub Access Tracking** — IP geolocation tracking for gated content access
- **Live Chat** — Real-time chat with Telegram integration

### Sections (12 Total)
1. **Hero/Boot** — ASCII art, boot sequence animation, 3D globe
2. **Dossier** — Profile summary in classified document style
3. **Experience** — 4-item timeline with mission cards (Smarsh, Trellix, OLA, SISA)
4. **Skills Matrix** — Filterable hex grid + 3D sphere
5. **Armory** — Security tools and platforms grid
6. **Projects** — GitHub-linked project cards (ThreatScope, ThreatTrace, ChittyApp)
7. **Education** — Terminal-style education records
8. **Certifications** — Holographic badge effect cards (13 certs)
9. **Awards** — Slide-in award banners with citations
10. **Languages** — Progress bars for English, Malayalam, Hindi
11. **Interests** — Off-grid activities (Photography, Gaming)
12. **Contact** — Terminal-style contact form with mailto

## Tech Stack

### Frontend
- **HTML5** — Semantic markup with accessibility features
- **CSS3** — Custom properties (variables), animations, responsive design
- **JavaScript (ES6+)** — Vanilla JS, no frameworks
- **Three.js** — 3D globe and skills sphere (lazy-loaded)
- **Google Fonts** — Share Tech Mono, Orbitron, IBM Plex Mono

### Backend
- **Express.js** — Node.js web server
- **Resend** — Email delivery API
- **Telegram Bot API** — Notifications and live chat
- **Vite** — Build tool and dev server

## File Structure

```
Resume-OpenCode/
├── index.html              # Main HTML file
├── server.js             # Express server with all API routes
├── vite.config.js         # Vite configuration
├── package.json         # Dependencies
├── ecosystem.config.js # PM2 production config
├── vercel.json          # Vercel deployment config
├── css/
│   └── style.css       # Full stylesheet
├── js/
│   ├── rain.js        # Matrix digital rain effect
│   ├── animations.js  # Scroll reveals, cursor, easter eggs, parallax
│   ├── globe.js     # 3D wireframe globe (Three.js)
│   ├── skills-sphere.js # 3D skills sphere (Three.js)
│   └── chat.js      # Live chat client
├── api/
│   ├── contact.js       # Contact form handler (also in server.js)
│   └── download-lead.js # Resume download lead capture
├── dist/              # Built production files
├── ResumePDF/         # PDF resume
└── README.md        # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Contact form - sends email + Telegram |
| POST | `/api/download-lead` | Lead capture for resume downloads |
| POST | `/api/hub-access` | Track gated content access with IP geo |
| GET | `/api/chat/events` | SSE stream for live chat |
| POST | `/api/chat/message` | Send chat message to Telegram |
| GET | `/api/telegram/set-webhook` | Configure Telegram webhook |

## Running Locally

### Development
```bash
cd /Users/n50/Documents/Code-Project/Resume-OpenCode
npm install
npm run dev
```
Opens at http://localhost:5173

### Production Build
```bash
npm run build
npm start
```
Runs Express server on http://localhost:3000

### PM2 Production
```bash
npx pm2 start ecosystem.config.js
```

## Environment Variables

Create a `.env` file:
```bash
PORT=3000
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=your@email.com
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
```

## Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: < 768px

## Accessibility

- `prefers-reduced-motion` support — Disables animations for users who prefer reduced motion
- ARIA labels on interactive elements
- Keyboard navigable (custom cursor can be hidden with CSS if needed)

## Customization

### Colors (in `style.css`)
```css
:root {
  --matrix-green: #00FF41;
  --cyber-cyan: #00F0FF;
  --neon-magenta: #FF00FF;
  --dark-bg: #0A0A0A;
  /* ... */
}
```

### Content
Edit `index.html` to update:
- Profile information in the Dossier section
- Work experience timeline items
- Skills hex grid items
- Project details and GitHub links
- Contact information

## Known Issues

- **Skills sphere fallback**: If Three.js fails to load, the hex grid is displayed instead
- **Custom cursor**: Uses `cursor: none` on body — may need adjustment for touch devices

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Credits

- **Three.js** — For 3D globe and sphere rendering
- **Google Fonts** — Share Tech Mono, Orbitron, IBM Plex Mono
- **ASCII Art** — Generated for "ARUNJIT.K" header

---

> "All systems nominal." — Footer