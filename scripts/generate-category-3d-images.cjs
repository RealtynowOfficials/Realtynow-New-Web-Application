const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDir = path.join(__dirname, '..', 'public', 'categories');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 3D Isometric SVG scenes with clay/render isometric style
const categorySvgs = {
  'open-plots-land': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="grassTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="100%" stop-color="#65a30d"/>
        </linearGradient>
        <linearGradient id="dirtLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a16207"/>
          <stop offset="100%" stop-color="#713f12"/>
        </linearGradient>
        <linearGradient id="dirtRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ca8a04"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </linearGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.15"/>
        </filter>
        <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="50%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#skyGrad)"/>
      <g filter="url(#dropShadow)">
        <!-- Isometric Land Block -->
        <!-- Dirt Left -->
        <polygon points="100,280 256,370 256,420 100,330" fill="url(#dirtLeft)"/>
        <!-- Dirt Right -->
        <polygon points="256,370 412,280 412,330 256,420" fill="url(#dirtRight)"/>
        <!-- Grass Top -->
        <polygon points="256,190 412,280 256,370 100,280" fill="url(#grassTop)"/>
      </g>
      
      <!-- Plot Grid Lines on Grass -->
      <line x1="178" y1="235" x2="334" y2="325" stroke="#fef08a" stroke-width="3" stroke-dasharray="6,4" stroke-opacity="0.9"/>
      <line x1="334" y1="235" x2="178" y2="325" stroke="#fef08a" stroke-width="3" stroke-dasharray="6,4" stroke-opacity="0.9"/>
      
      <!-- Mini Boundary Corner Markers (Red & White Pillars) -->
      <g>
        <polygon points="256,190 252,185 256,180 260,185" fill="#f87171"/>
        <rect x="254" y="183" width="4" height="8" fill="#ffffff"/>
        
        <polygon points="412,280 408,275 412,270 416,275" fill="#f87171"/>
        <rect x="410" y="273" width="4" height="8" fill="#ffffff"/>
        
        <polygon points="100,280 96,275 100,270 104,275" fill="#f87171"/>
        <rect x="98" y="273" width="4" height="8" fill="#ffffff"/>
        
        <polygon points="256,370 252,365 256,360 260,365" fill="#f87171"/>
        <rect x="254" y="363" width="4" height="8" fill="#ffffff"/>
      </g>
      
      <!-- Isometric Trees & Bushes -->
      <g>
        <!-- Tree 1 -->
        <circle cx="160" cy="270" r="14" fill="#15803d" opacity="0.9"/>
        <circle cx="155" cy="265" r="12" fill="#22c55e"/>
        <circle cx="162" cy="262" r="8" fill="#4ade80"/>
        
        <!-- Tree 2 -->
        <circle cx="360" cy="265" r="16" fill="#15803d" opacity="0.9"/>
        <circle cx="355" cy="260" r="13" fill="#22c55e"/>
        <circle cx="362" cy="256" r="9" fill="#4ade80"/>
      </g>
      
      <!-- Prominent 3D Location Pin Marker -->
      <g filter="url(#dropShadow)">
        <!-- Pin Shadow -->
        <ellipse cx="256" cy="285" rx="16" ry="7" fill="#0f172a" fill-opacity="0.3"/>
        
        <!-- 3D Pin Body -->
        <path d="M256,120 C220,120 190,150 190,186 C190,235 256,285 256,285 C256,285 322,235 322,186 C322,150 292,120 256,120 Z" fill="url(#pinGrad)"/>
        
        <!-- Pin Inner White Dot -->
        <circle cx="256" cy="180" r="24" fill="#ffffff"/>
        <circle cx="256" cy="180" r="16" fill="#dc2626"/>
        <circle cx="256" cy="180" r="8" fill="#f87171"/>
        
        <!-- Glossy Highlight on Pin -->
        <ellipse cx="235" cy="155" rx="14" ry="7" fill="#ffffff" fill-opacity="0.5" transform="rotate(-30 235 155)"/>
      </g>
    </svg>
  `,

  'luxury-villas': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="skyGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="villaPool" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <linearGradient id="villaWall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
        <linearGradient id="villaWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#92400e"/>
        </linearGradient>
        <filter id="villaShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="url(#skyGrad2)"/>
      
      <g filter="url(#villaShadow)">
        <!-- Ground Base -->
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f1f5f9"/>
        
        <!-- Green Lawn Patch -->
        <polygon points="230,205 380,290 270,355 120,270" fill="#84cc16"/>
        
        <!-- Swimming Pool -->
        <polygon points="260,300 350,250 320,230 230,280" fill="url(#villaPool)"/>
        <polygon points="262,298 348,252 322,232 232,278" fill="#e0f2fe" opacity="0.3"/>
        
        <!-- Sunbed Loungers -->
        <rect x="330" y="275" width="16" height="8" rx="2" fill="#ffffff" transform="rotate(-30 330 275)"/>
        <rect x="345" y="265" width="16" height="8" rx="2" fill="#ffffff" transform="rotate(-30 345 265)"/>
        
        <!-- Main Villa Structure - 3D Blocks -->
        <!-- Lower Floor -->
        <polygon points="150,240 220,280 220,210 150,170" fill="#e2e8f0"/>
        <polygon points="220,280 300,235 300,165 220,210" fill="#cbd5e1"/>
        <polygon points="150,170 220,210 300,165 230,125" fill="#f8fafc"/>
        
        <!-- Glass Windows with Warm Glow -->
        <polygon points="160,230 210,260 210,215 160,185" fill="#fde047" opacity="0.75"/>
        <polygon points="230,265 290,230 290,185 230,220" fill="#fde047" opacity="0.75"/>
        
        <!-- Upper Floor Glass Cube with Purple Accent -->
        <polygon points="170,160 240,200 240,130 170,90" fill="#a855f7" opacity="0.85"/>
        <polygon points="240,200 310,160 310,90 240,130" fill="#9333ea" opacity="0.85"/>
        <polygon points="170,90 240,130 310,90 240,50" fill="#c084fc"/>
        
        <!-- Warm Light Inside Upper Floor -->
        <polygon points="180,150 230,180 230,135 180,105" fill="#fef08a" opacity="0.8"/>
        <polygon points="245,185 300,155 300,110 245,140" fill="#fef08a" opacity="0.8"/>
        
        <!-- Palm Trees & Landscaping -->
        <circle cx="135" cy="245" r="14" fill="#16a34a"/>
        <circle cx="140" cy="235" r="11" fill="#22c55e"/>
        <circle cx="190" cy="180" r="8" fill="#4ade80"/>
      </g>
    </svg>
  `,

  'farm-houses': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="farmGrass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#65a30d"/>
          <stop offset="100%" stop-color="#4d7c0f"/>
        </linearGradient>
        <linearGradient id="barnRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
        <filter id="farmShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#farmShadow)">
        <!-- Terrain -->
        <polygon points="100,280 256,370 256,410 100,320" fill="#713f12"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#854d0e"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="url(#farmGrass)"/>
        
        <!-- Farm Cottage & Barn -->
        <polygon points="160,230 230,270 230,200 160,160" fill="url(#barnRed)"/>
        <polygon points="230,270 310,225 310,155 230,200" fill="#b91c1c"/>
        <!-- Roof -->
        <polygon points="140,160 230,210 230,170 140,120" fill="#7f1d1d"/>
        <polygon points="230,210 330,155 330,115 230,170" fill="#991b1b"/>
        
        <!-- White Barn Door & Windows -->
        <polygon points="180,240 210,258 210,225 180,207" fill="#ffffff"/>
        
        <!-- Windmill / Silo -->
        <polygon points="325,230 355,213 355,140 325,157" fill="#e2e8f0"/>
        <polygon points="355,213 375,202 375,129 355,140" fill="#cbd5e1"/>
        <polygon points="325,157 355,140 375,129 345,110" fill="#ef4444"/>
        
        <!-- Orchard Trees -->
        <circle cx="140" cy="270" r="16" fill="#15803d"/>
        <circle cx="140" cy="265" r="12" fill="#22c55e"/>
        <circle cx="140" cy="265" r="3" fill="#ef4444"/>
        <circle cx="145" cy="270" r="3" fill="#ef4444"/>
        
        <circle cx="270" cy="330" r="18" fill="#15803d"/>
        <circle cx="270" cy="324" r="14" fill="#22c55e"/>
        <circle cx="275" cy="322" r="3" fill="#ef4444"/>
        
        <!-- Wooden Fence -->
        <line x1="120" y1="280" x2="200" y2="330" stroke="#fde047" stroke-width="4" stroke-dasharray="8,6"/>
      </g>
    </svg>
  `,

  'new-projects': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="craneYellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <linearGradient id="towerBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <filter id="projShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#projShadow)">
        <!-- Base -->
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#e2e8f0"/>
        
        <!-- High Rise Tower under construction -->
        <polygon points="180,270 260,315 260,115 180,70" fill="url(#towerBlue)" opacity="0.9"/>
        <polygon points="260,315 330,275 330,75 260,115" fill="#0369a1"/>
        <polygon points="180,70 260,115 330,75 250,30" fill="#7dd3fc"/>
        
        <!-- Structural Floor Grids / Scaffolding -->
        <line x1="180" y1="120" x2="260" y2="165" stroke="#ffffff" stroke-width="3"/>
        <line x1="180" y1="170" x2="260" y2="215" stroke="#ffffff" stroke-width="3"/>
        <line x1="180" y1="220" x2="260" y2="265" stroke="#ffffff" stroke-width="3"/>
        
        <line x1="260" y1="165" x2="330" y2="125" stroke="#ffffff" stroke-width="3"/>
        <line x1="260" y1="215" x2="330" y2="175" stroke="#ffffff" stroke-width="3"/>
        <line x1="260" y1="265" x2="330" y2="225" stroke="#ffffff" stroke-width="3"/>
        
        <!-- Construction Tower Crane -->
        <line x1="360" y1="310" x2="360" y2="40" stroke="url(#craneYellow)" stroke-width="8"/>
        <!-- Crane Arm -->
        <line x1="220" y1="40" x2="390" y2="40" stroke="url(#craneYellow)" stroke-width="6"/>
        <line x1="260" y1="40" x2="260" y2="90" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3"/>
        <polygon points="255,90 265,90 260,100" fill="#eab308"/>
      </g>
    </svg>
  `,

  'duplex-houses': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="duplexIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#818cf8"/>
          <stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
        <filter id="duplexShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#duplexShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#84cc16"/>
        
        <!-- Ground Floor -->
        <polygon points="160,250 240,295 240,205 160,160" fill="#f1f5f9"/>
        <polygon points="240,295 320,250 320,160 240,205" fill="#e2e8f0"/>
        
        <!-- Upper Duplex Cantilever Floor -->
        <polygon points="140,180 230,230 230,130 140,80" fill="url(#duplexIndigo)"/>
        <polygon points="230,230 330,175 330,75 230,130" fill="#3730a3"/>
        <polygon points="140,80 230,130 330,75 240,25" fill="#a5b4fc"/>
        
        <!-- Glass Terraces & Balconies -->
        <polygon points="150,170 220,210 220,150 150,110" fill="#fef08a" opacity="0.85"/>
        <polygon points="240,215 315,175 315,115 240,155" fill="#fef08a" opacity="0.85"/>
        
        <!-- Green Landscaping -->
        <circle cx="130" cy="275" r="14" fill="#22c55e"/>
        <circle cx="340" cy="275" r="16" fill="#16a34a"/>
      </g>
    </svg>
  `,

  'pent-houses': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="skyPent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <filter id="pentShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#pentShadow)">
        <!-- Skyscraper Base -->
        <polygon points="130,340 256,410 256,430 130,360" fill="#1e293b"/>
        <polygon points="256,410 382,340 382,360 256,430" fill="#0f172a"/>
        <polygon points="130,340 256,410 382,340 256,270" fill="#334155"/>
        
        <!-- Rooftop Terrace -->
        <polygon points="140,270 256,335 372,270 256,205" fill="#e2e8f0"/>
        
        <!-- Sky Penthouse Glass Pavilion -->
        <polygon points="170,220 250,265 250,135 170,90" fill="url(#skyPent)" opacity="0.85"/>
        <polygon points="250,265 330,220 330,90 250,135" fill="#0369a1" opacity="0.85"/>
        <polygon points="170,90 250,135 330,90 250,45" fill="#bae6fd"/>
        
        <!-- Rooftop Infinity Pool -->
        <polygon points="260,300 340,255 310,235 230,280" fill="#0ea5e9"/>
        <polygon points="262,298 338,257 312,237 232,278" fill="#e0f2fe" opacity="0.4"/>
        
        <!-- Lounge chairs & potted palms -->
        <rect x="200" y="270" width="14" height="7" rx="2" fill="#ffffff" transform="rotate(30 200 270)"/>
        <circle cx="345" cy="245" r="9" fill="#22c55e"/>
      </g>
    </svg>
  `,

  'agriculture-land': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="agriSoil" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="100%" stop-color="#4d7c0f"/>
        </linearGradient>
        <filter id="agriShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#agriShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#713f12"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#854d0e"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="url(#agriSoil)"/>
        
        <!-- Cultivated Furrow Rows / Crops -->
        <line x1="160" y1="240" x2="316" y2="330" stroke="#65a30d" stroke-width="8"/>
        <line x1="190" y1="225" x2="346" y2="315" stroke="#a3e635" stroke-width="8"/>
        <line x1="220" y1="210" x2="376" y2="300" stroke="#65a30d" stroke-width="8"/>
        
        <!-- Miniature Tractor -->
        <polygon points="230,270 260,285 260,265 230,250" fill="#dc2626"/>
        <circle cx="235" cy="275" r="7" fill="#1e293b"/>
        <circle cx="255" cy="285" r="5" fill="#1e293b"/>
        
        <!-- Agro Trees -->
        <circle cx="130" cy="270" r="16" fill="#15803d"/>
        <circle cx="380" cy="270" r="18" fill="#16a34a"/>
      </g>
    </svg>
  `,

  'owner-properties': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="ownerTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14b8a6"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
        <filter id="ownerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#ownerShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f8fafc"/>
        
        <!-- Cozy House -->
        <polygon points="160,240 240,285 240,195 160,150" fill="url(#ownerTeal)"/>
        <polygon points="240,285 320,240 320,150 240,195" fill="#115e59"/>
        <!-- Roof -->
        <polygon points="145,150 240,200 240,165 145,115" fill="#f59e0b"/>
        <polygon points="240,200 335,145 335,110 240,165" fill="#d97706"/>
        
        <!-- Zero Brokerage Badge with Key -->
        <circle cx="330" cy="180" r="32" fill="#10b981"/>
        <circle cx="330" cy="180" r="26" fill="#ffffff"/>
        <circle cx="330" cy="180" r="22" fill="#10b981"/>
        <polygon points="325,188 335,188 332,170 328,170" fill="#ffffff"/>
        <circle cx="330" cy="170" r="6" fill="#ffffff"/>
      </g>
    </svg>
  `,

  'builder-share-properties': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="builderOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </linearGradient>
        <filter id="buildShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#buildShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f1f5f9"/>
        
        <!-- Multi Unit Builder Floor Structure -->
        <polygon points="160,260 250,310 250,130 160,80" fill="url(#builderOrange)"/>
        <polygon points="250,310 330,265 330,85 250,130" fill="#9a3412"/>
        <polygon points="160,80 250,130 330,85 240,35" fill="#fdba74"/>
        
        <!-- Unit Partition Highlights -->
        <line x1="160" y1="140" x2="250" y2="190" stroke="#ffffff" stroke-width="3"/>
        <line x1="160" y1="200" x2="250" y2="250" stroke="#ffffff" stroke-width="3"/>
        <line x1="250" y1="190" x2="330" y2="145" stroke="#ffffff" stroke-width="3"/>
        <line x1="250" y1="250" x2="330" y2="205" stroke="#ffffff" stroke-width="3"/>
        
        <!-- Golden Handshake / Seal Icon -->
        <circle cx="340" cy="220" r="26" fill="#eab308"/>
        <circle cx="340" cy="220" r="22" fill="#ca8a04"/>
      </g>
    </svg>
  `,

  'commercial-spaces': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="commGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <filter id="commShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#commShadow)">
        <!-- Plaza Ground -->
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#e2e8f0"/>
        
        <!-- Glass Corporate Tower -->
        <polygon points="180,280 260,325 260,95 180,50" fill="url(#commGlass)"/>
        <polygon points="260,325 330,285 330,55 260,95" fill="#075985"/>
        <polygon points="180,50 260,95 330,55 250,10" fill="#bae6fd"/>
        
        <!-- Glass Window Panes -->
        <line x1="180" y1="90" x2="260" y2="135" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="180" y1="130" x2="260" y2="175" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="180" y1="170" x2="260" y2="215" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="180" y1="210" x2="260" y2="255" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        
        <line x1="260" y1="135" x2="330" y2="95" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="260" y1="175" x2="330" y2="135" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="260" y1="215" x2="330" y2="175" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
        <line x1="260" y1="255" x2="330" y2="215" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
      </g>
    </svg>
  `,

  'shops-showrooms': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="shopAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <filter id="shopShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#shopShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f8fafc"/>
        
        <!-- Storefront Building -->
        <polygon points="160,250 250,300 250,170 160,120" fill="#f1f5f9"/>
        <polygon points="250,300 330,255 330,125 250,170" fill="#e2e8f0"/>
        
        <!-- Striped Retail Awning (Orange & White) -->
        <polygon points="140,200 240,255 240,230 140,175" fill="url(#shopAmber)"/>
        <polygon points="240,255 330,205 330,180 240,230" fill="#d97706"/>
        
        <!-- Bright Display Window with Mannequins / Products -->
        <polygon points="175,260 235,293 235,225 175,192" fill="#fef08a" opacity="0.9"/>
        <polygon points="255,293 315,260 315,192 255,225" fill="#fef08a" opacity="0.9"/>
      </g>
    </svg>
  `,

  'shopping-malls': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="mallPink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#be185d"/>
        </linearGradient>
        <filter id="mallShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#mallShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f1f5f9"/>
        
        <!-- Grand Mall Complex -->
        <polygon points="140,260 256,325 256,145 140,80" fill="url(#mallPink)"/>
        <polygon points="256,325 360,265 360,85 256,145" fill="#9d174d"/>
        <polygon points="140,80 256,145 360,85 244,20" fill="#f472b6"/>
        
        <!-- Glass Atrium Dome in Center -->
        <ellipse cx="256" cy="110" rx="35" ry="20" fill="#38bdf8" opacity="0.85"/>
        
        <!-- Grand Entrance Plaza -->
        <polygon points="210,295 256,322 300,297 256,270" fill="#fde047"/>
      </g>
    </svg>
  `,

  'godowns-warehouses': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="wareCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#0e7490"/>
        </linearGradient>
        <filter id="wareShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#wareShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#94a3b8"/>
        
        <!-- Warehouse Shed Structure -->
        <polygon points="140,240 240,295 240,165 140,110" fill="url(#wareCyan)"/>
        <polygon points="240,295 360,225 360,95 240,165" fill="#155e75"/>
        <!-- Pitched Industrial Roof -->
        <polygon points="130,110 240,170 240,140 130,80" fill="#64748b"/>
        <polygon points="240,170 370,95 370,65 240,140" fill="#475569"/>
        
        <!-- Shutter Loading Bays -->
        <polygon points="160,240 195,260 195,220 160,200" fill="#e2e8f0"/>
        <polygon points="205,265 240,285 240,245 205,225" fill="#e2e8f0"/>
        
        <!-- Delivery Truck -->
        <polygon points="280,260 320,282 320,260 280,238" fill="#ef4444"/>
        <circle cx="290" cy="265" r="5" fill="#0f172a"/>
        <circle cx="310" cy="276" r="5" fill="#0f172a"/>
      </g>
    </svg>
  `,

  'pg-coliving-spaces': `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="pgViolet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#6d28d9"/>
        </linearGradient>
        <filter id="pgShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="#ffffff"/>
      
      <g filter="url(#pgShadow)">
        <polygon points="100,280 256,370 256,410 100,320" fill="#334155"/>
        <polygon points="256,370 412,280 412,320 256,410" fill="#1e293b"/>
        <polygon points="256,190 412,280 256,370 100,280" fill="#f8fafc"/>
        
        <!-- Co-living Modern Studio Building with Terraces -->
        <polygon points="150,240 230,285 230,145 150,100" fill="url(#pgViolet)"/>
        <polygon points="230,285 330,230 330,90 230,145" fill="#5b21b6"/>
        <polygon points="150,100 230,145 330,90 250,45" fill="#c4b5fd"/>
        
        <!-- Rooftop Cafe / Lounge Terrace -->
        <circle cx="280" cy="115" r="8" fill="#f59e0b"/>
        <rect x="250" y="105" width="12" height="6" fill="#ffffff"/>
        
        <!-- Glowing Windows with Room Lights -->
        <polygon points="165,220 215,250 215,200 165,170" fill="#fde047" opacity="0.85"/>
        <polygon points="245,250 310,215 310,165 245,200" fill="#fde047" opacity="0.85"/>
      </g>
    </svg>
  `
};

async function renderImages() {
  for (const [slug, svg] of Object.entries(categorySvgs)) {
    const outputPath = path.join(targetDir, `${slug}.jpg`);
    const buffer = Buffer.from(svg.trim());
    await sharp(buffer)
      .resize(600, 600)
      .jpeg({ quality: 95 })
      .toFile(outputPath);
    console.log(`Rendered ${slug}.jpg`);
  }
}

renderImages().catch(console.error);
