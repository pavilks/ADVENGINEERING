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
//
// DESKTOP: transform + index based. One clone set prepended, two appended,
// so real cards sit at physical position `originalCount`. Both directions
// correct AFTER animating into real clone content — symmetric, no jump.
//
// MOBILE: native scroll based, forward-only append buffer (no prepend/
// bidirectional maintenance — that version was jittery). Keeps appending
// clone sets ahead as the user scrolls and prunes old ones from behind.

let catalogIndex = 0; // desktop only: logical index relative to real cards
let catalogAutoSlideTimer = null;
let catalogIsAnimating = false; // desktop only
let mobileBufferTicking = false;
let catalogRealCards = null; // captured ONCE at init — permanent source of truth for cloning

function getCardWidth(track) {
    const firstCard = track.querySelector('.catalog-card');
    if (!firstCard) return 0;
    const gap = parseInt(window.getComputedStyle(track).gap) || 12;
    return firstCard.offsetWidth + gap;
}

function makeClone(card) {
    const clone = card.cloneNode(true);
    clone.classList.add('cloned');
    clone.addEventListener('click', () => card.click());
    return clone;
}

// Used by both desktop and mobile: append one full set of clones at the end.
function cloneCardSet(track, realCards) {
    realCards.forEach(card => track.appendChild(makeClone(card)));
}

// Desktop only: insert one full set of clones before the real cards.
function prependCardSet(track, realCards) {
    const frag = document.createDocumentFragment();
    realCards.forEach(card => frag.appendChild(makeClone(card)));
    track.insertBefore(frag, track.firstElementChild);
}

function initSeamlessCatalog() {
    const track = document.getElementById('catalogTrack');
    if (!track) return;
    if (track.querySelector('.cloned')) return;

    const realCards = Array.from(track.querySelectorAll('.catalog-card'));
    if (realCards.length === 0) return;

    // Capture the real cards ONCE, here, and never re-derive this list later.
    // Pruning removes DOM elements over time, and once the *original* real
    // elements themselves got pruned, re-querying ':not(.cloned)' would
    // return nothing — silently breaking all future cloning forever.
    catalogRealCards = realCards;

    if (window.innerWidth > 900) {
        // DESKTOP: [clone][REAL][clone][clone] — prepend gives backward
        // movement real content to slide into; two appended sets give
        // forward buffer. Structure never changes after this (desktop
        // doesn't grow/prune the buffer dynamically — a single step per
        // click only ever needs ±1 set).
        prependCardSet(track, realCards);
        cloneCardSet(track, realCards);
        cloneCardSet(track, realCards);

        // Real cards are no longer at physical position 0 — snap the
        // initial view to actually show them (not the prepended clone)
        // before anything is visible/animates.
        const cardWidth = getCardWidth(track);
        if (cardWidth) {
            track.style.transition = 'none';
            track.style.transform = `translateX(-${realCards.length * cardWidth}px)`;
            void track.offsetWidth;
        }
    } else {
        // MOBILE: [REAL][clone][clone] — forward-only. maintainInfiniteBuffer
        // keeps appending more sets ahead as the user scrolls. Seed two here
        // so there's already buffer before the scroll listener fires once.
        cloneCardSet(track, realCards);
        cloneCardSet(track, realCards);
    }
}

// MOBILE ONLY. Keeps the track supplied with enough clones ahead of the
// viewport, and trims clones that have scrolled far enough behind to be
// invisible. Hard iteration caps (guard) mean this can never hang the tab.
function maintainInfiniteBuffer() {
    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');
    if (!track || !container) return;
    if (window.innerWidth > 900) return;

    const cardWidth = getCardWidth(track);
    if (!cardWidth) return; // not laid out yet — try again on next scroll/tick

    if (!catalogRealCards || catalogRealCards.length === 0) return;
    const setSize = catalogRealCards.length;
    const setWidth = setSize * cardWidth;
    if (!setWidth) return;

    // 1. Append ahead: keep at least 2 screens of content beyond the viewport.
    let guard = 0;
    while (
        track.scrollWidth - (container.scrollLeft + container.clientWidth) < container.clientWidth * 2 &&
        guard < 25
    ) {
        cloneCardSet(track, catalogRealCards);
        guard++;
    }

    // 2. Prune behind: once we're more than ~2 screens past a full set,
    // remove that set from the front and shift scrollLeft to compensate —
    // this is instant and invisible since the removed content was already
    // off-screen to the left.
    //
    // CRITICAL: only ever remove elements with the 'cloned' class. The
    // original real cards must never be deleted — they're the permanent
    // template everything else is cloned from.
    guard = 0;
    while (container.scrollLeft > setWidth + container.clientWidth * 2 && guard < 25) {
        const firstEl = track.firstElementChild;
        if (!firstEl || !firstEl.classList.contains('cloned')) break; // never touch real cards

        let removedWidth = 0;
        for (let i = 0; i < setSize; i++) {
            const el = track.firstElementChild;
            if (!el || !el.classList.contains('cloned')) break; // stop the instant we'd hit a real card
            removedWidth += cardWidth;
            track.removeChild(el);
        }
        if (removedWidth === 0) break; // nothing safe left to remove — bail out
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
    if (cards.length === 0 || originalCount === 0) return;

    const firstCard = cards[0];
    const gap = parseInt(window.getComputedStyle(track).gap) || 12;
    const cardWidth = firstCard.offsetWidth + gap;

    // ---- MOBILE (native scroll, forward-only buffer) ----
    if (window.innerWidth <= 900) {
        maintainInfiniteBuffer();
        container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
        return;
    }

    // ---- DESKTOP (transform slide, prepend + append buffer) ----
    // One clone set is prepended before the real cards, so the real cards
    // sit at physical position `originalCount`, not 0. `catalogIndex` stays
    // a clean logical index (0..originalCount-1 when settled); we just add
    // `originalCount` whenever we actually set a transform.
    if (catalogIsAnimating) return; // prevent overlapping calls from corrupting state
    catalogIsAnimating = true;

    catalogIndex += direction;

    const physicalIndex = catalogIndex + originalCount;
    track.style.transition = 'transform 0.4s ease-in-out';
    track.style.transform = `translateX(-${physicalIndex * cardWidth}px)`;

    const onTransitionEnd = () => {
        track.removeEventListener('transitionend', onTransitionEnd);

        // Both directions correct AFTER animating, symmetrically — the
        // content just shown (prepended or appended clone) is real and
        // fine to display before snapping invisibly to the equivalent
        // real-card position.
        if (catalogIndex >= originalCount) {
            catalogIndex -= originalCount;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${(catalogIndex + originalCount) * cardWidth}px)`;
            void track.offsetWidth;
        } else if (catalogIndex < 0) {
            catalogIndex += originalCount;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${(catalogIndex + originalCount) * cardWidth}px)`;
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
