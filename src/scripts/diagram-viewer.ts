const dialog = document.querySelector<HTMLDialogElement>('#diagram-viewer')!;
const viewport = dialog.querySelector<HTMLDivElement>('.viewer-viewport')!;
const image = dialog.querySelector<HTMLImageElement>('.viewer-image')!;
const title = dialog.querySelector<HTMLHeadingElement>('#viewer-title')!;
const output = dialog.querySelector<HTMLOutputElement>('#viewer-zoom')!;
const download = dialog.querySelector<HTMLAnchorElement>('#viewer-download')!;
const message = dialog.querySelector<HTMLParagraphElement>('.viewer-message')!;

let scale = 1;
let fitScale = 1;
let x = 0;
let y = 0;
let ready = false;
let opener: HTMLElement | null = null;
const pointers = new Map<number, { x: number; y: number }>();

function draw() {
  image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  output.value = `${Math.round(scale * 100)}%`;
}

function fit() {
  if (!ready || !viewport.clientWidth || !image.naturalWidth) return;
  fitScale = Math.min((viewport.clientWidth - 40) / image.naturalWidth, (viewport.clientHeight - 40) / image.naturalHeight, 1);
  scale = fitScale;
  x = (viewport.clientWidth - image.naturalWidth * scale) / 2;
  y = (viewport.clientHeight - image.naturalHeight * scale) / 2;
  draw();
}

function zoom(factor: number, centerX = viewport.clientWidth / 2, centerY = viewport.clientHeight / 2) {
  if (!ready) return;
  const next = Math.max(fitScale / 2, Math.min(Math.max(fitScale * 32, 4), scale * factor));
  x = centerX - (centerX - x) * (next / scale);
  y = centerY - (centerY - y) * (next / scale);
  scale = next;
  draw();
}

function open(link: HTMLAnchorElement) {
  opener = link;
  ready = false;
  image.hidden = true;
  message.hidden = false;
  message.textContent = 'Loading diagram…';
  title.textContent = link.dataset.title || link.querySelector('img')?.alt || 'Diagram';
  image.alt = title.textContent;
  download.href = link.href;
  dialog.showModal();
  document.body.classList.add('viewer-open');
  image.onload = () => {
    ready = true;
    image.style.width = `${image.naturalWidth}px`;
    image.style.height = `${image.naturalHeight}px`;
    image.hidden = false;
    message.hidden = true;
    fit();
  };
  image.onerror = () => {
    ready = false;
    message.hidden = false;
    message.textContent = 'The diagram could not be loaded. Use the download link to open the original.';
  };
  image.src = link.href;
  viewport.focus();
}

// Enhance ordinary article images as well; the original image stays readable without JavaScript.
document.querySelectorAll<HTMLImageElement>('.prose img').forEach((img) => {
  if (img.closest('a')) return;
  const link = document.createElement('a');
  link.href = img.src;
  link.dataset.diagram = '';
  link.dataset.title = img.alt || 'Article image';
  link.className = 'article-image-link';
  link.setAttribute('aria-label', `Expand ${img.alt || 'article image'}`);
  img.replaceWith(link);
  link.append(img);
});

document.querySelectorAll<HTMLAnchorElement>('[data-diagram]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  });
});

dialog.querySelectorAll<HTMLButtonElement>('[data-viewer]').forEach((button) => {
  button.addEventListener('click', () => {
    switch (button.dataset.viewer) {
      case 'in': zoom(1.15); break;
      case 'out': zoom(1 / 1.15); break;
      case 'fit': fit(); break;
      case 'close': dialog.close(); break;
    }
  });
});

dialog.addEventListener('close', () => {
  document.body.classList.remove('viewer-open');
  pointers.clear();
  viewport.classList.remove('dragging');
  opener?.focus({ preventScroll: true });
});

viewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  const bounds = viewport.getBoundingClientRect();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
  // Normalize pixel/line/page deltas and limit each wheel event to a 6% change.
  // Small trackpad movements remain proportional; coarse mouse wheels stay gentle.
  zoom(Math.exp(-Math.max(-60, Math.min(60, delta)) * 0.001), event.clientX - bounds.left, event.clientY - bounds.top);
}, { passive: false });

viewport.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  viewport.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  viewport.classList.add('dragging');
});

viewport.addEventListener('pointermove', (event) => {
  const previous = pointers.get(event.pointerId);
  if (!previous || !ready) return;
  const before = [...pointers.values()];
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const after = [...pointers.values()];
  if (before.length === 1) {
    x += event.clientX - previous.x;
    y += event.clientY - previous.y;
  } else {
    const mid = (points: typeof before) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
    const distance = (points: typeof before) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const oldCenter = mid(before);
    const newCenter = mid(after);
    const bounds = viewport.getBoundingClientRect();
    const previousDistance = distance(before);
    if (previousDistance > 0) zoom(distance(after) / previousDistance, oldCenter.x - bounds.left, oldCenter.y - bounds.top);
    x += newCenter.x - oldCenter.x;
    y += newCenter.y - oldCenter.y;
  }
  draw();
});

for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  viewport.addEventListener(eventName, (event) => {
    pointers.delete((event as PointerEvent).pointerId);
    if (!pointers.size) viewport.classList.remove('dragging');
  });
}

viewport.addEventListener('keydown', (event) => {
  const offsets: Record<string, [number, number]> = { ArrowLeft: [50, 0], ArrowRight: [-50, 0], ArrowUp: [0, 50], ArrowDown: [0, -50] };
  if (offsets[event.key]) {
    event.preventDefault();
    x += offsets[event.key][0];
    y += offsets[event.key][1];
    draw();
  } else if (['+', '=', '-', '0'].includes(event.key)) {
    event.preventDefault();
    if (event.key === '0') fit();
    else zoom(event.key === '-' ? 1 / 1.15 : 1.15);
  }
});
new ResizeObserver(() => { if (dialog.open) fit(); }).observe(viewport);
export {};
