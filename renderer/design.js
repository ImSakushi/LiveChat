const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const btnText = document.getElementById('btnText');
const btnImage = document.getElementById('btnImage');
const btnVideo = document.getElementById('btnVideo');
const btnAudio = document.getElementById('btnAudio');
const btnSend  = document.getElementById('btnSend');

// Preload audio icon for design preview
const audioIcon = new Image();
audioIcon.src = '../audio.svg';

let scene     = [];  // éléments { type, x, y, … }
let selected  = null;
let mode      = null;
let startX, startY, origX, origY, origW, origH, origFont;

// — Redraw de tout :
function redraw() {
  ctx.clearRect(0,0, canvas.width, canvas.height);
  scene.forEach(el => {
    if (el.type === 'text') {
      ctx.save();
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
      ctx.restore();

    } else if (el.type === 'image') {
      if (!el.imgObj) return;
      ctx.save();
      // apply image opacity
      const imgOp = el.opacity != null ? el.opacity : 1;
      ctx.globalAlpha = imgOp;
      ctx.drawImage(el.imgObj, el.x, el.y, el.width, el.height);
      // image border if needed
      if (el.strokeWidth > 0) {
        ctx.lineWidth = el.strokeWidth;
        ctx.strokeStyle = el.strokeColor;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      ctx.restore();
    } else if (el.type === 'video') {
      if (!el.videoObj) return;
      ctx.save();
      // draw video frame
      ctx.drawImage(el.videoObj, el.x, el.y, el.width, el.height);
      ctx.restore();
    } else if (el.type === 'audio') {
      if (!el.svgObj) return;
      ctx.save();
      // draw audio icon
      ctx.drawImage(el.svgObj, el.x, el.y, el.width, el.height);
      ctx.restore();
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

// — Modal VIDÉO
const mvOverlay = document.getElementById('modal-video-overlay');
const mvFile    = document.getElementById('modal-video-file');
const mvOk      = document.getElementById('modal-video-ok');
const mvCancel  = document.getElementById('modal-video-cancel');
const mvFadeIn  = document.getElementById('modal-video-fadein');
const mvHold    = document.getElementById('modal-video-hold');
const mvFadeOut = document.getElementById('modal-video-fadeout');
const mvWidth   = document.getElementById('modal-video-width');
const mvHeight  = document.getElementById('modal-video-height');

function openVideoModal() {
  return new Promise(resolve => {
    mvFile.value = '';
    mvFadeIn.value = '1'; mvHold.value = '3'; mvFadeOut.value = '1';
    mvWidth.value = '200'; mvHeight.value = '200';
    mvOverlay.style.display = 'flex';

    function onFileChange() {
      const file = mvFile.files[0]; if (!file) return;
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        mvWidth.value = vid.videoWidth;
        mvHeight.value = vid.videoHeight;
        URL.revokeObjectURL(url);
      };
      vid.src = url;
    }

    function cleanup() {
      mvOverlay.style.display = 'none';
      mvOk.removeEventListener('click', onOk);
      mvCancel.removeEventListener('click', onCancel);
      mvFile.removeEventListener('change', onFileChange);
    }

    function onOk() {
      const file = mvFile.files[0]; if (!file) { cleanup(); return resolve(null); }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          src     : reader.result,
          fadeIn  : Math.max(0, parseFloat(mvFadeIn.value))  *1000,
          hold    : Math.max(0, parseFloat(mvHold.value))    *1000,
          fadeOut : Math.max(0, parseFloat(mvFadeOut.value)) *1000,
          width   : Math.max(1, parseInt(mvWidth.value,10)),
          height  : Math.max(1, parseInt(mvHeight.value,10))
        });
      };
      reader.readAsDataURL(file);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    mvFile.addEventListener('change', onFileChange);
    mvOk.addEventListener('click', onOk);
    mvCancel.addEventListener('click', onCancel);
  });
}

// — Modal AUDIO
const aaOverlay = document.getElementById('modal-audio-overlay');
const aaFile    = document.getElementById('modal-audio-file');
const aaOk      = document.getElementById('modal-audio-ok');
const aaCancel  = document.getElementById('modal-audio-cancel');
const aaFadeIn  = document.getElementById('modal-audio-fadein');
const aaHold    = document.getElementById('modal-audio-hold');
const aaFadeOut = document.getElementById('modal-audio-fadeout');
const aaWidth   = document.getElementById('modal-audio-width');
const aaHeight  = document.getElementById('modal-audio-height');

function openAudioModal() {
  return new Promise(resolve => {
    aaFile.value = '';
    aaFadeIn.value = '1'; aaHold.value = '3'; aaFadeOut.value = '1';
    aaWidth.value = '100'; aaHeight.value = '100';
    aaOverlay.style.display = 'flex';

    function cleanup() {
      aaOverlay.style.display = 'none';
      aaOk.removeEventListener('click', onOk);
      aaCancel.removeEventListener('click', onCancel);
    }

    function onOk() {
      const file = aaFile.files[0]; if (!file) { cleanup(); return resolve(null); }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          src     : reader.result,
          fadeIn  : Math.max(0, parseFloat(aaFadeIn.value))  *1000,
          hold    : Math.max(0, parseFloat(aaHold.value))    *1000,
          fadeOut : Math.max(0, parseFloat(aaFadeOut.value)) *1000,
          width   : Math.max(1, parseInt(aaWidth.value,10)),
          height  : Math.max(1, parseInt(aaHeight.value,10))
        });
      };
      reader.readAsDataURL(file);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    aaOk.addEventListener('click', onOk);
    aaCancel.addEventListener('click', onCancel);
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
    fadeOut: result.fadeOut,
    fontFamily: 'sans-serif',
    fontPath: null,
    color: '#222222',
    strokeWidth: 0,
    strokeColor: '#000000',
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
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
    fadeOut: result.fadeOut,
    strokeWidth: 0,
    strokeColor: '#000000',
    opacity: 1
  });
  // une fois l'image chargée, redraw
  img.onload = redraw;
};
// — Bouton Vidéo
btnVideo.onclick = async () => {
  const result = await openVideoModal();
  if (!result) return;
  // crée l'objet Video pour preview
  const vid = document.createElement('video');
  vid.src = result.src;
  scene.push({
    type: 'video',
    x: Math.round(Math.random() * (canvas.width  - result.width - 20) + 10),
    y: Math.round(Math.random() * (canvas.height - result.height - 20) + 10),
    src: result.src,
    videoObj: vid,
    width:  result.width,
    height: result.height,
    fadeIn:  result.fadeIn,
    hold:    result.hold,
    fadeOut: result.fadeOut
  });
  vid.onloadeddata = redraw;
};
// — Bouton Audio
btnAudio.onclick = async () => {
  const result = await openAudioModal();
  if (!result) return;
  // crée l'objet audio icon pour preview
  const img = audioIcon;
  scene.push({
    type: 'audio',
    x: Math.round(Math.random() * (canvas.width  - result.width - 20) + 10),
    y: Math.round(Math.random() * (canvas.height - result.height - 20) + 10),
    src: result.src,
    svgObj: img,
    width:  result.width,
    height: result.height,
    fadeIn:  result.fadeIn,
    hold:    result.hold,
    fadeOut: result.fadeOut
  });
  // redraw when icon loaded
  img.onload = redraw;
};
// — Bouton Send
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
        text:         el.text,
        fontSize:     el.fontSize,
        fontFamily:   el.fontFamily,
        color:        el.color,
        strokeWidth:  el.strokeWidth,
        strokeColor:  el.strokeColor,
        shadowColor:  el.shadowColor,
        shadowBlur:   el.shadowBlur,
        shadowOffsetX: el.shadowOffsetX,
        shadowOffsetY: el.shadowOffsetY
      };
    } else if (el.type === 'image') {
      return {
        ...base,
        src: el.src,   // dataURL ou URL
        strokeWidth: el.strokeWidth,
        strokeColor: el.strokeColor,
        opacity:     el.opacity
      };
    } else if (el.type === 'video' || el.type === 'audio') {
      return {
        ...base,
        src: el.src
      };
    }
  });

  window.electronAPI.sendScene(cleanScene);
});
// — Propriétés Panel pour Text
const propsPanel = document.getElementById('properties-panel');
const propHeader = document.getElementById('properties-header');
const propColor = document.getElementById('prop-color');
const propFont = document.getElementById('prop-font');
// Populate font options dynamically from system
(async () => {
  const fonts = await window.electronAPI.getSystemFonts();
  propFont.innerHTML = '';
  const generic = ['sans-serif', 'serif', 'monospace'];
  generic.forEach(gen => {
    const opt = document.createElement('option');
    opt.value = gen;
    opt.textContent = gen;
    propFont.appendChild(opt);
  });
  fonts.forEach(font => {
    const opt = document.createElement('option');
    opt.value = font.path;
    opt.textContent = font.name;
    propFont.appendChild(opt);
  });
})();
const propStrokeWidth = document.getElementById('prop-strokeWidth');
const propStrokeColor = document.getElementById('prop-strokeColor');
const propShadowColor = document.getElementById('prop-shadowColor');
const propShadowBlur = document.getElementById('prop-shadowBlur');
const propShadowOffsetX = document.getElementById('prop-shadowOffsetX');
const propShadowOffsetY = document.getElementById('prop-shadowOffsetY');
// Containers for props fields
const propsTextFields  = document.getElementById('props-text-fields');
const propsImageFields = document.getElementById('props-image-fields');
// Image properties inputs
const propImgWidth       = document.getElementById('prop-img-width');
const propImgHeight      = document.getElementById('prop-img-height');
const propImgStrokeWidth = document.getElementById('prop-img-strokeWidth');
const propImgStrokeColor = document.getElementById('prop-img-strokeColor');
const propOpacity        = document.getElementById('prop-opacity');

let draggingPanel = false, panelStartX = 0, panelStartY = 0, panelX = 0, panelY = 0;

propHeader.addEventListener('mousedown', e => {
  draggingPanel = true;
  panelStartX = e.clientX;
  panelStartY = e.clientY;
  const rect = propsPanel.getBoundingClientRect();
  panelX = rect.left;
  panelY = rect.top;
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!draggingPanel) return;
  const dx = e.clientX - panelStartX;
  const dy = e.clientY - panelStartY;
  propsPanel.style.left = (panelX + dx) + 'px';
  propsPanel.style.top = (panelY + dy) + 'px';
  propsPanel.style.right = 'auto';
});

window.addEventListener('mouseup', () => draggingPanel = false);

function updatePropsPanel() {
  if (!selected) {
    propsPanel.style.display = 'none';
    return;
  }
  propsPanel.style.display = 'block';
  if (selected.type === 'text') {
    propHeader.textContent = 'Propriétés Texte';
    propsTextFields.style.display = 'block';
    propsImageFields.style.display = 'none';
    propColor.value = selected.color;
    propFont.value = selected.fontPath || selected.fontFamily;
    propStrokeWidth.value = selected.strokeWidth;
    propStrokeColor.value = selected.strokeColor;
    propShadowColor.value = selected.shadowColor;
    propShadowBlur.value = selected.shadowBlur;
    propShadowOffsetX.value = selected.shadowOffsetX;
    propShadowOffsetY.value = selected.shadowOffsetY;
  } else if (selected.type === 'image') {
    propHeader.textContent = 'Propriétés Image';
    propsTextFields.style.display = 'none';
    propsImageFields.style.display = 'block';
    propImgWidth.value = selected.width;
    propImgHeight.value = selected.height;
    propImgStrokeWidth.value = selected.strokeWidth;
    propImgStrokeColor.value = selected.strokeColor;
    propOpacity.value = selected.opacity;
  }
}

canvas.addEventListener('click', e => {
  const mx = e.offsetX, my = e.offsetY;
  let clicked = null;
  for (let i = scene.length - 1; i >= 0; i--) {
    const el = scene[i];
    let inBox = false;
    if (el.type === 'text') {
      inBox = isInRect(mx, my, el.x, el.y - el.height, el.width, el.height);
    } else if (el.type === 'image') {
      inBox = isInRect(mx, my, el.x, el.y, el.width, el.height);
    }
    if (inBox) {
      clicked = el;
      break;
    }
  }
  selected = clicked;
  redraw();
  updatePropsPanel();
});

propColor.addEventListener('input', () => {
  if (!selected) return;
  selected.color = propColor.value;
  redraw();
});

propFont.addEventListener('change', async () => {
    if (!selected || selected.type !== 'text') return;
    const value = propFont.value;
    let fontFamily = value;
    let fontPath = null;
    // Check for custom font path vs generic
    if (value !== 'sans-serif' && value !== 'serif' && value !== 'monospace') {
      fontPath = value;
      fontFamily = propFont.options[propFont.selectedIndex].text;
      // Load font via FontFace API
      const base64 = await window.electronAPI.loadFontFile(fontPath);
      if (base64) {
        const ext = fontPath.split('.').pop().toLowerCase();
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
    // Update element properties
    selected.fontFamily = fontFamily;
    selected.fontPath = fontPath;
    // Re-measure dimensions
    ctx.font = `${selected.fontSize}px ${selected.fontFamily}`;
    const m = ctx.measureText(selected.text);
    selected.width = m.width;
    selected.height = selected.fontSize;
    redraw();
  });

propStrokeWidth.addEventListener('input', () => {
  if (!selected) return;
  selected.strokeWidth = parseFloat(propStrokeWidth.value);
  redraw();
});

propStrokeColor.addEventListener('input', () => {
  if (!selected) return;
  selected.strokeColor = propStrokeColor.value;
  redraw();
});

propShadowColor.addEventListener('input', () => {
  if (!selected) return;
  selected.shadowColor = propShadowColor.value;
  redraw();
});

propShadowBlur.addEventListener('input', () => {
  if (!selected) return;
  selected.shadowBlur = parseFloat(propShadowBlur.value);
  redraw();
});

propShadowOffsetX.addEventListener('input', () => {
  if (!selected) return;
  selected.shadowOffsetX = parseInt(propShadowOffsetX.value, 10);
  redraw();
});

propShadowOffsetY.addEventListener('input', () => {
  if (!selected) return;
  selected.shadowOffsetY = parseInt(propShadowOffsetY.value, 10);
  redraw();
});
// Image property listeners
propImgWidth.addEventListener('input', () => {
  if (!selected || selected.type !== 'image') return;
  selected.width = Math.max(1, parseInt(propImgWidth.value, 10));
  redraw();
});
propImgHeight.addEventListener('input', () => {
  if (!selected || selected.type !== 'image') return;
  selected.height = Math.max(1, parseInt(propImgHeight.value, 10));
  redraw();
});
propImgStrokeWidth.addEventListener('input', () => {
  if (!selected || selected.type !== 'image') return;
  selected.strokeWidth = parseFloat(propImgStrokeWidth.value);
  redraw();
});
propImgStrokeColor.addEventListener('input', () => {
  if (!selected || selected.type !== 'image') return;
  selected.strokeColor = propImgStrokeColor.value;
  redraw();
});
propOpacity.addEventListener('input', () => {
  if (!selected || selected.type !== 'image') return;
  selected.opacity = parseFloat(propOpacity.value);
  redraw();
});