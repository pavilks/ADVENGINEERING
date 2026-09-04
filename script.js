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

// ============================================================
// CATALOG — INFINITE SEAMLESS CAROUSEL
// Desktop + Mobile
// Auto-slide + arrows + touch/mouse scroll
// ============================================================

let catalogAutoSlideTimer = null;
let catalogIsDragging = false;
let catalogStartX = 0;
let catalogStartScroll = 0;
let catalogIsAdjusting = false;

const CATALOG_CONFIG = {
    autoSlideDelay: 3000,
    animationDuration: 400,
    swipeThreshold: 40,
    mobileBreakpoint: 900
};


// ============================================================
// INIT
// ============================================================

function initSeamlessCatalog() {
    const track = document.getElementById('catalogTrack');

    if (!track) return;

    // Ja jau inicializēts, neko nedarām
    if (track.dataset.infiniteReady === 'true') return;

    const originalCards = Array.from(
        track.querySelectorAll('.catalog-card:not(.cloned)')
    );

    if (!originalCards.length) return;

    // Notīrām iepriekšējos klonus, ja tādi eksistē
    track.querySelectorAll('.cloned').forEach(clone => clone.remove());

    /*
     * Izveidojam:
     *
     * [ COPY 1 ][ ORIGINAL ][ COPY 3 ]
     *
     * Tas ļauj kustēties gan pa labi, gan pa kreisi
     * un pēc tam nemanāmi pāriet atpakaļ uz vidējo kopiju.
     */

    const fragmentBefore = document.createDocumentFragment();
    const fragmentAfter = document.createDocumentFragment();

    originalCards.forEach(card => {
        const cloneBefore = card.cloneNode(true);
        cloneBefore.classList.add('cloned', 'catalog-clone-before');

        const cloneAfter = card.cloneNode(true);
        cloneAfter.classList.add('cloned', 'catalog-clone-after');

        fragmentBefore.appendChild(cloneBefore);
        fragmentAfter.appendChild(cloneAfter);
    });

    track.insertBefore(fragmentBefore, track.firstChild);
    track.appendChild(fragmentAfter);

    track.dataset.infiniteReady = 'true';

    // Pēc renderēšanas novietojamies vidējā kopijā
    requestAnimationFrame(() => {
        centerCatalog();
    });
}


// ============================================================
// HELPERS
// ============================================================

function getCatalogElements() {
    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');

    if (!track || !container) return null;

    return { track, container };
}


function getCatalogCardStep() {
    const { track } = getCatalogElements() || {};

    if (!track) return 0;

    const card = track.querySelector('.catalog-card');

    if (!card) return 0;

    const styles = window.getComputedStyle(track);

    const gap =
        parseFloat(styles.columnGap) ||
        parseFloat(styles.gap) ||
        0;

    return card.getBoundingClientRect().width + gap;
}


function getOriginalCount() {
    const track = document.getElementById('catalogTrack');

    if (!track) return 0;

    return track.querySelectorAll(
        '.catalog-card:not(.cloned)'
    ).length;
}


function getCycleWidth() {
    const step = getCatalogCardStep();
    const count = getOriginalCount();

    return step * count;
}


// ============================================================
// CENTER / INITIAL POSITION
// ============================================================

function centerCatalog() {
    const { container } = getCatalogElements() || {};

    if (!container) return;

    const cycleWidth = getCycleWidth();

    if (!cycleWidth) return;

    /*
     * Vidējā kopija sākas pēc pirmās pilnās kopijas.
     */
    container.scrollLeft = cycleWidth;
}


// ============================================================
// INFINITE SCROLL CORRECTION
// ============================================================

function normalizeCatalogScroll() {
    const { container } = getCatalogElements() || {};

    if (!container || catalogIsAdjusting) return;

    const cycleWidth = getCycleWidth();

    if (!cycleWidth) return;

    const current = container.scrollLeft;

    /*
     * Ja esam pārāk tālu pa labi,
     * pārceļamies par vienu pilnu ciklu pa kreisi.
     */
    if (current >= cycleWidth * 2) {

        catalogIsAdjusting = true;

        container.scrollLeft = current - cycleWidth;

        requestAnimationFrame(() => {
            catalogIsAdjusting = false;
        });

        return;
    }

    /*
     * Ja esam pārāk tālu pa kreisi,
     * pārceļamies par vienu pilnu ciklu pa labi.
     */
    if (current <= 0) {

        catalogIsAdjusting = true;

        container.scrollLeft = current + cycleWidth;

        requestAnimationFrame(() => {
            catalogIsAdjusting = false;
        });
    }
}


// ============================================================
// SCROLL
// ============================================================

function setupCatalogScroll() {
    const { container } = getCatalogElements() || {};

    if (!container) return;

    let scrollRaf = null;

    container.addEventListener(
        'scroll',
        () => {

            if (scrollRaf) return;

            scrollRaf = requestAnimationFrame(() => {

                normalizeCatalogScroll();

                scrollRaf = null;
            });
        },
        { passive: true }
    );
}


// ============================================================
// MOVE — WORKS BOTH DIRECTIONS
// ============================================================

function moveCatalog(direction = 1) {

    const { container } = getCatalogElements() || {};

    if (!container) return;

    const step = getCatalogCardStep();

    if (!step) return;

    /*
     * Neatkarīgi no desktop/mobile,
     * kustam container scroll pozīciju.
     *
     * Tas novērš konfliktu starp:
     * transform + scrollLeft.
     */

    container.scrollBy({
        left: direction * step,
        behavior: 'smooth'
    });
}


// ============================================================
// AUTO SLIDE
// ============================================================

function startCatalogAutoSlide() {

    stopCatalogAutoSlide();

    catalogAutoSlideTimer = setInterval(() => {

        // Auto-slide darbojas arī mobilajā
        moveCatalog(1);

    }, CATALOG_CONFIG.autoSlideDelay);
}


function stopCatalogAutoSlide() {

    if (catalogAutoSlideTimer) {

        clearInterval(catalogAutoSlideTimer);

        catalogAutoSlideTimer = null;
    }
}


// ============================================================
// MOUSE / TOUCH DRAG
// ============================================================

function setupCatalogDrag() {

    const { container } = getCatalogElements() || {};

    if (!container) return;

    /*
     * Pointer Events darbojas:
     * - mouse
     * - touch
     * - pen
     */

    container.addEventListener(
        'pointerdown',
        event => {

            catalogIsDragging = true;

            catalogStartX = event.clientX;
            catalogStartScroll = container.scrollLeft;

            container.classList.add('is-dragging');

            stopCatalogAutoSlide();

            try {
                container.setPointerCapture(event.pointerId);
            } catch (error) {}
        }
    );


    container.addEventListener(
        'pointermove',
        event => {

            if (!catalogIsDragging) return;

            const distance =
                event.clientX - catalogStartX;

            container.scrollLeft =
                catalogStartScroll - distance;
        }
    );


    const endDrag = event => {

        if (!catalogIsDragging) return;

        catalogIsDragging = false;

        container.classList.remove('is-dragging');

        try {
            container.releasePointerCapture(event.pointerId);
        } catch (error) {}

        normalizeCatalogScroll();

        startCatalogAutoSlide();
    };


    container.addEventListener(
        'pointerup',
        endDrag
    );

    container.addEventListener(
        'pointercancel',
        endDrag
    );

    container.addEventListener(
        'pointerleave',
        event => {

            if (
                catalogIsDragging &&
                event.pointerType === 'mouse'
            ) {
                endDrag(event);
            }
        }
    );
}


// ============================================================
// HOVER — DESKTOP
// ============================================================

function setupCatalogHover() {

    const wrapper =
        document.querySelector('.catalog-carousel-wrapper');

    if (!wrapper) return;

    wrapper.addEventListener(
        'mouseenter',
        () => {
            stopCatalogAutoSlide();
        }
    );

    wrapper.addEventListener(
        'mouseleave',
        () => {
            if (!catalogIsDragging) {
                startCatalogAutoSlide();
            }
        }
    );
}


// ============================================================
// RESIZE
// ============================================================

function setupCatalogResize() {

    let resizeTimer = null;

    window.addEventListener(
        'resize',
        () => {

            clearTimeout(resizeTimer);

            resizeTimer = setTimeout(() => {

                const { container } =
                    getCatalogElements() || {};

                if (!container) return;

                /*
                 * Pēc resize pārbaudām, vai vēl
                 * atrodamies drošajā vidējā kopijā.
                 */

                const cycleWidth = getCycleWidth();

                if (!cycleWidth) return;

                while (container.scrollLeft < cycleWidth) {
                    container.scrollLeft += cycleWidth;
                }

                while (container.scrollLeft >= cycleWidth * 2) {
                    container.scrollLeft -= cycleWidth;
                }

            }, 150);
        }
    );
}


// ============================================================
// PREVENT CLICK AFTER DRAG
// ============================================================

function setupCatalogClickProtection() {

    const { container } = getCatalogElements() || {};

    if (!container) return;

    let moved = false;
    let startX = 0;

    container.addEventListener(
        'pointerdown',
        event => {

            moved = false;
            startX = event.clientX;
        },
        true
    );


    container.addEventListener(
        'pointermove',
        event => {

            if (
                Math.abs(event.clientX - startX) >
                CATALOG_CONFIG.swipeThreshold
            ) {
                moved = true;
            }
        },
        true
    );


    container.addEventListener(
        'click',
        event => {

            if (moved) {

                event.preventDefault();
                event.stopPropagation();

                moved = false;
            }
        },
        true
    );
}


// ============================================================
// MAIN SETUP
// ============================================================

function setupCatalog() {

    initSeamlessCatalog();

    setupCatalogScroll();
    setupCatalogDrag();
    setupCatalogHover();
    setupCatalogResize();
    setupCatalogClickProtection();

    startCatalogAutoSlide();
}


// ============================================================
// DOM READY
// ============================================================

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        setupCatalog,
        { once: true }
    );

} else {

    setupCatalog();
}
```

        


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
