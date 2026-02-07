/**
 * Generate PWA icons from SVG
 * 
 * This script creates PNG icons for the PWA manifest.
 * Run with: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp (one-time)
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to use sharp if available
    const sharp = require('sharp');
    
    const svgPath = path.join(__dirname, '../public/icon.svg');
    const svg = fs.readFileSync(svgPath);
    
    // Generate 192x192 icon
    await sharp(svg)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/icon-192.png'));
    console.log('✓ Created icon-192.png');
    
    // Generate 512x512 icon
    await sharp(svg)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/icon-512.png'));
    console.log('✓ Created icon-512.png');
    
    console.log('\n✅ PWA icons generated successfully!');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Installing...');
      const { execSync } = require('child_process');
      execSync('npm install sharp --save-dev', { stdio: 'inherit' });
      console.log('\nSharp installed. Please run this script again.');
    } else {
      console.error('Error generating icons:', err);
    }
  }
}

generateIcons();
