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

//////////////////////////

            // Catalog Infinite Seamless Carousel Logic (Griežas uz riņķi kā ripa)
let catalogIndex = 0;
let catalogAutoSlideTimer = null;
let isCatalogTransitioning = false;

function initSeamlessCatalog() {
    const track = document.getElementById('catalogTrack');
    if (!track) return;

    // Lai izvairītos no dubultas klonēšanas, ha pārlādē
    if (track.querySelector('.cloned')) return;

    const cards = Array.from(track.querySelectorAll('.catalog-card'));
    if (cards.length === 0) return;

    // Klonējam pirmās kartītes un pievienojam beigās bezgalīgajai cilpai
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('cloned');
        track.appendChild(clone);
    });

    // Pievienojam transition apstrādi plūdenai pārejai
    track.addEventListener('transitionend', handleCatalogTransitionEnd);
}

function moveCatalog(direction) {
    if (isCatalogTransitioning) return;

    const track = document.getElementById('catalogTrack');
    const container = document.querySelector('.catalog-track-container');
    if (!track || !container) return;

    const cardWidth = 232; // 220px kartīte + 12px atstarpe

    // Mobilajā skatā izmantojam gludo scrollLeft
    if (window.innerWidth <= 900) {
        const maxScroll = container.scrollWidth / 2; // Tā kā puse ir kloni
        if (container.scrollLeft >= maxScroll) {
            container.scrollLeft = 0;
        }
        container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    } else {
        // Datora skatā izmantojam plūdeno CSS transformāciju
        isCatalogTransitioning = true;
        catalogIndex += direction;
        track.style.transition = 'transform 0.5s ease-in-out';
        track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;
    }
}

function handleCatalogTransitionEnd() {
    const track = document.getElementById('catalogTrack');
    const originalCardsCount = track.querySelectorAll('.catalog-card:not(.cloned)').length;
    const cardWidth = 232;

    // Kad sasniegti kloni beigās, nemanāmi (bez animācijas) pārlecam uz sākumu
    if (catalogIndex >= originalCardsCount) {
        track.style.transition = 'none';
        catalogIndex = 0;
        track.style.transform = `translateX(0px)`;
    } 
    // Ja iet uz atpakaļu no sākuma, nemanāmi pārlecam uz pēdējo īsto kartīti
    else if (catalogIndex < 0) {
        track.style.transition = 'none';
        catalogIndex = originalCardsCount - 1;
        track.style.transform = `translateX(-${catalogIndex * cardWidth}px)`;
    }

    isCatalogTransitioning = false;
}

function startCatalogAutoSlide() {
    stopCatalogAutoSlide();
    catalogAutoSlideTimer = setInterval(() => {
        moveCatalog(1);
    }, 3000); // Kustas uz priekšu ik pēc 3 sekundēm
}

function stopCatalogAutoSlide() {
    if (catalogAutoSlideTimer) clearInterval(catalogAutoSlideTimer);
}

// Inicializējam bezgalīgo karuseli un palaižam rotāciju
document.addEventListener('DOMContentLoaded', () => {
    initSeamlessCatalog();
    startCatalogAutoSlide();

    const catalogWrapper = document.querySelector('.catalog-carousel-wrapper');
    if (catalogWrapper) {
        catalogWrapper.addEventListener('mouseenter', stopCatalogAutoSlide);
        catalogWrapper.addEventListener('mouseleave', startCatalogAutoSlide);
    }
});


////////////////////////

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
