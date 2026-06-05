// State Management
let myAlbums = JSON.parse(localStorage.getItem('my_spotify_albums')) || [];
let currentAlbumId = null;

// DOM Elements
const inputLink = document.getElementById('spotify-link');
const loadingSpinner = document.getElementById('loading-spinner');

const albumView = document.getElementById('album-view');
const emptyState = document.getElementById('empty-state');
const tracksList = document.getElementById('tracks-list');
const bgBlur = document.getElementById('bg-blur');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

const albumCover = document.getElementById('album-cover');
const albumTitle = document.getElementById('album-title');
const albumArtist = document.getElementById('album-artist');
const albumTracksCount = document.getElementById('album-tracks-count');

const sidebarList = document.getElementById('albums-sidebar-list');
const mobileSidebarList = document.getElementById('mobile-albums-sidebar-list');
const deleteAlbumBtn = document.getElementById('delete-album-btn');

// Mobile Menu
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
const mobileSidebar = document.getElementById('mobile-sidebar');

mobileMenuBtn.addEventListener('click', () => {
    mobileSidebar.classList.remove('-translate-x-full');
});
closeMobileMenuBtn.addEventListener('click', () => {
    mobileSidebar.classList.add('-translate-x-full');
});

// Initialization
function init() {
    renderSidebar();
    if (myAlbums.length > 0) {
        selectAlbum(myAlbums[0].id);
    } else {
        showEmptyState();
    }
}

// Sidebar Rendering
function renderSidebar() {
    const html = myAlbums.map(album => `
        <div class="album-sidebar-item flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none mb-1 ${album.id === currentAlbumId ? 'active' : ''}" 
             onclick="selectAlbum('${album.id}')">
            <img src="${album.coverUrl}" class="w-12 h-12 rounded-md object-cover shadow-md">
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-white truncate">${album.title}</div>
                <div class="text-xs text-neutral-400 truncate">${album.artist}</div>
            </div>
        </div>
    `).join('');
    
    sidebarList.innerHTML = html;
    mobileSidebarList.innerHTML = html;
}

function showEmptyState() {
    albumView.classList.add('hidden');
    emptyState.classList.remove('hidden');
    bgBlur.style.backgroundImage = 'none';
    currentAlbumId = null;
}

// Select Album from Sidebar
window.selectAlbum = function(id) {
    const album = myAlbums.find(a => a.id === id);
    if (!album) return;
    
    currentAlbumId = id;
    renderSidebar();
    
    // Close mobile sidebar if open
    mobileSidebar.classList.add('-translate-x-full');

    // Populate Header Info
    albumCover.src = album.coverUrl;
    albumTitle.textContent = album.title;
    albumArtist.textContent = album.artist;
    albumTracksCount.textContent = `${album.tracks.length} треков`;

    // Set background blur effect
    bgBlur.style.backgroundImage = `url(${album.coverUrl})`;

    renderTracks(album);
    
    emptyState.classList.add('hidden');
    albumView.classList.remove('hidden');
}

// Delete current album
deleteAlbumBtn.addEventListener('click', () => {
    if (!currentAlbumId) return;
    if (confirm("Удалить этот альбом из коллекции?")) {
        myAlbums = myAlbums.filter(a => a.id !== currentAlbumId);
        saveToLocalStorage();
        init();
    }
});

// Listen for link input
inputLink.addEventListener('input', async (e) => {
    const val = e.target.value.trim();
    if (val.startsWith('http') && val.includes('spotify.com/album/')) {
        
        inputLink.disabled = true;
        loadingSpinner.classList.remove('hidden');
        
        try {
            // Extract ID
            const urlParts = val.split('/');
            const albumId = urlParts[urlParts.length - 1].split('?')[0];

            // If already exists, just select it
            if (myAlbums.find(a => a.id === albumId)) {
                selectAlbum(albumId);
                inputLink.value = '';
                return;
            }

            // Fetch Album Data through Vercel Serverless Function
            const apiUrl = `/api/spotify?albumId=${albumId}`;
            const albumRes = await fetch(apiUrl);
            
            if (!albumRes.ok) {
                const errorData = await albumRes.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to fetch Album via Vercel API");
            }
            
            const albumData = await albumRes.json();
            
            const title = albumData.name;
            const coverUrl = albumData.images && albumData.images.length > 0 ? albumData.images[0].url : "https://via.placeholder.com/300?text=No+Cover";
            const artist = albumData.artists && albumData.artists.length > 0 ? albumData.artists[0].name : "Spotify Artist";
            
            let tracks = albumData.tracks.items.map(t => ({
                id: t.id,
                title: t.name
            }));

            // Save new album
            const newAlbum = {
                id: albumId,
                title: title,
                artist: artist,
                coverUrl: coverUrl,
                tracks: tracks
            };

            myAlbums.push(newAlbum);
            saveToLocalStorage();
            
            // Select and clear
            selectAlbum(albumId);
            inputLink.value = '';

        } catch (error) {
            console.error("Error fetching album data:", error);
            toastMessage.textContent = "Ошибка загрузки альбома";
            showToast(true);
        } finally {
            inputLink.disabled = false;
            loadingSpinner.classList.add('hidden');
            inputLink.focus();
        }
    }
});

// Render Tracks for Drag & Drop
let dragSrcEl = null;

function renderTracks(album) {
    tracksList.innerHTML = '';
    
    album.tracks.forEach((track) => {
        const li = document.createElement('li');
        li.className = 'track-row flex items-center px-4 py-3 cursor-pointer select-none group';
        li.draggable = true;
        li.dataset.id = track.id;

        li.innerHTML = `
            <div class="w-12 text-center text-neutral-400 font-medium track-number text-sm">
                <!-- CSS Counter populates this -->
                <i data-lucide="play" class="w-4 h-4 text-white track-play-icon"></i>
            </div>
            <div class="flex-1 min-w-0 pr-4">
                <div class="text-base font-semibold text-white truncate group-hover:text-spotify transition-colors">${track.title}</div>
                <div class="text-sm text-neutral-400 truncate">${album.artist}</div>
            </div>
            <div class="w-6 flex items-center justify-center drag-handle text-neutral-500 hover:text-white">
                <i data-lucide="grip-vertical" class="w-5 h-5"></i>
            </div>
        `;

        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        li.addEventListener('touchstart', handleTouchStart, {passive: false});
        li.addEventListener('touchmove', handleTouchMove, {passive: false});
        li.addEventListener('touchend', handleTouchEnd);

        tracksList.appendChild(li);
    });

    lucide.createIcons();
}

// Drag and Drop Logic
function handleDragStart(e) {
    dragSrcEl = this;
    if(e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== dragSrcEl) this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (dragSrcEl !== this) {
        const bounding = this.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        
        if ((e.clientY || (e.touches && e.touches[0].clientY)) > offset) {
            this.after(dragSrcEl);
        } else {
            this.before(dragSrcEl);
        }
        saveCurrentAlbumOrder();
    }
    return false;
}

function handleDragEnd(e) {
    const items = tracksList.querySelectorAll('.track-row');
    items.forEach(item => {
        item.classList.remove('drag-over');
        item.classList.remove('dragging');
    });
}

// Touch Events
let touchStartY = 0;
let touchDragEl = null;

function handleTouchStart(e) {
    if (e.target.closest('.drag-handle')) {
        touchDragEl = this;
        touchStartY = e.touches[0].clientY;
        this.classList.add('dragging');
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (!touchDragEl) return;
    e.preventDefault();
    
    const touchY = e.touches[0].clientY;
    const elements = document.elementsFromPoint(e.touches[0].clientX, touchY);
    const targetLi = elements.find(el => el.classList && el.classList.contains('track-row') && el !== touchDragEl);

    if (targetLi) {
        const bounding = targetLi.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        
        if (touchY > offset) targetLi.after(touchDragEl);
        else targetLi.before(touchDragEl);
    }
}

function handleTouchEnd(e) {
    if (!touchDragEl) return;
    touchDragEl.classList.remove('dragging');
    touchDragEl = null;
    saveCurrentAlbumOrder();
}

// Saving & Notifications
function saveCurrentAlbumOrder() {
    if (!currentAlbumId) return;
    
    // Extract new DOM order
    const newOrderIds = Array.from(tracksList.children).map(li => li.dataset.id);
    
    // Find album and reorder tracks array
    const albumIndex = myAlbums.findIndex(a => a.id === currentAlbumId);
    if (albumIndex !== -1) {
        const oldTracks = myAlbums[albumIndex].tracks;
        myAlbums[albumIndex].tracks = newOrderIds.map(id => oldTracks.find(t => t.id === id));
        saveToLocalStorage();
    }
    
    toastMessage.textContent = "Порядок сохранен!";
    showToast(false);
}

function saveToLocalStorage() {
    localStorage.setItem('my_spotify_albums', JSON.stringify(myAlbums));
}

let toastTimeout = null;
function showToast(isError = false) {
    toast.classList.add('toast-visible');
    
    // Lucide replaces <i> with <svg>, so we need to rewrite the innerHTML to change icons dynamically
    const iconName = isError ? 'alert-circle' : 'check-circle';
    const textColor = isError ? 'text-red-500' : 'text-spotify';
    
    // We recreate the icon and text elements inside the toast
    const msg = toastMessage ? toastMessage.textContent : "Порядок сохранен!";
    toast.innerHTML = `<i data-lucide="${iconName}" class="${textColor} w-5 h-5"></i><span class="font-medium text-sm" id="toast-message">${msg}</span>`;
    
    lucide.createIcons();
    
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 3000);
}

// Run init
init();
