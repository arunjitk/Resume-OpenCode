# ARUNJIT.K — Cyberpunk Security Portfolio

A single-page, 3D interactive portfolio website for Arunjit K — Senior Security Analyst with 8+ years of experience in Threat Hunting, Incident Response, and Cloud Security.

![Cyberpunk Portfolio](https://img.shields.io/badge/design-cyberpunkMatrix-green) ![Three.js](https://img.shields.io/badge/3D-Three.js-blue) ![Vanilla](https://img.shields.io/badge/stack-Vanilla_HTML/CSS/JS-yellow)

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

- **HTML5** — Semantic markup with accessibility features
- **CSS3** — Custom properties (variables), animations, responsive design
- **JavaScript (ES6+)** — Vanilla JS, no frameworks
- **Three.js** — 3D globe and skills sphere (lazy-loaded)
- **Google Fonts** — Share Tech Mono, Orbitron, IBM Plex Mono

## File Structure

```
Resume-OpenCode/
├── index.html           # Main HTML file
├── css/
│   └── style.css        # Full stylesheet (~1700 lines)
├── js/
│   ├── rain.js          # Matrix digital rain effect
│   ├── animations.js    # Scroll reveals, cursor, easter eggs, parallax
│   ├── globe.js         # 3D wireframe globe (Three.js)
│   └── skills-sphere.js # 3D skills sphere (Three.js)
├── SPEC.md              # Design specification document
└── README.md            # This file
```

## Running Locally

### Option 1: Simple HTTP Server
```bash
cd /Users/n50/Documents/Code-Project/Resume-OpenCode

# Python 3
python -m http.server 8080

# OR Node.js (if installed)
npx serve .
```

Then open: http://localhost:8080

### Option 2: VS Code Live Server
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

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