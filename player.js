import 'https://cdn.vidstack.io/player';
import 'https://cdn.vidstack.io/icons';

const AUTOPLAY_STORAGE_KEY = 'amarillos:autoplay';
const PLAYER_PREFS_STORAGE_KEY = 'amarillos:playerPrefs';

let player = null;
let inPlayerEpisodeTitle = null;
let autoplaySwitch = null;
let playButton = null;
let muteButton = null;
let volumeRange = null;
let seekRange = null;
let currentTimeLabel = null;
let durationTimeLabel = null;
let fullscreenButton = null;
let settingsButton = null;
let settingsMenu = null;
let settingsRoot = null;
let playHandler = null;
let autoplayEnabled = true;
let overlayHideTimer = null;
let savedPlayerPrefs = null;
let isApplyingSavedPrefs = false;

function setOverlaysHidden(hidden) {
    if (!player) return;
    player.classList.toggle('amarillos-ui-hidden', hidden);
}

function clearOverlayHideTimer() {
    if (!overlayHideTimer) return;
    clearTimeout(overlayHideTimer);
    overlayHideTimer = null;
}

function scheduleOverlayAutoHide(delay = 1800) {
    if (!player) return;

    const isPlaying = player.paused === false;
    if (!isPlaying) {
        setOverlaysHidden(false);
        return;
    }

    clearOverlayHideTimer();
    overlayHideTimer = setTimeout(() => {
        setOverlaysHidden(true);
    }, delay);
}

function showOverlaysTemporarily() {
    setOverlaysHidden(false);
    scheduleOverlayAutoHide();
}

function syncOverlayVisibilityWithPlayback() {
    if (!player) return;

    if (player.paused) {
        clearOverlayHideTimer();
        setOverlaysHidden(false);
        return;
    }

    scheduleOverlayAutoHide();
}

function saveAutoplayPreference() {
    try {
        localStorage.setItem(AUTOPLAY_STORAGE_KEY, autoplayEnabled ? 'on' : 'off');
    } catch (error) {
        console.warn('No se pudo guardar autoplay:', error);
    }
}

function loadAutoplayPreference() {
    try {
        const saved = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
        if (saved === 'on') autoplayEnabled = true;
        if (saved === 'off') autoplayEnabled = false;
    } catch (error) {
        console.warn('No se pudo leer autoplay:', error);
    }
}

function loadPlayerPrefs() {
    try {
        const saved = localStorage.getItem(PLAYER_PREFS_STORAGE_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        const volume = typeof parsed?.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : null;
        const muted = typeof parsed?.muted === 'boolean' ? parsed.muted : null;
        const rate = typeof parsed?.rate === 'number' && Number.isFinite(parsed.rate) && parsed.rate > 0 ? parsed.rate : null;

        if (volume === null && muted === null && rate === null) return null;
        return { volume, muted, rate };
    } catch (error) {
        console.warn('No se pudo leer preferencias del player:', error);
        return null;
    }
}

function savePlayerPrefs(prefs) {
    try {
        localStorage.setItem(PLAYER_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.warn('No se pudo guardar preferencias del player:', error);
    }
}

function getCurrentPlayerPrefs() {
    if (!player) return null;

    const volume = typeof player.volume === 'number' ? Math.max(0, Math.min(1, player.volume)) : null;
    const muted = typeof player.muted === 'boolean' ? player.muted : null;
    const rate = typeof player.playbackRate === 'number' && Number.isFinite(player.playbackRate) && player.playbackRate > 0
        ? player.playbackRate
        : null;

    if (volume === null && muted === null && rate === null) return null;
    return { volume, muted, rate };
}

function applySavedPlayerPrefs() {
    if (!player || !savedPlayerPrefs) return;

    isApplyingSavedPrefs = true;

    if (typeof savedPlayerPrefs.volume === 'number') {
        player.volume = savedPlayerPrefs.volume;
    }

    if (typeof savedPlayerPrefs.muted === 'boolean') {
        player.muted = savedPlayerPrefs.muted;
    }

    if (typeof savedPlayerPrefs.rate === 'number' && Number.isFinite(savedPlayerPrefs.rate) && savedPlayerPrefs.rate > 0) {
        player.playbackRate = savedPlayerPrefs.rate;
    }

    setTimeout(() => {
        isApplyingSavedPrefs = false;
    }, 0);
}

function scheduleApplySavedPlayerPrefs() {
    const delays = [0, 120, 450, 1000];
    delays.forEach((delay) => {
        setTimeout(() => {
            applySavedPlayerPrefs();
        }, delay);
    });
}

function persistPlayerPrefs() {
    if (isApplyingSavedPrefs) return;

    const current = getCurrentPlayerPrefs();
    if (!current) return;

    const hasChanged = !savedPlayerPrefs
        || (typeof current.volume === 'number' && Math.abs((savedPlayerPrefs.volume ?? current.volume) - current.volume) > 0.001)
        || current.muted !== savedPlayerPrefs.muted
        || (typeof current.rate === 'number' && Math.abs((savedPlayerPrefs.rate ?? current.rate) - current.rate) > 0.001);

    if (!hasChanged) return;

    savedPlayerPrefs = current;
    savePlayerPrefs(current);
}

function renderAutoplaySwitch() {
    if (!autoplaySwitch) return;
    autoplaySwitch.setAttribute('aria-pressed', autoplayEnabled ? 'true' : 'false');
    autoplaySwitch.setAttribute('aria-label', autoplayEnabled ? 'Autoplay activado' : 'Autoplay desactivado');
    autoplaySwitch.title = autoplayEnabled ? 'Autoplay: ON' : 'Autoplay: OFF';
    autoplaySwitch.innerText = '↻';
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function isPlayerFullscreen() {
    const element = document.fullscreenElement;
    return Boolean(element && player && element.contains(player));
}

function renderPlayButton() {
    if (!playButton || !player) return;
    const isPaused = player.paused !== false;
    playButton.innerText = isPaused ? '▶' : '❚❚';
    playButton.setAttribute('aria-label', isPaused ? 'Play' : 'Pause');
}

function renderMuteButton() {
    if (!muteButton || !player) return;
    const muted = player.muted || player.volume === 0;
    muteButton.innerText = muted ? '🔇' : '🔊';
    muteButton.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
}

function renderFullscreenButton() {
    if (!fullscreenButton) return;
    const active = isPlayerFullscreen();
    fullscreenButton.innerText = active ? '🡽' : '⛶';
    fullscreenButton.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Pantalla completa');
}

function syncTimeAndSeek() {
    if (!player) return;

    const currentTime = Number(player.currentTime) || 0;
    const duration = Number(player.duration);

    if (currentTimeLabel) currentTimeLabel.innerText = formatTime(currentTime);
    if (durationTimeLabel) durationTimeLabel.innerText = formatTime(duration);

    if (seekRange) {
        const hasDuration = Number.isFinite(duration) && duration > 0;
        seekRange.value = hasDuration
            ? String(Math.round((currentTime / duration) * 1000))
            : '0';
    }
}

function syncVolumeUI() {
    if (!player) return;
    if (volumeRange) {
        const volume = typeof player.volume === 'number' ? Math.max(0, Math.min(1, player.volume)) : 1;
        volumeRange.value = String(volume);
    }
    renderMuteButton();
}

function setupCustomControls() {
    playButton = document.getElementById('vidstack-play-btn');
    muteButton = document.getElementById('vidstack-mute-btn');
    volumeRange = document.getElementById('vidstack-volume-range');
    seekRange = document.getElementById('vidstack-seek-range');
    currentTimeLabel = document.getElementById('vidstack-time-current');
    durationTimeLabel = document.getElementById('vidstack-time-duration');
    fullscreenButton = document.getElementById('vidstack-fullscreen-btn');

    if (playButton) {
        playButton.addEventListener('click', async () => {
            if (!player) return;
            if (player.paused) {
                await player.play().catch(() => {});
            } else {
                player.pause();
            }
            showOverlaysTemporarily();
        });
    }

    if (muteButton) {
        muteButton.addEventListener('click', () => {
            if (!player) return;
            player.muted = !player.muted;
            syncVolumeUI();
            persistPlayerPrefs();
            showOverlaysTemporarily();
        });
    }

    if (volumeRange) {
        volumeRange.addEventListener('input', () => {
            if (!player) return;
            const volume = Number(volumeRange.value);
            if (!Number.isFinite(volume)) return;
            player.volume = Math.max(0, Math.min(1, volume));
            player.muted = player.volume === 0;
            syncVolumeUI();
            persistPlayerPrefs();
        });
    }

    if (seekRange) {
        seekRange.addEventListener('input', () => {
            if (!player) return;
            const duration = Number(player.duration);
            if (!Number.isFinite(duration) || duration <= 0) return;
            const normalized = Number(seekRange.value) / 1000;
            player.currentTime = Math.max(0, Math.min(duration, normalized * duration));
            syncTimeAndSeek();
            showOverlaysTemporarily();
        });
    }

    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', async () => {
            if (!player) return;
            if (isPlayerFullscreen()) {
                await document.exitFullscreen?.().catch(() => {});
            } else if (typeof player.requestFullscreen === 'function') {
                await player.requestFullscreen().catch(() => {});
            }
            renderFullscreenButton();
            showOverlaysTemporarily();
        });
    }

    player.addEventListener('dblclick', async () => {
        if (isPlayerFullscreen()) {
            await document.exitFullscreen?.().catch(() => {});
        } else if (typeof player.requestFullscreen === 'function') {
            await player.requestFullscreen().catch(() => {});
        }
        renderFullscreenButton();
    });

    player.addEventListener('play', renderPlayButton);
    player.addEventListener('pause', renderPlayButton);
    player.addEventListener('time-update', syncTimeAndSeek);
    player.addEventListener('timeupdate', syncTimeAndSeek);
    player.addEventListener('duration-change', syncTimeAndSeek);
    player.addEventListener('durationchange', syncTimeAndSeek);
    player.addEventListener('loaded-metadata', syncTimeAndSeek);
    player.addEventListener('can-play', syncTimeAndSeek);
    player.addEventListener('volume-change', syncVolumeUI);
    player.addEventListener('volumechange', syncVolumeUI);
    player.addEventListener('media-volume-change', syncVolumeUI);
    player.addEventListener('media-muted-change', syncVolumeUI);
    document.addEventListener('fullscreenchange', renderFullscreenButton);

    renderPlayButton();
    syncVolumeUI();
    syncTimeAndSeek();
    renderFullscreenButton();
}

function setSettingsMenuOpen(isOpen) {
    if (!settingsMenu || !settingsButton) return;
    settingsMenu.hidden = !isOpen;
    settingsButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function highlightActiveSpeed() {
    if (!settingsMenu) return;

    const currentRate = typeof player?.playbackRate === 'number' && Number.isFinite(player.playbackRate)
        ? player.playbackRate
        : 1;

    settingsMenu.querySelectorAll('.vidstack-speed-option').forEach((option) => {
        const optionRate = Number(option.dataset.rate);
        const isActive = Number.isFinite(optionRate) && Math.abs(optionRate - currentRate) < 0.01;
        option.classList.toggle('active', isActive);
    });
}

function closeSettingsMenuIfOpen() {
    if (!settingsMenu || settingsMenu.hidden) return;
    setSettingsMenuOpen(false);
}

export function initPlayerModule({
    playerElement,
    inPlayerEpisodeTitleElement,
    getPlaybackState,
    onAutoplayNext,
}) {
    player = playerElement;
    inPlayerEpisodeTitle = inPlayerEpisodeTitleElement;
    autoplaySwitch = document.getElementById('vidstack-autoplay-switch');
    settingsButton = document.getElementById('vidstack-settings-btn');
    settingsMenu = document.getElementById('vidstack-settings-menu');
    settingsRoot = document.getElementById('vidstack-settings');

    if (!player) return;

    closeSettingsMenuIfOpen();

    loadAutoplayPreference();
    savedPlayerPrefs = loadPlayerPrefs();
    scheduleApplySavedPlayerPrefs();
    setupCustomControls();

    if (autoplaySwitch) {
        renderAutoplaySwitch();
        autoplaySwitch.addEventListener('click', () => {
            autoplayEnabled = !autoplayEnabled;
            saveAutoplayPreference();
            renderAutoplaySwitch();
            showOverlaysTemporarily();
        });
    }

    if (settingsButton && settingsMenu) {
        setSettingsMenuOpen(false);
        highlightActiveSpeed();

        settingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const shouldOpen = settingsMenu.hidden;
            setSettingsMenuOpen(shouldOpen);
            if (shouldOpen) {
                highlightActiveSpeed();
                showOverlaysTemporarily();
            }
        });

        settingsMenu.querySelectorAll('.vidstack-speed-option').forEach((option) => {
            option.addEventListener('click', () => {
                const selectedRate = Number(option.dataset.rate);
                if (!Number.isFinite(selectedRate) || selectedRate <= 0) return;
                player.playbackRate = selectedRate;
                highlightActiveSpeed();
                setSettingsMenuOpen(false);
                showOverlaysTemporarily();
            });
        });

        document.addEventListener('click', (event) => {
            if (!settingsMenu || !settingsRoot) return;
            if (!settingsMenu.hidden && !settingsRoot.contains(event.target)) {
                setSettingsMenuOpen(false);
            }
        });
    }

    setOverlaysHidden(false);

    player.addEventListener('mousemove', showOverlaysTemporarily);
    player.addEventListener('pointermove', showOverlaysTemporarily);
    player.addEventListener('touchstart', showOverlaysTemporarily, { passive: true });
    player.addEventListener('focusin', showOverlaysTemporarily);
    player.addEventListener('play', syncOverlayVisibilityWithPlayback);
    player.addEventListener('pause', syncOverlayVisibilityWithPlayback);
    player.addEventListener('ended', () => {
        clearOverlayHideTimer();
        setOverlaysHidden(false);
        if (!autoplayEnabled) return;

        const { currentIndex, currentPlaylist } = getPlaybackState();
        if (currentIndex < currentPlaylist.length - 1) {
            const nextIndex = currentIndex + 1;
            onAutoplayNext(currentPlaylist[nextIndex], nextIndex);
        }
    });

    player.addEventListener('volume-change', persistPlayerPrefs);
    player.addEventListener('media-volume-change', persistPlayerPrefs);
    player.addEventListener('media-muted-change', persistPlayerPrefs);
    player.addEventListener('volumechange', persistPlayerPrefs);
    player.addEventListener('vds-volume-change', persistPlayerPrefs);
    player.addEventListener('vds-media-volume-change', persistPlayerPrefs);
    player.addEventListener('vds-media-muted-change', persistPlayerPrefs);
    player.addEventListener('rate-change', persistPlayerPrefs);
    player.addEventListener('media-rate-change', persistPlayerPrefs);
    player.addEventListener('ratechange', persistPlayerPrefs);
    player.addEventListener('vds-rate-change', persistPlayerPrefs);
    player.addEventListener('vds-media-rate-change', persistPlayerPrefs);
    player.addEventListener('rate-change', highlightActiveSpeed);
    player.addEventListener('media-rate-change', highlightActiveSpeed);
    player.addEventListener('ratechange', highlightActiveSpeed);
    player.addEventListener('loaded-metadata', scheduleApplySavedPlayerPrefs);
    player.addEventListener('can-play', scheduleApplySavedPlayerPrefs);

    window.addEventListener('beforeunload', () => {
        persistPlayerPrefs();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            persistPlayerPrefs();
        }
    });

}

export async function playEpisodeInPlayer({
    cap,
    index,
    overlayTitle,
    baseUrl,
    seriePoster,
    onEpisodeActivated,
}) {
    if (!player || !cap) return;

    const videoUrl = `${baseUrl}/stream/${cap.id_telegram}`;

    if (inPlayerEpisodeTitle) {
        inPlayerEpisodeTitle.innerText = overlayTitle || cap.titulo;
    }

    closeSettingsMenuIfOpen();
    showOverlaysTemporarily();

    if (typeof onEpisodeActivated === 'function') {
        onEpisodeActivated(index);
    }

    player.autoplay = true;
    player.poster = cap.thumbnail || seriePoster;

    if (playHandler) player.removeEventListener('can-play', playHandler);
    playHandler = () => {
        player.play().catch((error) => console.log('Aviso nav:', error));
    };
    player.addEventListener('can-play', playHandler, { once: true });

    try {
        const vault = await caches.open('amarillos-video-vault-v1');
        const cachedVideo = await vault.match(videoUrl);

        if (cachedVideo) {
            console.log('🎬 Offline (Bóveda)');
            const blob = await cachedVideo.blob();
            const localUrl = URL.createObjectURL(blob);
            player.src = { src: localUrl, type: 'video/mp4' };
            scheduleApplySavedPlayerPrefs();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        console.log('📡 Online (Internet)');
        player.src = { src: videoUrl, type: 'video/mp4' };
        scheduleApplySavedPlayerPrefs();
    } catch (error) {
        player.src = { src: videoUrl, type: 'video/mp4' };
        scheduleApplySavedPlayerPrefs();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
