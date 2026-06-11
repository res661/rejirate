// State Management
let myAlbums = [];
let myPlaylists = [];
let currentTab = 'albums'; // 'albums' or 'playlists'
let currentAlbumId = null; // represents currently active item ID
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

// Tab Switcher Elements
const tabAlbums = document.getElementById('tab-albums');
const tabPlaylists = document.getElementById('tab-playlists');
const mobileTabAlbums = document.getElementById('mobile-tab-albums');
const mobileTabPlaylists = document.getElementById('mobile-tab-playlists');

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

    try {
        const res = await fetch('/api/getPlaylists');
        if (res.ok) {
            myPlaylists = await res.json();
        }
    } catch (e) {
        console.error("Failed to load global playlists", e);
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
    
    // Tab Event Listeners
    if (tabAlbums) tabAlbums.addEventListener('click', () => switchTab('albums'));
    if (tabPlaylists) tabPlaylists.addEventListener('click', () => switchTab('playlists'));
    if (mobileTabAlbums) mobileTabAlbums.addEventListener('click', () => switchTab('albums'));
    if (mobileTabPlaylists) mobileTabPlaylists.addEventListener('click', () => switchTab('playlists'));

    const savedTab = localStorage.getItem('lastTab') || 'albums';
    switchTab(savedTab);
}

// Tab Switching logic
function switchTab(tab) {
    currentTab = tab;
    
    // Update active styles
    if (tab === 'albums') {
        tabAlbums?.classList.add('active-tab');
        tabAlbums?.classList.remove('bg-transparent', 'text-neutral-400', 'hover:text-white', 'hover:bg-white/5');
        tabPlaylists?.classList.remove('active-tab');
        tabPlaylists?.classList.add('bg-transparent', 'text-neutral-400', 'hover:text-white', 'hover:bg-white/5');
        
        mobileTabAlbums?.classList.add('active-tab');
        mobileTabAlbums?.classList.remove('bg-transparent', 'text-neutral-400');
        mobileTabPlaylists?.classList.remove('active-tab');
        mobileTabPlaylists?.classList.add('bg-transparent', 'text-neutral-400');
        
        sidebarSearch.placeholder = "Поиск альбомов...";
        if (mobileSidebarSearch) mobileSidebarSearch.placeholder = "Поиск альбомов...";
        inputLink.placeholder = "https://open.spotify.com/album/...";
    } else {
        tabPlaylists?.classList.add('active-tab');
        tabPlaylists?.classList.remove('bg-transparent', 'text-neutral-400', 'hover:text-white', 'hover:bg-white/5');
        tabAlbums?.classList.remove('active-tab');
        tabAlbums?.classList.add('bg-transparent', 'text-neutral-400', 'hover:text-white', 'hover:bg-white/5');
        
        mobileTabPlaylists?.classList.add('active-tab');
        mobileTabPlaylists?.classList.remove('bg-transparent', 'text-neutral-400');
        mobileTabAlbums?.classList.remove('active-tab');
        mobileTabAlbums?.classList.add('bg-transparent', 'text-neutral-400');
        
        sidebarSearch.placeholder = "Поиск плейлистов...";
        if (mobileSidebarSearch) mobileSidebarSearch.placeholder = "Поиск плейлистов...";
        inputLink.placeholder = "https://open.spotify.com/playlist/...";
    }
    
    localStorage.setItem('lastTab', tab);
    updateAdminUI();

    // Select last item of the active tab
    const lastItemId = localStorage.getItem(`last_${tab}_Id`);
    const currentList = tab === 'albums' ? myAlbums : myPlaylists;
    const itemToSelect = lastItemId && currentList.find(a => a.id === lastItemId) 
        ? lastItemId 
        : (currentList.length > 0 ? currentList[0].id : null);

    if (itemToSelect) {
        selectAlbum(itemToSelect);
    } else {
        showEmptyState();
        renderSidebar();
    }
}

// Sidebar Rendering
function renderSidebar() {
    const query = sidebarSearchQuery.toLowerCase();
    const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;
    const filteredItems = currentList.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.artist.toLowerCase().includes(query)
    );

    const html = filteredItems.map(item => `
        <div class="album-sidebar-item flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none mb-1 ${item.id === currentAlbumId ? 'active' : ''}" 
             onclick="selectAlbum('${item.id}')">
            <img src="${item.coverUrl}" class="w-12 h-12 rounded-md object-cover shadow-md">
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-white truncate">${item.title}</div>
                <div class="text-xs text-neutral-400 truncate">${item.artist}</div>
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

// Select Item from Sidebar
window.selectAlbum = function(id) {
    const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;
    const item = currentList.find(a => a.id === id);
    if (!item) return;
    
    currentAlbumId = id;
    renderSidebar();
    
    // Close mobile sidebar if open
    mobileSidebar.classList.add('-translate-x-full');
    
    // Save to memory
    localStorage.setItem(`last_${currentTab}_Id`, id);

    // Populate Header Info
    albumCover.src = item.coverUrl;
    albumTitle.innerHTML = item.title;
    albumArtist.innerHTML = item.artist;
    albumTracksCount.textContent = `${item.tracks.length} треков`;

    // Update Label (Альбом / Плейлист)
    const viewTypeLabel = document.getElementById('view-type-label');
    if (viewTypeLabel) {
        viewTypeLabel.textContent = currentTab === 'albums' ? 'Альбом' : 'Плейлист';
    }

    // Set background blur effect
    bgBlur.style.backgroundImage = `url(${item.coverUrl})`;

    renderTracks(item);
    
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
            emptyStateText.textContent = currentTab === 'albums' 
                ? "Выберите альбом из коллекции или добавьте новый"
                : "Выберите плейлист из коллекции или добавьте новый";
        } else {
            emptyStateText.textContent = currentTab === 'albums'
                ? "Выберите альбом слева, чтобы посмотреть тир-листы треков!"
                : "Выберите плейлист слева, чтобы посмотреть тир-листы треков!";
        }
    }
    
    // Update main header texts
    const mainTitle = document.getElementById('main-title');
    const mainDesc = document.getElementById('main-desc');
    if (mainTitle) {
        mainTitle.textContent = currentTab === 'albums' ? "Ранжирование альбомов" : "Ранжирование плейлистов";
    }
    if (mainDesc) {
        mainDesc.textContent = currentTab === 'albums'
            ? "Вставьте ссылку на любой альбом из Spotify, чтобы скачать треки и составить свой личный топ."
            : "Вставьте ссылку на любой плейлист из Spotify, чтобы скачать треки и составить свой личный топ.";
    }

    // Update delete modal text
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalDesc = document.getElementById('delete-modal-desc');
    if (deleteModalTitle) {
        deleteModalTitle.textContent = currentTab === 'albums' ? "Удалить альбом?" : "Удалить плейлист?";
    }
    if (deleteModalDesc) {
        deleteModalDesc.textContent = currentTab === 'albums'
            ? "Вы уверены, что хотите удалить этот альбом из вашей коллекции? Это действие нельзя отменить."
            : "Вы уверены, что хотите удалить этот плейлист из вашей коллекции? Это действие нельзя отменить.";
    }
    
    // Update visibility of elements
    if (currentAlbumId) {
        searchHeader.classList.add('hidden');
    } else {
        searchHeader.classList.toggle('hidden', !adminPassword);
    }
    
    deleteAlbumBtn.style.display = adminPassword ? 'block' : 'none';
    const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;
    const selectedItem = currentList.find(a => a.id === currentAlbumId);
    if (selectedItem) {
        renderTracks(selectedItem);
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

// Delete current item modal logic
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
    if (currentTab === 'albums') {
        myAlbums = myAlbums.filter(a => a.id !== currentAlbumId);
    } else {
        myPlaylists = myPlaylists.filter(p => p.id !== currentAlbumId);
    }
    saveToLocalStorage();
    closeDeleteModal();
    // Refresh UI instantly
    renderSidebar();
    
    const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;
    if (currentList.length > 0) {
        selectAlbum(currentList[0].id);
    } else {
        showEmptyState();
    }
});

// Listen for link input
inputLink.addEventListener('input', async (e) => {
    const val = e.target.value.trim();
    if (!val.startsWith('http')) return;

    const isAlbum = val.includes('spotify.com/album/');
    const isPlaylist = val.includes('spotify.com/playlist/');

    if (isAlbum || isPlaylist) {
        inputLink.disabled = true;
        loadingSpinner.classList.remove('hidden');
        
        try {
            // Extract ID
            const urlParts = val.split('/');
            const itemId = urlParts[urlParts.length - 1].split('?')[0];

            const detectedTab = isPlaylist ? 'playlists' : 'albums';

            // Auto-switch tabs if different
            if (currentTab !== detectedTab) {
                switchTab(detectedTab);
            }

            const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;

            // Fetch Data through Vercel Serverless Function
            const param = currentTab === 'albums' ? 'albumId' : 'playlistId';
            const apiUrl = `/api/spotify?${param}=${itemId}`;
            const apiRes = await fetch(apiUrl);
            
            if (!apiRes.ok) {
                const errorData = await apiRes.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch ${currentTab} via Vercel API`);
            }
            
            const apiData = await apiRes.json();
            
            const title = apiData.name;
            const coverUrl = apiData.images && apiData.images.length > 0 ? apiData.images[0].url : "https://via.placeholder.com/300?text=No+Cover";
            const artist = apiData.artists && apiData.artists.length > 0 ? apiData.artists[0].name : (currentTab === 'albums' ? "Spotify Artist" : "Spotify Creator");
            
            let tracks = apiData.tracks.items.map(t => ({
                id: t.id,
                title: t.name,
                artists: t.artists || artist
            }));

            // Check if item already exists (refresh scenario)
            const existingItemIndex = currentList.findIndex(item => item.id === itemId);
            
            if (existingItemIndex !== -1) {
                // Item exists - merge tracks (keep old order, add new ones at the end)
                const existingItem = currentList[existingItemIndex];
                const existingTrackIds = new Set(existingItem.tracks.map(t => t.id));
                const newTracks = tracks.filter(t => !existingTrackIds.has(t.id));
                
                if (newTracks.length > 0) {
                    // Add new tracks to the end
                    existingItem.tracks = [...existingItem.tracks, ...newTracks];
                    existingItem.title = title;
                    existingItem.artist = artist;
                    existingItem.coverUrl = coverUrl;
                    
                    saveToLocalStorage();
                    selectAlbum(itemId);
                    
                    toastMessage.textContent = `Добавлено ${newTracks.length} ${newTracks.length === 1 ? 'новый трек' : 'новых треков'}`;
                    showToast(false);
                } else {
                    // No new tracks, just select
                    selectAlbum(itemId);
                }
                inputLink.value = '';
                return;
            }

            // Save new item
            const newItem = {
                id: itemId,
                title: title,
                artist: artist,
                coverUrl: coverUrl,
                tracks: tracks
            };

            currentList.push(newItem);
            saveToLocalStorage();
            
            // Select and clear
            selectAlbum(itemId);
            inputLink.value = '';

        } catch (error) {
            console.error("Error fetching data:", error);
            toastMessage.textContent = currentTab === 'albums' ? "Ошибка загрузки альбома" : "Ошибка загрузки плейлиста";
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

function renderTracks(item) {
    if (!item || !item.tracks) return;
    
    tracksList.innerHTML = '';
    
    item.tracks.forEach((track) => {
        const li = document.createElement('li');
        li.className = `track-row flex items-center px-4 py-3 select-none group ${adminPassword ? 'cursor-grab active:cursor-grabbing' : ''}`;
        li.dataset.id = track.id;

        li.innerHTML = `
            <div class="w-12 text-center text-neutral-400 font-medium track-number text-sm">
                <!-- CSS Counter populates this -->
            </div>
            <div class="flex-1 min-w-0 pr-4">
                <div class="text-base font-semibold text-white truncate group-hover:text-spotify transition-colors">${track.title}</div>
                <div class="text-sm text-neutral-400 truncate mt-0.5">${track.artists || item.artist}</div>
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
            ghostClass: 'opacity-20',
            chosenClass: 'bg-spotify/20',
            dragClass: 'shadow-[0_0_30px_rgba(30,215,96,0.3)]',
            onEnd: function (evt) {
                const element = item.tracks.splice(evt.oldIndex, 1)[0];
                item.tracks.splice(evt.newIndex, 0, element);
                saveToGlobalDB();
                renderTracks(item); // Re-render to fix counters
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
        const isAlbums = currentTab === 'albums';
        const apiUrl = isAlbums ? '/api/saveAlbums' : '/api/savePlaylists';
        const payloadKey = isAlbums ? 'albums' : 'playlists';
        const payloadVal = isAlbums ? myAlbums : myPlaylists;

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminPassword}`
            },
            body: JSON.stringify({ [payloadKey]: payloadVal })
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
        }
    } catch (e) {
        console.error(e);
        toastMessage.textContent = "Ошибка сети";
        showToast(true);
    }
}

function saveCurrentAlbumOrder() {
    if (!currentAlbumId || !adminPassword) return;
    
    const newOrderIds = Array.from(tracksList.children).map(li => li.dataset.id);
    
    const currentList = currentTab === 'albums' ? myAlbums : myPlaylists;
    const itemIndex = currentList.findIndex(a => a.id === currentAlbumId);
    if (itemIndex !== -1) {
        const oldTracks = currentList[itemIndex].tracks;
        currentList[itemIndex].tracks = newOrderIds.map(id => oldTracks.find(t => t.id === id));
        saveToGlobalDB();
    }
}

function saveToLocalStorage() {
    saveToGlobalDB();
}

let toastTimeout = null;
function showToast(isError = false) {
    toast.classList.add('toast-visible');
    
    const iconName = isError ? 'alert-circle' : 'check-circle';
    const textColor = isError ? 'text-red-500' : 'text-spotify';
    
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
