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

      ctx.globalAlpha    = alpha;
      if (el.type === 'text') {
        ctx.font         = `${el.fontSize}px sans-serif`;
        ctx.fillStyle    = '#ff4081';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(el.text, el.x, el.y);

      } else if (el.type === 'image') {
        ctx.drawImage(el.imgObj, el.x, el.y, el.width, el.height);
      }

      ctx.globalAlpha = 1;
    });

    if (t < totalTime) requestAnimationFrame(animate);
    else window.electronAPI.toggleOverlay(false);
  }

  requestAnimationFrame(animate);
});
