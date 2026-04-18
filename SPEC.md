# SPEC.md — Arunjit K Portfolio

## 1. Concept & Vision

A single-page 3D interactive portfolio for Arunjit K, Senior Security Analyst. The site feels like entering the Matrix — a digital command center where visitors browse classified dossier screens. Cascading green rain code, glowing neon HUD panels, floating holographic data cards, dark noir atmosphere, scan-line CRT effects, and glitch transitions. The mood is "digital warrior's war room."

## 2. Design Language

### Aesthetic Direction
Cyberpunk/Matrix aesthetic — terminal-like interfaces, classified document styling, holographic UI elements.

### Color Palette
```css
--matrix-green: #00FF41;
--cyber-cyan: #00F0FF;
--neon-magenta: #FF00FF;
--dark-bg: #0A0A0A;
--panel-bg: rgba(0,20,0,0.85);
--grid-line: rgba(0,255,65,0.08);
--text-primary: #C8E6C9;
--text-dim: #4A6F4A;
--danger-red: #FF1744;
```

### Typography
- **Headings:** Share Tech Mono, monospaced, all-caps, letter-spacing 0.15em, text-shadow glow
- **Body:** IBM Plex Mono, 14-16px
- **Accent labels:** Orbitron for HUD-style section labels

### Motion Philosophy
- Glitch text reveals (character scramble then resolve)
- Scan-line sweep animations
- Parallax tilt on mouse movement (max 5-15 degrees)
- Pulse animations on timeline nodes
- Holographic shimmer on hover

## 3. Layout & Structure

### Sections (vertical scroll)
1. Hero / Boot Sequence (full viewport)
2. Profile / Dossier
3. Work Experience (timeline)
4. Skills Matrix (3D sphere)
5. Tools & Tech (Armory)
6. Education (Training Facility)
7. Certifications (Clearance Badges)
8. Awards (Commendations)
9. Languages (Comms Protocols)
10. Interests (Off-Grid)
11. Contact / Footer (Uplink)

### Navigation
- Fixed top HUD bar with section links
- Right-side scroll progress indicator
- Mobile: hamburger with full-screen overlay

## 4. Features & Interactions

### Matrix Rain (Background)
- Full-viewport canvas with falling katakana/Latin characters
- Multiple columns at random speeds/opacities
- Always behind content (z-index layering)

### 3D Globe (Hero)
- Three.js wireframe globe with glowing nodes
- Mouse hover: nodes glow brighter
- Slow auto-rotation

### Parallax Cards
- All floating panels respond to mouse with subtle rotateX/rotateY
- Disabled on mobile

### Scroll Animations
- Intersection Observer triggers
- Glitch text reveal for headings
- Fade-up with scan-line for content blocks

### Cursor Trail
- Faint green glow follows cursor
- Disabled on mobile

## 5. Component Inventory

### HUD Navigation
- Semi-transparent dark background, faint green bottom border
- Active section highlighted in --matrix-green
- Mobile: hamburger icon, full-screen overlay menu

### Hero Section
- ASCII art name in --matrix-green with pulse animation
- Blinking terminal cursor with role text
- 3D globe with nodes
- Contact HUD bar at bottom
- Scroll prompt chevron

### Timeline Cards
- Glass panel with green border glow
- Parallax tilt on mouse hover
- Scan-line sweep on hover
- Mission node on vertical line

### Skill Tags
- 3D sphere with floating tags
- Color-coded by category
- Filter bar for category filtering
- Hover: enlarge and glow

### Certification Badges
- Holographic shimmer effect
- 3D lift on hover (translateZ)
- Shimmer intensifies on hover

### Award Banners
- Horizontal card with neon-magenta left border
- Slide-in from left on scroll
- Glitch effect

## 6. Technical Approach

### Stack
- Vanilla HTML/CSS/JavaScript (single file for simplicity)
- Three.js for 3D globe and skill sphere
- Google Fonts: Share Tech Mono, Orbitron, IBM Plex Mono
- Canvas API for Matrix rain

### Performance
- Lazy-load Three.js
- Canvas rain with requestAnimationFrame
- GPU-accelerated transforms
- prefers-reduced-motion support

### Responsive Breakpoints
- Desktop: 1200px+
- Tablet: 768px-1199px
- Mobile: <768px
