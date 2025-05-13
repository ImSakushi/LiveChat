const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const btnText = document.getElementById('btnText');
const btnImage= document.getElementById('btnImage');
const btnSend = document.getElementById('btnSend');

let scene     = [];  // éléments { type, x, y, … }
let selected  = null;
let mode      = null;
let startX, startY, origX, origY, origW, origH, origFont;

// — Redraw de tout :
function redraw() {
  ctx.clearRect(0,0, canvas.width, canvas.height);
  scene.forEach(el => {
    if (el.type === 'text') {
      ctx.font      = `${el.fontSize}px sans-serif`;
      ctx.fillStyle = '#222';
      // coordonnée x,y déjà arrondie
      ctx.fillText(el.text, el.x, el.y);

    } else if (el.type === 'image') {
      if (!el.imgObj) return;
      ctx.drawImage(el.imgObj, el.x, el.y, el.width, el.height);
    }

    if (el === selected) {
      // Bounding box
      ctx.strokeStyle = '#ff4081';
      ctx.lineWidth   = 2;
      ctx.strokeRect(el.x - 4, el.y - (el.type==='text'? el.height:0) - 4, 
                     el.width + 8, (el.type==='text'? el.height:el.height) + 8);
      // Handle resize
      const hx = el.x + el.width + 4 - 8;
      const hy = el.y + (el.type==='text'?4:-4) + (el.type==='text'?0:el.height) - 8;
      ctx.fillStyle   = '#fff';
      ctx.strokeStyle = '#ff4081';
      ctx.lineWidth   = 1;
      ctx.fillRect(hx, hy, 16, 16);
      ctx.strokeRect(hx, hy, 16, 16);
    }
  });
}

// Utility de détection
function isInRect(x,y, rx,ry,rw,rh){
  return x>=rx && x<=rx+rw && y>=ry && y<=ry+rh;
}

// — Gestion du clic pour move/resize :
canvas.addEventListener('mousedown', e => {
  const mx = e.offsetX, my = e.offsetY;
  for (let i = scene.length-1; i>=0; i--) {
    const el = scene[i];
    // handle resize square
    const hx = el.x + el.width + 4 - 8;
    const hy = el.y + (el.type==='text'?4:el.height+4) - 8;
    if (isInRect(mx,my, hx,hy,16,16)) {
      selected = el;
      mode     = 'resize';
      startX   = mx; startY = my;
      origW    = el.width; origH = (el.type==='text'? el.height:el.height);
      origFont = el.fontSize;
      return;
    }
    // handle move bounding box
    const bx = el.x - 4;
    const by = el.y - (el.type==='text'?el.height:0) - 4;
    const bw = el.width + 8;
    const bh = (el.type==='text'?el.height:el.height) + 8;
    if (isInRect(mx,my, bx,by,bw,bh)) {
      selected = el;
      mode     = 'move';
      startX   = mx; startY = my;
      origX    = el.x; origY = el.y;
      return;
    }
  }
  selected = null;
  redraw();
});

canvas.addEventListener('mousemove', e => {
  if (!selected || !mode) return;
  const dx = e.offsetX - startX;
  const dy = e.offsetY - startY;
  if (mode === 'move') {
    selected.x = Math.round(origX + dx);
    selected.y = Math.round(origY + dy);
  } else {
    const newW = Math.max(20, origW + dx);
    const scale= newW / origW;
    if (selected.type === 'text') {
      selected.fontSize = origFont * scale;
      ctx.font = `${selected.fontSize}px sans-serif`;
      const m = ctx.measureText(selected.text);
      selected.width  = m.width;
      selected.height = selected.fontSize;
    } else {
      selected.width  = newW;
      selected.height = Math.round(origH * scale);
    }
  }
  redraw();
});
canvas.addEventListener('mouseup',   () => mode = null);
canvas.addEventListener('mouseleave',() => mode = null);

// — Modal TEXTE (identique à avant) :
const mtOverlay = document.getElementById('modal-text-overlay');
const mtInput   = document.getElementById('modal-text-input');
const mtOk      = document.getElementById('modal-text-ok');
const mtCancel  = document.getElementById('modal-text-cancel');
const mtFadeIn  = document.getElementById('modal-text-fadein');
const mtHold    = document.getElementById('modal-text-hold');
const mtFadeOut = document.getElementById('modal-text-fadeout');

function openTextModal() {
  return new Promise(resolve => {
    mtInput.value = '';
    mtFadeIn.value = '1'; mtHold.value = '3'; mtFadeOut.value = '1';
    mtOverlay.style.display = 'flex';
    mtInput.focus();
    function cleanup() {
      mtOverlay.style.display = 'none';
      mtOk.removeEventListener('click', onOk);
      mtCancel.removeEventListener('click', onCancel);
      mtOverlay.removeEventListener('keydown', onKey);
    }
    function onOk() {
      cleanup();
      const text = mtInput.value.trim();
      if (!text) return resolve(null);
      resolve({
        text,
        fadeIn : Math.max(0, parseFloat(mtFadeIn.value))  *1000,
        hold   : Math.max(0, parseFloat(mtHold.value))    *1000,
        fadeOut: Math.max(0, parseFloat(mtFadeOut.value)) *1000
      });
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKey(e) {
      if (e.key==='Enter') onOk();
      if (e.key==='Escape') onCancel();
    }
    mtOk.addEventListener('click',    onOk);
    mtCancel.addEventListener('click', onCancel);
    mtOverlay.addEventListener('keydown', onKey);
  });
}

// — Modal IMAGE nouveau :
const miOverlay = document.getElementById('modal-image-overlay');
const miFile    = document.getElementById('modal-image-file');
const miOk      = document.getElementById('modal-image-ok');
const miCancel  = document.getElementById('modal-image-cancel');
const miFadeIn  = document.getElementById('modal-image-fadein');
const miHold    = document.getElementById('modal-image-hold');
const miFadeOut = document.getElementById('modal-image-fadeout');
const miWidth   = document.getElementById('modal-image-width');
const miHeight  = document.getElementById('modal-image-height');

function openImageModal() {
  return new Promise(resolve => {
    miFile.value = '';
    miFadeIn.value = '1'; miHold.value = '3'; miFadeOut.value = '1';
    miWidth.value = '200'; miHeight.value = '200';
    miOverlay.style.display = 'flex';

    // met à jour le width/height quand on charge le fichier
    function onFileChange() {
      const file = miFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          miWidth.value  = img.naturalWidth;
          miHeight.value = img.naturalHeight;
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    function cleanup() {
      miOverlay.style.display = 'none';
      miOk.removeEventListener('click', onOk);
      miCancel.removeEventListener('click', onCancel);
      miFile.removeEventListener('change', onFileChange);
    }

    function onOk() {
      const file = miFile.files[0];
      if (!file) { cleanup(); return resolve(null); }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          src     : reader.result,
          fadeIn  : Math.max(0, parseFloat(miFadeIn.value))  *1000,
          hold    : Math.max(0, parseFloat(miHold.value))    *1000,
          fadeOut : Math.max(0, parseFloat(miFadeOut.value)) *1000,
          width   : Math.max(1, parseInt(miWidth.value,10)),
          height  : Math.max(1, parseInt(miHeight.value,10))
        });
      };
      reader.readAsDataURL(file);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    miFile.addEventListener('change', onFileChange);
    miOk .addEventListener('click',  onOk);
    miCancel.addEventListener('click', onCancel);
  });
}

// — Gestion des boutons :
btnText.onclick = async () => {
  const result = await openTextModal();
  if (!result) return;
  // calcul taille
  const fontSize = 32;
  ctx.font = `${fontSize}px sans-serif`;
  const metrics = ctx.measureText(result.text);
  const width  = metrics.width;
  const height = fontSize;
  scene.push({
    type: 'text',
    x: Math.round(Math.random() * (canvas.width - width - 20) + 10),
    y: Math.round(Math.random() * (canvas.height - height - 20) + height + 10),
    text: result.text,
    fontSize, width, height,
    fadeIn: result.fadeIn,
    hold:   result.hold,
    fadeOut:result.fadeOut
  });
  redraw();
};

btnImage.onclick = async () => {
  const result = await openImageModal();
  if (!result) return;
  // crée l'objet Image en mémoire pour le preview
  const img = new Image();
  img.src = result.src;
  scene.push({
    type: 'image',
    x: Math.round(Math.random() * (canvas.width  - result.width - 20) + 10),
    y: Math.round(Math.random() * (canvas.height - result.height - 20) + 10),
    src: result.src,
    imgObj: img,
    width:  result.width,
    height: result.height,
    fadeIn:  result.fadeIn,
    hold:    result.hold,
    fadeOut: result.fadeOut
  });
  // une fois l'image chargée, redraw
  img.onload = redraw;
};

btnSend.addEventListener('click', () => {
  if (scene.length === 0) return;

  // On ne garde que les champs sérialisables : pas de imgObj !
  const cleanScene = scene.map(el => {
    const base = {
      type:    el.type,
      x:       el.x,
      y:       el.y,
      width:   el.width,
      height:  el.height,
      fadeIn:  el.fadeIn,
      hold:    el.hold,
      fadeOut: el.fadeOut
    };
    if (el.type === 'text') {
      return {
        ...base,
        text:     el.text,
        fontSize: el.fontSize
      };
    } else if (el.type === 'image') {
      return {
        ...base,
        src: el.src    // dataURL ou URL
      };
    }
  });

  window.electronAPI.sendScene(cleanScene);
});