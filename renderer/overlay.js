const canvas = document.getElementById('overlayCanvas');
const ctx    = canvas.getContext('2d');

function resizeOverlay() {
  const dpr   = window.devicePixelRatio || 1;
  const cssW  = window.innerWidth;
  const cssH  = window.innerHeight;

  // 1) Full-screen en CSS
  canvas.style.position = 'absolute';
  canvas.style.top      = '0';
  canvas.style.left     = '0';
  canvas.style.width    = `${cssW}px`;
  canvas.style.height   = `${cssH}px`;

  // 2) Backing-store en haute-résolution
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;

  // 3) Calcul des échelles sur les 1280×720 d'origine
  const scaleX = canvas.width  / 1280;  // = dpr * (cssW/1280)
  const scaleY = canvas.height / 720;   // = dpr * (cssH/720)

  // 4) On passe tout dans un seul setTransform pour que
  //     fillText(x,y) et drawImage(...) utilisent tes coords de design
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  // 5) Plus de lissage pour garder les pixels nets
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeOverlay);
window.addEventListener('DOMContentLoaded', resizeOverlay);

// 2) Réception + preload images
window.electronAPI.onRenderScene(async scene => {
  // preload images
  const imgEls = scene.filter(el => el.type === 'image');
  await Promise.all(imgEls.map(el => new Promise(res => {
    const img = new Image();
    img.onload = () => { el.imgObj = img; res(); };
    img.src = el.src;
  })));

  // preload fonts
  const textEls = scene.filter(el => el.type === 'text');
  if (textEls.length > 0) {
    const systemFonts = await window.electronAPI.getSystemFonts();
    const uniqueFonts = Array.from(new Set(textEls.map(el => el.fontFamily)));
    for (const fontFamily of uniqueFonts) {
      if (['sans-serif', 'serif', 'monospace'].includes(fontFamily.toLowerCase())) {
        continue;
      }
      const match = systemFonts.find(f => f.name === fontFamily);
      if (match && match.path) {
        const base64 = await window.electronAPI.loadFontFile(match.path);
        if (base64) {
          const ext = match.path.split('.').pop().toLowerCase();
          const mime = ext === 'otf' ? 'font/otf' : 'font/ttf';
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
          const blob = new Blob([array], { type: mime });
          const url = URL.createObjectURL(blob);
          const fontFace = new FontFace(fontFamily, `url(${url})`);
          try {
            await fontFace.load();
            document.fonts.add(fontFace);
          } catch (e) {
            console.error('Failed to load font', fontFamily, e);
          }
        }
      }
    }
  }
  const startTime = performance.now();
  const totalTime = Math.max(...scene.map(el => el.fadeIn + el.hold + el.fadeOut));

  function animate(now) {
    const t = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    scene.forEach(el => {
      let alpha = 0;
      if (t < el.fadeIn)                      alpha = t / el.fadeIn;
      else if (t < el.fadeIn + el.hold)       alpha = 1;
      else if (t < el.fadeIn + el.hold + el.fadeOut)
        alpha = 1 - ((t - el.fadeIn - el.hold) / el.fadeOut);
      if (alpha <= 0) return;

      ctx.save();
      // Apply fade alpha and element opacity
      const elemOpacity = el.opacity != null ? el.opacity : 1;
      ctx.globalAlpha = alpha * elemOpacity;
      if (el.type === 'text') {
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        ctx.fillStyle = el.color;
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = el.shadowColor;
        ctx.shadowBlur = el.shadowBlur;
        ctx.shadowOffsetX = el.shadowOffsetX;
        ctx.shadowOffsetY = el.shadowOffsetY;
        if (el.strokeWidth > 0) {
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeStyle = el.strokeColor;
          ctx.strokeText(el.text, el.x, el.y);
        }
        ctx.fillText(el.text, el.x, el.y);
      } else if (el.type === 'image') {
        ctx.drawImage(el.imgObj, el.x, el.y, el.width, el.height);
        // Optional border for image
        if (el.strokeWidth > 0) {
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeStyle = el.strokeColor;
          ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
      }
      ctx.restore();
    });

    if (t < totalTime) requestAnimationFrame(animate);
    else window.electronAPI.toggleOverlay(false);
  }

  requestAnimationFrame(animate);
});
