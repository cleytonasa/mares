import fs from 'fs';
import path from 'path';

function postBuild() {
  const distDir = path.resolve('dist');
  const productionDir = path.resolve('production');
  const rootAssetsDir = path.resolve('assets');

  if (!fs.existsSync(distDir)) {
    console.error('Dist directory does not exist!');
    return;
  }

  // 1. Ensure production and root assets directories exist
  fs.mkdirSync(productionDir, { recursive: true });
  fs.mkdirSync(rootAssetsDir, { recursive: true });

  // 2. Copy entire dist to production
  fs.cpSync(distDir, productionDir, { recursive: true });

  // 3. Find latest js and css in production/assets
  const prodAssetsDir = path.join(productionDir, 'assets');
  if (fs.existsSync(prodAssetsDir)) {
    const files = fs.readdirSync(prodAssetsDir);
    const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js')) || files.find(f => f.endsWith('.js'));
    const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css')) || files.find(f => f.endsWith('.css'));

    if (jsFile) {
      const jsContent = fs.readFileSync(path.join(prodAssetsDir, jsFile));
      
      // Standard static fallback
      fs.writeFileSync(path.join(prodAssetsDir, 'index.js'), jsContent);
      fs.writeFileSync(path.join(rootAssetsDir, 'index.js'), jsContent);

      // Known previous hashes compatibility
      const legacyHashes = [
        'index-C6_anQIN.js',
        'index-CuEzvBzx.js',
        'index-DTNzCCDl.js',
        'index-CYpz89ZA.js',
        'index-CSoLsOj5.js'
      ];

      legacyHashes.forEach(h => {
        fs.writeFileSync(path.join(prodAssetsDir, h), jsContent);
        fs.writeFileSync(path.join(rootAssetsDir, h), jsContent);
      });
      
      // Copy current hash to root assets as well
      fs.writeFileSync(path.join(rootAssetsDir, jsFile), jsContent);
    }

    if (cssFile) {
      const cssContent = fs.readFileSync(path.join(prodAssetsDir, cssFile));
      
      fs.writeFileSync(path.join(prodAssetsDir, 'index.css'), cssContent);
      fs.writeFileSync(path.join(rootAssetsDir, 'index.css'), cssContent);

      const legacyCss = [
        'index-ofQvceuS.css',
        'index-CLDiKPBo.css',
        'index-4W2EZ6qD.css',
        'index-BDSRvksP.css'
      ];

      legacyCss.forEach(h => {
        fs.writeFileSync(path.join(prodAssetsDir, h), cssContent);
        fs.writeFileSync(path.join(rootAssetsDir, h), cssContent);
      });

      fs.writeFileSync(path.join(rootAssetsDir, cssFile), cssContent);
    }
  }

  // Ensure .htaccess is in production
  const publicHtaccess = path.resolve('public', '.htaccess');
  if (fs.existsSync(publicHtaccess)) {
    fs.copyFileSync(publicHtaccess, path.join(productionDir, '.htaccess'));
  }

  console.log('✅ Post-build processing completed successfully with legacy hash fallbacks!');
}

postBuild();
