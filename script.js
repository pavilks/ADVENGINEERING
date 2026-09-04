// Canvas & Drawing State
const canvas = document.getElementById('facadeCanvas');
const ctx = canvas.getContext('2d');
let bgImage = null;
let artworkImage = null;
let isDrawing = false;
let startX = 0, startY = 0;
let boundingBox = null;
let currentSelectedTitle = '';

//////////////////////////////////
// 1. Facade Image Upload
document.getElementById('facadeInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        bgImage = new Image();
        bgImage.onload = function() {
            canvas.width = bgImage.width;
            canvas.height = bgImage.height;
            redrawCanvas();
            document.getElementById('canvasPlaceholder').style.display = 'none';
        };
        bgImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

///////////////////////////
// 2. Artwork Upload
document.getElementById('artworkInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        artworkImage = new Image();
        artworkImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

//////////////////////////////
// Canvas Selection Box Logic
canvas.addEventListener('mousedown', (e) => {
    if (!bgImage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;
    isDrawing = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    boundingBox = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        w: Math.abs(currentX - startX),
        h: Math.abs(currentY - startY)
    };

    redrawCanvas();
});

canvas.addEventListener('mouseup', () => { isDrawing = false; });

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage) ctx.drawImage(bgImage, 0, 0);

    if (boundingBox) {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.w, boundingBox.h);
        ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.fillRect(boundingBox.x, boundingBox.y, boundingBox.w, boundingBox.h);
    }
}

function clearCanvas() {
    boundingBox = null;
    redrawCanvas();
}

//////////////////////////karuselis

// Catalog Infinite Seamless Carousel Logic
// Mobile: TRUE infinite scroll — no wrap, no jump. We just keep appending
// clone sets ahead of the user as they scroll, and quietly prune old ones
// far behind (off-screen) to keep the DOM from growing forever. Since we
// never reposition scrollLeft relative to a "loop point", there is nothing
// to visually snap or jump — motion is continuous no matter how long it runs.
// Desktop keeps the transform/index approach (unaffected, already working).

let catalogIndex = 0;
let catalogAutoSlideTimer = null;
let catalogIsAnimating = false;
let mobileBufferTicking = false;

function getCardWidth(track) {
    const firstCard = track.querySelector('.catalog-card');
    if (!firstCard) return 0;
    const gap = parseInt(window.getComputedStyle(track).gap) || 12;
    return firstCard.offsetWidth + gap;
}

function cloneCardSet(track, realCards) {
    realCards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('cloned');
        clone.addEventListener('click', () => card.click());
        track.appendChild(clone);
    });
}

function initSeamlessCatalog() {
    const track = document.getElementById('catalogTrack');
    if (!track) return;
    if (track.querySelector('.cloned')) return;

    const realCards = Array.from(track.querySelectorAll('.catalog-card'));
    if (realCards.length === 0) return;

    // Seed with a couple of extra sets so there's already buffer before the
    // scroll listener has fired even once (desktop's single-clone wrap also
    // relies on at least one clone set existing).
    cloneCardSet(track, realCards);
    cloneCardSet(track, realCards);
}

// Keeps the mobile track supplied with enough clones ahead of the viewport,
// and trims clones that have scrolled far enough behind to be invisible.
// Hard iteration caps (guard) mean this can NEVER hang the tab, even if
// measurements are momentarily 0 or weird (e.g. mid-layout).
function maintainInfiniteBuffer() {
    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');
    if (!track || !container) return;
    if (window.innerWidth > 900) return;

    const cardWidth = getCardWidth(track);
    if (!cardWidth) return; // not laid out yet — try again on next scroll/tick

    const realCards = Array.from(track.querySelectorAll('.catalog-card:not(.cloned)'));
    if (realCards.length === 0) return;
    const setWidth = realCards.length * cardWidth;
    if (!setWidth) return;

    // 1. Append ahead: keep at least 2 screens of content beyond the viewport.
    let guard = 0;
    while (
        track.scrollWidth - (container.scrollLeft + container.clientWidth) < container.clientWidth * 2 &&
        guard < 25
    ) {
        cloneCardSet(track, realCards);
        guard++;
    }

    // 2. Prune behind: once we're more than ~2 screens past a full set,
    // remove that set from the front and shift scrollLeft to compensate —
    // this is instant and invisible since the removed content was already
    // off-screen to the left.
    guard = 0;
    while (container.scrollLeft > setWidth + container.clientWidth * 2 && guard < 25) {
        let removedWidth = 0;
        for (let i = 0; i < realCards.length; i++) {
            const el = track.firstElementChild;
            if (!el) break;
            removedWidth += cardWidth;
            track.removeChild(el);
        }
        if (removedWidth === 0) break; // nothing left to remove — bail out safely
        container.scrollLeft -= removedWidth;
        guard++;
    }
}

// Throttle buffer maintenance to once per animation frame, since 'scroll'
// can fire many times during a single drag/fling.
function scheduleMaintainBuffer() {
    if (mobileBufferTicking) return;
    mobileBufferTicking = true;
    requestAnimationFrame(() => {
        maintainInfiniteBuffer();
        mobileBufferTicking = false;
    });
}

function moveCatalog(direction) {
    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');
    if (!track || !container) return;

    const cards = track.querySelectorAll('.catalog-card');
    const originalCount = track.querySelectorAll('.catalog-card:not(.cloned)').length;
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const gap = parseInt(window.getComputedStyle(track).gap) || 12;
    const cardWidth = firstCard.offsetWidth + gap;

    // ---- MOBILE (touch scroll) ----
    if (window.innerWidth <= 900) {
        // Make sure there's buffer ahead BEFORE we scroll, in case auto-slide
        // fires faster than the scroll-event-driven maintenance can keep up.
        maintainInfiniteBuffer();
        container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
        return;
    }

    // ---- DESKTOP (transform slide) ----
    if (catalogIsAnimating) return; // prevent overlapping calls from corrupting state
    catalogIsAnimating = true;

    catalogIndex += direction;

    track.style.transition = 'transform 0.4s ease-in-out';
    track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;

    const onTransitionEnd = () => {
        track.removeEventListener('transitionend', onTransitionEnd);

        // Once the animation into the clone has actually been SEEN,
        // snap invisibly back to the matching real card.
        if (catalogIndex >= originalCount) {
            track.style.transition = 'none';
            catalogIndex -= originalCount;
            track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;
            void track.offsetWidth; // force reflow so the jump is applied before re-enabling transition
        } else if (catalogIndex < 0) {
            track.style.transition = 'none';
            catalogIndex += originalCount;
            track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;
            void track.offsetWidth;
        }

        catalogIsAnimating = false;
    };

    track.addEventListener('transitionend', onTransitionEnd);
}

function startCatalogAutoSlide() {
    stopCatalogAutoSlide();
    catalogAutoSlideTimer = setInterval(() => {
        moveCatalog(1);
    }, 3000);
}

function stopCatalogAutoSlide() {
    if (catalogAutoSlideTimer) {
        clearInterval(catalogAutoSlideTimer);
        catalogAutoSlideTimer = null;
    }
}

function setupCatalog() {
    initSeamlessCatalog();
    startCatalogAutoSlide();

    const catalogWrapper = document.querySelector('.catalog-carousel-wrapper');
    const container = document.querySelector('.catalog-track-container');

    // Only pause-on-hover for devices that actually have a real pointer/cursor.
    // On touch devices, mouseenter can fire without a matching mouseleave,
    // which would permanently stop the auto-slide.
    const hasHover = window.matchMedia('(hover: hover)').matches;

    if (catalogWrapper && hasHover) {
        catalogWrapper.addEventListener('mouseenter', stopCatalogAutoSlide);
        catalogWrapper.addEventListener('mouseleave', startCatalogAutoSlide);
    }

    if (catalogWrapper && !hasHover) {
        catalogWrapper.addEventListener('touchstart', stopCatalogAutoSlide, { passive: true });
        catalogWrapper.addEventListener('touchend', startCatalogAutoSlide, { passive: true });
        catalogWrapper.addEventListener('touchcancel', startCatalogAutoSlide, { passive: true });
    }

    if (container) {
        // Keep the buffer topped up for organic swipes, arrow clicks, and
        // auto-slide alike — 'scroll' fires for all of them.
        container.addEventListener('scroll', scheduleMaintainBuffer, { passive: true });

        // Seed the buffer once layout is ready (images can still resize
        // things right after initial load, so check again on 'load').
        requestAnimationFrame(maintainInfiniteBuffer);
        window.addEventListener('load', maintainInfiniteBuffer);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCatalog);
} else {
    setupCatalog();
}


////////////////////////dialogs 

// Modal Dialog Logic
function openModal(title, subtitle, imgSrc, description, modelUrl) {
    currentSelectedTitle = title;
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalSubtitle').innerText = subtitle;
    document.getElementById('modalImg').src = imgSrc;
    document.getElementById('modalDescription').innerText = description;
    
    const btn3d = document.getElementById('modal3dBtn');
    if (modelUrl) {
        btn3d.href = `3d-viewer.html?model=${encodeURIComponent(modelUrl)}&title=${encodeURIComponent(title)}`;
        btn3d.style.display = 'inline-block';
    } else {
        btn3d.style.display = 'none';
    }

    document.getElementById('catalogModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('catalogModal').style.display = 'none';
}

function closeAiModal() {
    document.getElementById('aiResultModal').style.display = 'none';
}

function useInVisualizer() {
    closeModal();
    const select = document.getElementById('signageTypeSelect');
    
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.includes(currentSelectedTitle) || currentSelectedTitle.includes(select.options[i].text)) {
            select.selectedIndex = i;
            break;
        }
    }
    
    document.getElementById('ai-generator').scrollIntoView({ behavior: 'smooth' });
}

// Generate API Call
async function generateVisualization() {
    if (!bgImage) {
        alert('Please upload a facade photo first.');
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.innerText = 'Generating...';
    btn.disabled = true;

    try {
        const facadeData = canvas.toDataURL('image/jpeg', 0.85);
        const artworkData = artworkImage ? artworkImage.src : null;
        const selectedType = document.getElementById('signageTypeSelect').value;

        const BACKEND_URL = 'https://your-backend-service.vercel.app/api/generate';

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                facadeImage: facadeData,
                artworkImage: artworkData,
                boundingBox: boundingBox,
                catalogType: selectedType
            })
        });

        const data = await response.json();

        if (data.imageUrl) {
            document.getElementById('resultImage').src = data.imageUrl;
            document.getElementById('downloadBtn').href = data.imageUrl;
            document.getElementById('aiResultModal').style.display = 'flex';
        } else {
            alert('Generation failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Connection error. Check backend configuration.');
        console.error(err);
    } finally {
        btn.innerText = 'Generate AI Concept';
        btn.disabled = false;
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('catalogModal');
    const aiModal = document.getElementById('aiResultModal');
    if (event.target === modal) closeModal();
    if (event.target === aiModal) closeAiModal();
};
