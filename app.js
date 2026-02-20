import { initPlayerModule, playEpisodeInPlayer } from './player.js';

const BASE_URL = 'https://fran04x-amarillos-app-stream.hf.space';
const STREAM_PREFIX = `${BASE_URL}/stream/`;

// 1) Selección de Elementos (DOM Caching)
const player = document.querySelector('media-player');
const inPlayerEpisodeTitle = document.getElementById('player-episode-title');
const seasonSelect = document.getElementById('season-select');
const episodesList = document.getElementById('episodes-grid');
const homeGrid = document.getElementById('home-grid');
const downloadsGrid = document.getElementById('downloads-grid');
const seasonIndex = document.getElementById('season-index');
const seasonPrev = document.getElementById('season-prev');
const seasonNext = document.getElementById('season-next');
const homeTitle = document.querySelector('#home-view .home-title');
const logoHome = document.getElementById('logo-home');
const btnNavDownloads = document.getElementById('btn-nav-downloads');
const navMenu = document.getElementById('nav-menu');
const menuDownloads = document.getElementById('menu-downloads');
const homeView = document.getElementById('home-view');
const downloadsView = document.getElementById('downloads-view');
const playerView = document.getElementById('player-view');

player.poster = serieData.poster;

// 2) Estado Global (State)
let currentPlaylist = [];
let currentIndex = 0;
let allEpisodesFlat = [];
const episodesByStreamUrl = new Map();
let activeSeasonFilter = null;

// 3) Funciones (Lógica)
function initApp() {
    allEpisodesFlat = [];
    episodesByStreamUrl.clear();
    seasonSelect.innerHTML = '';

    serieData.temporadas.forEach((temp) => {
        const option = document.createElement('option');
        option.value = temp.numero;
        option.innerText = `Temporada ${temp.numero}`;
        seasonSelect.appendChild(option);

        temp.capitulos.forEach((cap, index) => {
            const episodeWithMeta = { ...cap, seasonNumber: temp.numero, originalIndex: index };
            allEpisodesFlat.push(episodeWithMeta);
            episodesByStreamUrl.set(getEpisodeStreamUrl(cap), episodeWithMeta);
        });
    });

    renderSeasonIndex();
    generateHomeGrid();
}

function setActiveSeasonChip() {
    const chips = seasonIndex.querySelectorAll('.season-chip');
    chips.forEach((chip) => {
        const chipSeason = Number(chip.dataset.season || 0);
        chip.classList.toggle('active', activeSeasonFilter === chipSeason);
    });
}

function updateSeasonNavButtons() {
    const hasOverflow = seasonIndex.scrollWidth > seasonIndex.clientWidth + 2;
    if (!hasOverflow) {
        seasonPrev.style.display = 'none';
        seasonNext.style.display = 'none';
        return;
    }

    const atStart = seasonIndex.scrollLeft <= 2;
    const atEnd = seasonIndex.scrollLeft + seasonIndex.clientWidth >= seasonIndex.scrollWidth - 2;

    seasonPrev.style.display = atStart ? 'none' : 'inline-flex';
    seasonNext.style.display = atEnd ? 'none' : 'inline-flex';
}

function filterHomeBySeason(seasonNumber) {
    if (activeSeasonFilter === seasonNumber) {
        activeSeasonFilter = null;
    } else {
        activeSeasonFilter = seasonNumber;
    }

    setActiveSeasonChip();
    generateHomeGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSeasonIndex() {
    seasonIndex.innerHTML = '';

    serieData.temporadas.forEach((temp) => {
        const chip = document.createElement('button');
        chip.className = 'season-chip';
        chip.innerText = temp.numero;
        chip.dataset.season = temp.numero;
        chip.addEventListener('click', () => filterHomeBySeason(temp.numero));
        seasonIndex.appendChild(chip);
    });

    setActiveSeasonChip();
    seasonIndex.scrollLeft = 0;
    updateSeasonNavButtons();
}

function formatEpisodeDisplay(cap) {
    const episodeMatch = cap.titulo.match(/(\d+)x(\d+)\s*-\s*(.+)$/i);
    const displayTitle = episodeMatch ? episodeMatch[3].trim() : cap.titulo;
    const displayEpisode = episodeMatch ? parseInt(episodeMatch[2], 10) : null;
    const displaySeason = cap.seasonNumber || (episodeMatch ? parseInt(episodeMatch[1], 10) : null);
    const displayMeta = displaySeason !== null
        ? `Temporada ${displaySeason}${displayEpisode !== null ? ` Episodio ${displayEpisode}` : ''}`
        : (displayEpisode !== null ? `Episodio ${displayEpisode}` : '');

    return { displayTitle, displayMeta };
}

function getEpisodeThumb(cap) {
    return cap.thumbnail || serieData.poster;
}

function getEpisodeStreamUrl(cap) {
    return `${STREAM_PREFIX}${cap.id_telegram}`;
}

function createCatalogCard(cap, { onOpen, onDelete, openOnCard = false } = {}) {
    const { displayTitle, displayMeta } = formatEpisodeDisplay(cap);
    const thumbSrc = getEpisodeThumb(cap);
    const hasDelete = typeof onDelete === 'function';

    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="video-thumb">
            <img src="${thumbSrc}" loading="lazy">
            <div class="video-duration">${cap.duracion}</div>
        </div>
        <div class="video-info">
            <div>
                <h4>${displayTitle}</h4>
                <p>${displayMeta}</p>
            </div>
            ${hasDelete ? '<button class="btn-delete" title="Eliminar descarga">🗑️</button>' : ''}
        </div>
    `;

    const thumbElement = card.querySelector('.video-thumb');
    if (typeof onOpen === 'function') {
        if (openOnCard) {
            card.addEventListener('click', onOpen);
        } else if (thumbElement) {
            thumbElement.addEventListener('click', onOpen);
        }
    }

    if (hasDelete) {
        const deleteButton = card.querySelector('.btn-delete');
        deleteButton.addEventListener('click', async (event) => {
            event.stopPropagation();
            await onDelete();
        });
    }

    return card;
}

function generateHomeGrid() {
    const sourceEpisodes = activeSeasonFilter !== null
        ? allEpisodesFlat
            .filter((cap) => cap.seasonNumber == activeSeasonFilter)
            .sort((a, b) => a.originalIndex - b.originalIndex)
        : [...allEpisodesFlat].sort(() => 0.5 - Math.random()).slice(0, 40);

    if (activeSeasonFilter !== null) {
        homeTitle.innerText = `Temporada ${activeSeasonFilter}`;
    } else {
        homeTitle.innerText = 'Recomendados';
    }

    homeGrid.innerHTML = '';

    sourceEpisodes.forEach((cap) => {
        const card = createCatalogCard(cap, {
            onOpen: () => playFromHome(cap),
            openOnCard: true,
        });
        homeGrid.appendChild(card);
    });
}

function hideAllViews() {
    document.querySelectorAll('.view-section').forEach((view) => view.classList.remove('active'));
}

function goHome() {
    player.pause();
    closeNavMenu();
    hideAllViews();
    homeView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDownloads() {
    player.pause();
    closeNavMenu();
    hideAllViews();
    downloadsView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderDownloads();
}

function closeNavMenu() {
    if (!navMenu || !btnNavDownloads) return;
    navMenu.hidden = true;
    btnNavDownloads.setAttribute('aria-expanded', 'false');
}

function toggleNavMenu() {
    if (!navMenu || !btnNavDownloads) return;
    const shouldOpen = navMenu.hidden;
    navMenu.hidden = !shouldOpen;
    btnNavDownloads.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function setupNavMenu() {
    if (!btnNavDownloads || !navMenu || !menuDownloads) return;

    btnNavDownloads.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleNavMenu();
    });

    menuDownloads.addEventListener('click', () => {
        closeNavMenu();
        showDownloads();
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!navMenu.hidden && !navMenu.contains(target) && !btnNavDownloads.contains(target)) {
            closeNavMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeNavMenu();
    });
}

function playFromHome(capData) {
    hideAllViews();
    playerView.classList.add('active');
    seasonSelect.value = capData.seasonNumber;
    loadEpisodes(capData.seasonNumber);
    playEpisode(capData, capData.originalIndex);
}

async function renderDownloads() {
    downloadsGrid.innerHTML = '<p class="downloads-loading-text">Buscando en la bóveda...</p>';

    try {
        const vault = await caches.open('amarillos-video-vault-v1');
        const keys = await vault.keys();

        if (keys.length === 0) {
            downloadsGrid.innerHTML = '<p class="downloads-loading-text">No tienes capítulos descargados aún.</p>';
            return;
        }

        downloadsGrid.innerHTML = '';

        keys.forEach((request) => {
            const url = request.url;
            const cap = episodesByStreamUrl.get(url);
            if (!cap) return;

            const card = createCatalogCard(cap, {
                onOpen: () => playFromHome(cap),
                onDelete: async () => {
                    if (confirm(`¿Eliminar "${cap.titulo}" del celular?`)) {
                        await vault.delete(request);
                        renderDownloads();
                    }
                },
            });

            downloadsGrid.appendChild(card);
        });
    } catch (error) {
        downloadsGrid.innerHTML = '<p class="downloads-error-text">Error al acceder a las descargas.</p>';
    }
}

function loadEpisodes(seasonNum) {
    episodesList.innerHTML = '';
    const season = serieData.temporadas.find((temp) => temp.numero == seasonNum);
    if (!season) return;

    currentPlaylist = season.capitulos;

    currentPlaylist.forEach((cap, index) => {
        const card = document.createElement('div');
        card.className = 'episode-card';
        card.id = `ep-${index}`;

        const { displayTitle, displayMeta } = formatEpisodeDisplay(cap);
        const thumbSrc = getEpisodeThumb(cap);

        card.innerHTML = `
            <img src="${thumbSrc}" class="card-thumb" loading="lazy">
            <div class="episode-info-side">
                <strong>${displayTitle}</strong>
                <small>${displayMeta}${displayMeta ? ' • ' : ''}${cap.duracion}</small>
            </div>
            <div class="play-icon">▶</div>
        `;

        card.addEventListener('click', () => playEpisode(cap, index));
        episodesList.appendChild(card);
    });
}

async function playEpisode(cap, index) {
    currentIndex = index;
    const { displayTitle } = formatEpisodeDisplay(cap);
    await playEpisodeInPlayer({
        cap,
        index,
        overlayTitle: displayTitle,
        baseUrl: BASE_URL,
        seriePoster: serieData.poster,
        onEpisodeActivated: (activeIndex) => {
            document.querySelectorAll('.episode-card').forEach((card) => card.classList.remove('active-episode'));
            const activeCard = document.getElementById(`ep-${activeIndex}`);

            if (activeCard) {
                activeCard.classList.add('active-episode');
                activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        },
    });
}

// 4) Event Listeners (Inicialización)
seasonSelect.addEventListener('change', (event) => loadEpisodes(event.target.value));

seasonPrev.addEventListener('click', () => {
    seasonIndex.scrollBy({ left: -220, behavior: 'smooth' });
});

seasonNext.addEventListener('click', () => {
    seasonIndex.scrollBy({ left: 220, behavior: 'smooth' });
});

seasonIndex.addEventListener('scroll', updateSeasonNavButtons);
window.addEventListener('resize', updateSeasonNavButtons);

logoHome.addEventListener('click', goHome);
setupNavMenu();

initPlayerModule({
    playerElement: player,
    inPlayerEpisodeTitleElement: inPlayerEpisodeTitle,
    getPlaybackState: () => ({
        currentIndex,
        currentPlaylist,
    }),
    onAutoplayNext: (nextCap, nextIndex) => {
        playEpisode(nextCap, nextIndex);
    },
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('✅ Bóveda lista:', reg.scope))
            .catch((err) => console.error('❌ Error Bóveda:', err));
    });
}

initApp();
