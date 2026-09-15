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
let catalogIndex = 0;
let catalogAutoSlideTimer = null;
let catalogIsAnimating = false;
let mobileBufferTicking = false;
let catalogRealCards = null; 

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

    catalogRealCards = realCards;

    cloneCardSet(track, realCards);
    cloneCardSet(track, realCards);
}

function maintainInfiniteBuffer() {
    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');
    if (!track || !container) return;
    if (window.innerWidth > 900) return;

    const cardWidth = getCardWidth(track);
    if (!cardWidth) return; 

    if (!catalogRealCards || catalogRealCards.length === 0) return;
    const setSize = catalogRealCards.length;
    const setWidth = setSize * cardWidth;
    if (!setWidth) return;

    let guard = 0;
    while (
        track.scrollWidth - (container.scrollLeft + container.clientWidth) < container.clientWidth * 2 &&
        guard < 25
    ) {
        cloneCardSet(track, catalogRealCards);
        guard++;
    }

    guard = 0;
    while (container.scrollLeft > setWidth + container.clientWidth * 2 && guard < 25) {
        const firstEl = track.firstElementChild;
        if (!firstEl || !firstEl.classList.contains('cloned')) break; 

        let removedWidth = 0;
        for (let i = 0; i < setSize; i++) {
            const el = track.firstElementChild;
            if (!el || !el.classList.contains('cloned')) break; 
            removedWidth += cardWidth;
            track.removeChild(el);
        }
        if (removedWidth === 0) break; 
        container.scrollLeft -= removedWidth;
        guard++;
    }
}

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

    if (window.innerWidth <= 900) {
        maintainInfiniteBuffer();
        container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
        return;
    }

    if (catalogIsAnimating) return; 
    catalogIsAnimating = true;

    catalogIndex += direction;

    if (catalogIndex < 0) {
        track.style.transition = 'none';
        catalogIndex = originalCount;
        track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;
        void track.offsetWidth; 
        catalogIndex = originalCount - 1;
    }

    track.style.transition = 'transform 0.4s ease-in-out';
    track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;

    const onTransitionEnd = () => {
        track.removeEventListener('transitionend', onTransitionEnd);

        if (catalogIndex >= originalCount) {
            track.style.transition = 'none';
            catalogIndex -= originalCount;
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
        container.addEventListener('scroll', scheduleMaintainBuffer, { passive: true });
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

// 2D/3D Pārslēgšanās stāvoklis
let is3DActive = false;

function toggleView() {
    const img2D = document.getElementById('modalImg');
    const viewer3D = document.getElementById('modal3dViewer');
    const toggleBtn = document.getElementById('modalToggleViewBtn');

    if (!viewer3D) return;

    is3DActive = !is3DActive; // Pārslēdzam stāvokli

    if (is3DActive) {
        // IESLĒDZ 3D
        img2D.style.display = 'none';
        viewer3D.style.display = 'block';
        toggleBtn.innerText = '2D Blueprint';
    } else {
        // IESLĒDZ 2D
        viewer3D.style.display = 'none';
        img2D.style.display = 'block';
        toggleBtn.innerText = '3D View';
    }
}

// Modal Dialog Logic
function openModal(title, subtitle, imgSrc, description, modelUrl) {
    currentSelectedTitle = title;
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalSubtitle').innerText = subtitle;
    document.getElementById('modalDescription').innerText = description;
    
    // Iestatām 2D attēlu
    const img2D = document.getElementById('modalImg');
    img2D.src = imgSrc;
    img2D.style.display = 'block';

    // Sagatavojam 3D skatītāju un pogu
    const viewer3D = document.getElementById('modal3dViewer');
    const toggleBtn = document.getElementById('modalToggleViewBtn');
    
    if (modelUrl && viewer3D && toggleBtn) {
        // Iestatām linku uz 3D modeli iframe
        viewer3D.src = `3d-viewer.html?model=${encodeURIComponent(modelUrl)}&title=${encodeURIComponent(title)}`;
        viewer3D.style.display = 'none'; // Sākumā slēpts
        
        toggleBtn.style.display = 'inline-block';
        toggleBtn.innerText = '3D View';
        is3DActive = false; // Atiestatām skatu uz 2D
    } else if (toggleBtn) {
        // Ja nav 3D modeļa konkrētajam priekšmetam, paslēpjam pogu
        toggleBtn.style.display = 'none';
    }

    document.getElementById('catalogModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('catalogModal').style.display = 'none';
    
    // Opcionāli: Notīrām iframe src, lai apturētu 3D modeļa renderēšanu fonā, ietaupot resursus
    const viewer3D = document.getElementById('modal3dViewer');
    if (viewer3D) {
        viewer3D.src = '';
    }
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
