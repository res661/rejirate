// State Management
let myAlbums = [];
let currentAlbumId = null;
let adminPassword = localStorage.getItem('rejirate_admin_pwd') || null;

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
const searchHeader = document.getElementById('search-header');

const logoBtnDesktop = document.getElementById('logo-btn-desktop');
const logoBtnMobile = document.getElementById('logo-btn-mobile');

const sidebarSearch = document.getElementById('sidebar-search');
const mobileSidebarSearch = document.getElementById('mobile-sidebar-search');

const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const adminModal = document.getElementById('admin-modal');
const adminPasswordInput = document.getElementById('admin-password-input');
const cancelAdminBtn = document.getElementById('cancel-admin-btn');
const confirmAdminBtn = document.getElementById('confirm-admin-btn');

let sidebarSearchQuery = "";
let secretBuffer = "";

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

if (logoBtnDesktop) {
    logoBtnDesktop.addEventListener('click', () => {
        showEmptyState();
        renderSidebar();
    });
}
if (logoBtnMobile) {
    logoBtnMobile.addEventListener('click', () => {
        showEmptyState();
        renderSidebar();
        mobileSidebar.classList.add('-translate-x-full');
    });
}

// Initialization
async function init() {
    try {
        const res = await fetch('/api/getAlbums');
        if (res.ok) {
            myAlbums = await res.json();
        }
    } catch (e) {
        console.error("Failed to load global albums", e);
    }

    // Very basic verify on load to ensure valid session if token exists
    if (adminPassword) {
        try {
            const verify = await fetch('/api/verifyAuth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminPassword}` }
            });
            if (!verify.ok) {
                adminPassword = null;
                localStorage.removeItem('rejirate_admin_pwd');
            }
        } catch(e) {}
    }
    
    updateAdminUI();
    renderSidebar();

    const lastAlbumId = localStorage.getItem('lastAlbumId');
    const albumToSelect = lastAlbumId && myAlbums.find(a => a.id === lastAlbumId) 
        ? lastAlbumId 
        : (myAlbums.length > 0 ? myAlbums[0].id : null);

    if (albumToSelect) {
        selectAlbum(albumToSelect);
    } else {
        showEmptyState();
    }
}

// Sidebar Rendering
function renderSidebar() {
    const query = sidebarSearchQuery.toLowerCase();
    const filteredAlbums = myAlbums.filter(album => 
        album.title.toLowerCase().includes(query) || 
        album.artist.toLowerCase().includes(query)
    );

    const html = filteredAlbums.map(album => `
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

sidebarSearch.addEventListener('input', (e) => {
    sidebarSearchQuery = e.target.value;
    if (mobileSidebarSearch) mobileSidebarSearch.value = sidebarSearchQuery;
    renderSidebar();
});

if (mobileSidebarSearch) {
    mobileSidebarSearch.addEventListener('input', (e) => {
        sidebarSearchQuery = e.target.value;
        sidebarSearch.value = sidebarSearchQuery;
        renderSidebar();
    });
}

function showEmptyState() {
    albumView.classList.add('hidden');
    emptyState.classList.remove('hidden');
    searchHeader.classList.toggle('hidden', !adminPassword);
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
    
    // Save to memory
    localStorage.setItem('lastAlbumId', id);

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
    searchHeader.classList.toggle('hidden', !!currentAlbumId || !adminPassword);
    
    // Hide delete button and drag handles if not admin
    if (adminPassword) {
        deleteAlbumBtn.style.display = 'block';
    } else {
        deleteAlbumBtn.style.display = 'none';
    }
}

function updateAdminUI() {
    lucide.createIcons();
    
    // Update empty state text
    const emptyStateText = document.getElementById('empty-state-text');
    if (emptyStateText) {
        if (adminPassword) {
            emptyStateText.textContent = "Выберите альбом из коллекции или добавьте новый";
        } else {
            emptyStateText.textContent = "Выберите альбом слева, чтобы посмотреть тир-листы треков!";
        }
    }
    
    // Update visibility of elements
    if (currentAlbumId) {
        searchHeader.classList.add('hidden');
    } else {
        searchHeader.classList.toggle('hidden', !adminPassword);
    }
    
    deleteAlbumBtn.style.display = adminPassword ? 'block' : 'none';
    const selectedAlbum = myAlbums.find(a => a.id === currentAlbumId);
    if (selectedAlbum) {
        renderTracks(selectedAlbum);
    }
}

// Secret key sequence logic
document.addEventListener('keydown', (e) => {
    if (adminPassword || adminModal.classList.contains('opacity-0') === false) return; // Ignore if already admin or modal is open
    
    if (e.key && e.key.length === 1) {
        secretBuffer += e.key.toLowerCase();
        if (secretBuffer.length > 20) {
            secretBuffer = secretBuffer.slice(-20);
        }
        
        if (secretBuffer.includes('admin') || secretBuffer.includes('фвьшт')) {
            secretBuffer = "";
            adminModal.classList.remove('hidden');
            setTimeout(() => {
                adminModal.classList.remove('opacity-0');
                const panel = adminModal.querySelector('.glass-panel');
                if(panel) panel.classList.remove('scale-95');
                adminPasswordInput.focus();
            }, 10);
        }
    }
});

function closeAdminModal() {
    adminModal.classList.add('opacity-0');
    const panel = adminModal.querySelector('.glass-panel');
    if(panel) panel.classList.add('scale-95');
    setTimeout(() => {
        adminModal.classList.add('hidden');
        adminPasswordInput.value = '';
        confirmAdminBtn.textContent = 'Войти';
        confirmAdminBtn.disabled = false;
    }, 300);
}

cancelAdminBtn.addEventListener('click', closeAdminModal);

confirmAdminBtn.addEventListener('click', async () => {
    const pwd = adminPasswordInput.value.trim();
    if (!pwd) return;

    confirmAdminBtn.textContent = 'Проверка...';
    confirmAdminBtn.disabled = true;

    try {
        const res = await fetch('/api/verifyAuth', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pwd}`
            }
        });

        if (res.ok) {
            adminPassword = pwd;
            localStorage.setItem('rejirate_admin_pwd', adminPassword);
            updateAdminUI();
            closeAdminModal();
            toastMessage.textContent = "Режим владельца включен!";
            showToast(false);
        } else {
            toastMessage.textContent = "Неверный пароль!";
            showToast(true);
            confirmAdminBtn.textContent = 'Войти';
            confirmAdminBtn.disabled = false;
        }
    } catch (e) {
        toastMessage.textContent = "Ошибка сети";
        showToast(true);
        confirmAdminBtn.textContent = 'Войти';
        confirmAdminBtn.disabled = false;
    }
});

// Delete current album modal logic
deleteAlbumBtn.addEventListener('click', () => {
    if (!currentAlbumId) return;
    deleteModal.classList.remove('hidden');
    // slight delay for animation
    setTimeout(() => {
        deleteModal.classList.remove('opacity-0');
        const panel = deleteModal.querySelector('.glass-panel');
        if(panel) panel.classList.remove('scale-95');
    }, 10);
});

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

function closeDeleteModal() {
    deleteModal.classList.add('opacity-0');
    const panel = deleteModal.querySelector('.glass-panel');
    if(panel) panel.classList.add('scale-95');
    setTimeout(() => {
        deleteModal.classList.add('hidden');
    }, 300);
}

confirmDeleteBtn.addEventListener('click', () => {
    if (!currentAlbumId) return;
    myAlbums = myAlbums.filter(a => a.id !== currentAlbumId);
    saveToLocalStorage();
    closeDeleteModal();
    init();
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
                title: t.name,
                artists: artist
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

// Render Tracks with SortableJS
let sortableInstance = null;

function renderTracks(album) {
    if (!album || !album.tracks) return;
    
    tracksList.innerHTML = '';
    
    album.tracks.forEach((track) => {
        const li = document.createElement('li');
        li.className = `track-row flex items-center px-4 py-3 select-none group ${adminPassword ? 'cursor-grab active:cursor-grabbing' : ''}`;
        li.dataset.id = track.id;

        li.innerHTML = `
            <div class="w-12 text-center text-neutral-400 font-medium track-number text-sm">
                <!-- CSS Counter populates this -->
            </div>
            <div class="flex-1 min-w-0 pr-4">
                <div class="text-base font-semibold text-white truncate group-hover:text-spotify transition-colors">${track.title}</div>
                <div class="text-sm text-neutral-400 truncate mt-0.5">${track.artists || album.artist}</div>
            </div>
            ${adminPassword ? `
            <div class="w-6 flex items-center justify-center drag-handle cursor-grab text-neutral-500 hover:text-white transition-colors">
                <i data-lucide="grip-vertical" class="w-5 h-5"></i>
            </div>
            ` : ''}
        `;

        tracksList.appendChild(li);
    });

    lucide.createIcons();
    
    // Initialize or destroy SortableJS
    if (adminPassword) {
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(tracksList, {
            animation: 200,
            ghostClass: 'bg-white/10',
            dragClass: 'shadow-2xl',
            onEnd: function (evt) {
                const item = album.tracks.splice(evt.oldIndex, 1)[0];
                album.tracks.splice(evt.newIndex, 0, item);
                saveToGlobalDB();
                renderTracks(album); // Re-render to fix counters
            }
        });
    } else {
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
    }
}

// Saving & Notifications
async function saveToGlobalDB() {
    if (!adminPassword) return;

    try {
        const res = await fetch('/api/saveAlbums', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminPassword}`
            },
            body: JSON.stringify({ albums: myAlbums })
        });

        if (!res.ok) {
            if (res.status === 401) {
                adminPassword = null;
                localStorage.removeItem('rejirate_admin_pwd');
                updateAdminUI();
                toastMessage.textContent = "Неверный пароль!";
                showToast(true);
            } else {
                toastMessage.textContent = "Ошибка сохранения на сервер";
                showToast(true);
            }
        } else {
            toastMessage.textContent = "Сохранено на сервере!";
            showToast(false);
        }
    } catch (e) {
        console.error(e);
        toastMessage.textContent = "Ошибка сети";
        showToast(true);
    }
}

function saveCurrentAlbumOrder() {
    if (!currentAlbumId || !adminPassword) return;
    
    // Extract new DOM order
    const newOrderIds = Array.from(tracksList.children).map(li => li.dataset.id);
    
    // Find album and reorder tracks array
    const albumIndex = myAlbums.findIndex(a => a.id === currentAlbumId);
    if (albumIndex !== -1) {
        const oldTracks = myAlbums[albumIndex].tracks;
        myAlbums[albumIndex].tracks = newOrderIds.map(id => oldTracks.find(t => t.id === id));
        saveToGlobalDB();
    }
}

function saveToLocalStorage() {
    // We now save to the global DB
    saveToGlobalDB();
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
