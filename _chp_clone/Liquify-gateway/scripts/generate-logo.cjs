const sharp = require('sharp');
const path = require('path');

const SIZE = 480;
const outputPath = path.join(__dirname, '..', 'buidl-logo.png');

const svg = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" style="stop-color:#1a1a3e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0a1f;stop-opacity:1" />
    </radialGradient>
    
    <!-- Gold gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#F0B90B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D4A017;stop-opacity:1" />
    </linearGradient>
    
    <!-- Light gold gradient -->
    <linearGradient id="lightGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE87C;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F0B90B;stop-opacity:1" />
    </linearGradient>
    
    <!-- Flow gradient -->
    <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F0B90B;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#F0B90B;stop-opacity:0.1" />
    </linearGradient>
    
    <!-- Glow filter -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Shield clip -->
    <clipPath id="shieldClip">
      <path d="M240,60 L380,120 L380,260 Q380,380 240,430 Q100,380 100,260 L100,120 Z"/>
    </clipPath>
  </defs>
  
  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" rx="80" fill="url(#bgGrad)" />
  
  <!-- Subtle grid pattern -->
  <g opacity="0.05">
    ${Array.from({length:12}, (_,i) => `<line x1="${40+i*37}" y1="0" x2="${40+i*37}" y2="${SIZE}" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
    ${Array.from({length:12}, (_,i) => `<line x1="0" y1="${40+i*37}" x2="${SIZE}" y2="${40+i*37}" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
  </g>
  
  <!-- Outer glow ring -->
  <circle cx="240" cy="240" r="160" fill="none" stroke="#F0B90B" stroke-width="1.5" opacity="0.15"/>
  <circle cx="240" cy="240" r="180" fill="none" stroke="#F0B90B" stroke-width="0.5" opacity="0.08"/>
  
  <!-- Shield frame -->
  <path d="M240,60 L380,120 L380,260 Q380,380 240,430 Q100,380 100,260 L100,120 Z" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.6" filter="url(#glow)"/>
  <path d="M240,75 L370,130 L370,255 Q370,370 240,418 Q110,370 110,255 L110,130 Z" 
        fill="none" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.25"/>
  
  <!-- Central BNB diamond -->
  <g filter="url(#softGlow)">
    <rect x="180" y="140" width="120" height="120" rx="20" 
          fill="url(#goldGrad)" transform="rotate(45 240 200)" opacity="0.9"/>
    <rect x="195" y="155" width="90" height="90" rx="12" 
          fill="url(#lightGoldGrad)" transform="rotate(45 240 200)" opacity="0.5"/>
  </g>
  
  <!-- Inner diamond detail -->
  <rect x="215" y="175" width="50" height="50" rx="6" 
        fill="none" stroke="#FFD700" stroke-width="1.5" transform="rotate(45 240 200)" opacity="0.6"/>
  
  <!-- Flowing liquidity streams - left -->
  <path d="M120,200 Q160,180 180,200 Q200,220 190,260" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.5" filter="url(#glow)"/>
  <path d="M110,220 Q150,200 170,225 Q190,250 185,280" 
        fill="none" stroke="#F0B90B" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  
  <!-- Flowing liquidity streams - right -->
  <path d="M360,200 Q320,180 300,200 Q280,220 290,260" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.5" filter="url(#glow)"/>
  <path d="M370,220 Q330,200 310,225 Q290,250 295,280" 
        fill="none" stroke="#F0B90B" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  
  <!-- Bottom flow streams -->
  <path d="M180,340 Q210,320 240,340 Q270,360 300,340" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-linecap="round" opacity="0.4" filter="url(#glow)"/>
  <path d="M160,360 Q200,340 240,360 Q280,380 320,360" 
        fill="none" stroke="#F0B90B" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
  
  <!-- Small dots/particles for liquidity feel -->
  ${[
    [140,190,3], [160,175,2], [340,190,3], [320,175,2],
    [130,240,2], [350,240,2], [200,350,2], [280,350,2],
    [170,300,1.5], [310,300,1.5], [240,170,2.5], [240,370,2]
  ].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFD700" opacity="${0.3 + Math.random()*0.3}"/>`).join('\n  ')}
  
  <!-- Gateway arch lines -->
  <path d="M150,120 Q240,90 330,120" fill="none" stroke="#F0B90B" stroke-width="1" opacity="0.2"/>
  <path d="M140,130 Q240,95 340,130" fill="none" stroke="#F0B90B" stroke-width="0.5" opacity="0.1"/>
</svg>
`);

sharp(svg)
  .png()
  .toFile(outputPath)
  .then(() => {
    const fs = require('fs');
    const stats = fs.statSync(outputPath);
    console.log(`Logo saved to: ${outputPath}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
    if (stats.size > 2 * 1024 * 1024) {
      console.error('WARNING: File exceeds 2MB limit!');
    } else {
      console.log('Size OK (under 2MB)');
    }
  })
  .catch(err => console.error('Error:', err));
