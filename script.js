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

// Catalog Infinite Seamless Carousel Logic (fixed: no more sticking after loop 2)
let catalogIndex = 0;
let catalogAutoSlideTimer = null;
let catalogIsAnimating = false;

function initSeamlessCatalog() {
    const track = document.getElementById('catalogTrack');
    if (!track) return;
    if (track.querySelector('.cloned')) return;

    const cards = Array.from(track.querySelectorAll('.catalog-card'));
    if (cards.length === 0) return;

    cards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('cloned');
        clone.addEventListener('click', () => card.click());
        track.appendChild(clone);
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
        // No wrap logic here anymore. Wrapping is handled centrally by the
        // 'scroll' event listener in setupCatalog(), because that's the only
        // place that also sees ORGANIC finger swipes (not just button/auto
        // triggered moves). Two separate wrap mechanisms was the original bug.
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
    // This is the key fix: on touch devices, mouseenter can fire without a
    // matching mouseleave, which permanently stopped the auto-slide before.
    const hasHover = window.matchMedia('(hover: hover)').matches;

    if (catalogWrapper && hasHover) {
        catalogWrapper.addEventListener('mouseenter', stopCatalogAutoSlide);
        catalogWrapper.addEventListener('mouseleave', startCatalogAutoSlide);
    }

    // On touch devices, pause only while the user is actively touching/swiping,
    // and always resume afterward.
    if (catalogWrapper && !hasHover) {
        catalogWrapper.addEventListener('touchstart', stopCatalogAutoSlide, { passive: true });
        catalogWrapper.addEventListener('touchend', startCatalogAutoSlide, { passive: true });
        catalogWrapper.addEventListener('touchcancel', startCatalogAutoSlide, { passive: true });
    }

    // Single, canonical wrap handler for mobile — catches EVERY scroll source:
    // finger swipes, arrow-button clicks, and auto-slide. This is the only
    // place scrollLeft ever gets corrected, so there's no conflicting logic.
    //
    // IMPORTANT: correct on every scroll tick, immediately — do NOT wait for
    // the scroll to settle. Waiting (e.g. via setTimeout/debounce) makes the
    // correction happen as a separate, later motion, which is what reads as
    // "jumping back to section 1". Since the clone section is a pixel-exact
    // copy of the real section, subtracting maxScroll the instant we cross
    // it lands on visually identical content — imperceptible, not a jump.
    if (container) {
        container.addEventListener('scroll', () => {
            if (window.innerWidth > 900) return;

            const maxScroll = container.scrollWidth / 2;
            if (container.scrollLeft >= maxScroll) {
                container.scrollLeft -= maxScroll;
            } else if (container.scrollLeft < 0) {
                container.scrollLeft += maxScroll;
            }
        }, { passive: true });
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
