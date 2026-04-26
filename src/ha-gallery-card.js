console.log('HA Gallery Card module loaded');

const styles = `
    :host {
        display: block;
        position: relative;
        width: 100%;
    }
    .media-container {
        width: 100%;
        position: relative;
        aspect-ratio: 16/9;
        background: #000;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .media-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .media-item {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
    }
    video.media-item {
        width: 100%;
        height: 100%;
    }
    .controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 10px;
        background: rgba(0,0,0,0.5);
        color: white;
        display: flex;
        justify-content: center;
        gap: 20px;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 1;
    }
    :host(:hover) .controls {
        opacity: 1;
    }
    .control-button {
        cursor: pointer;
        padding: 5px 10px;
        background: none;
        border: none;
        color: white;
        font-size: 20px;
    }
`;

class HAGalleryCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._mediaList = [];
        this._currentIndex = 0;
        this._isPlaying = true;
        this._isPageVisible = true;
        this._isIntersecting = true;
        this._timer = null;
        this._preloadedImages = new Map();
        this._resolvedUrls = new Map();
        this._urlCacheTimestamps = new Map();
        this._maxCacheAge = 3600000;
        this._isLoading = false;

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    }

    connectedCallback() {
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
        
        this._observer = new IntersectionObserver((entries) => {
            this._isIntersecting = entries[0].isIntersecting;
            this._handleVisibilityChange();
        }, { threshold: 0.1 });
        this._observer.observe(this);
    }

    disconnectedCallback() {
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        if (this._observer) this._observer.disconnect();
        this._stopAll();
    }

    _handleVisibilityChange() {
        const wasVisible = this._isPageVisible && this._isIntersecting;
        this._isPageVisible = !document.hidden;
        const isVisible = this._isPageVisible && this._isIntersecting;

        if (wasVisible && !isVisible) {
            this._stopAll();
        } else if (!wasVisible && isVisible && this._isPlaying) {
            const video = this.shadowRoot.querySelector('video');
            if (video) {
                video.play().catch(() => {});
            } else {
                this._setTimer();
            }
        }
    }

    _stopAll() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        const video = this.shadowRoot.querySelector('video');
        if (video) {
            video.pause();
        }
    }

    static get properties() {
        return {
            _config: { type: Object },
            _hass: { type: Object },
            _mediaList: { type: Array },
            _currentIndex: { type: Number },
            _isPlaying: { type: Boolean },
            _timer: { type: Object }
        };
    }

    static getConfigElement() {
        return document.createElement('ha-gallery-editor');
    }

    // Returns a stub configuration for testing purposes
    static getStubConfig() {
        return {
            source_type: 'media_source',
            path: 'local/photos',
            transition_time: 5,
            shuffle: false,
            fit: 'contain',
            volume: 15
        };
    }

    _clearCaches() {
        console.log('Clearing media caches');
        this._preloadedImages.clear();
        this._resolvedUrls.clear();
        this._urlCacheTimestamps.clear();
        this._mediaList = [];
    }

    setConfig(config) {
        if (!config.path) {
            throw new Error('Please define path');
        }
        if (!config.source_type || !['local', 'media_source'].includes(config.source_type)) {
            throw new Error('source_type must be either "local" or "media_source"');
        }
        
        const validFitValues = ['contain', 'cover', 'fill'];
        if (config.fit && !validFitValues.includes(config.fit)) {
            console.warn(`Invalid fit value "${config.fit}". Using "contain" instead. Valid values are: ${validFitValues.join(', ')}`);
        }

        const oldConfig = this._config;
        
        // Create a new config object with all properties
        this._config = {
            source_type: config.source_type,
            path: config.path,
            transition_time: config.transition_time || 5,
            shuffle: Boolean(config.shuffle),
            fit: validFitValues.includes(config.fit) ? config.fit : 'contain',
            volume: Number(config.volume || 15)
        };

        // If path or source type changed, clear caches and reload
        if (oldConfig && (oldConfig.path !== this._config.path || oldConfig.source_type !== this._config.source_type)) {
            this._clearCaches();
            if (this._hass) this._loadMedia();
        } else if (oldConfig && oldConfig.shuffle !== this._config.shuffle) {
            // If only shuffle changed, re-order the current list
            if (this._mediaList.length > 0) {
                if (this._config.shuffle) {
                    this._mediaList = this._shuffleArray(this._mediaList);
                } else {
                    // We don't have the original order unless we re-load
                    this._loadMedia();
                }
            }
        }
        
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        
        // Initial load
        if (!this._mediaList.length && this._config) {
            this._loadMedia();
        }
    }

    async _loadMedia() {
        if (this._isLoading) return;
        this._isLoading = true;
        
        try {
            let mediaList = [];

            if (this._config.source_type === 'media_source') {
                mediaList = await this._loadFromMediaSource();
            } else {
                mediaList = await this._loadFromLocal();
            }

            if (mediaList && mediaList.length > 0) {
                this._mediaList = this._config.shuffle ? this._shuffleArray(mediaList) : mediaList;
                this._currentIndex = 0;
                this._showMedia();
            } else {
                this._mediaList = [];
                this._showError('No media found in the specified path.');
            }
        } catch (error) {
            console.error('Error loading media:', error);
            this._showError('Error loading media: ' + (error.message || 'Check console'));
        } finally {
            this._isLoading = false;
        }
    }

    async _loadFromMediaSource() {
        try {
            const cleanPath = this._config.path.replace(/^\/+/, '');
            const mediaContentId = cleanPath.startsWith('media-source://') 
                ? cleanPath 
                : `media-source://media_source/${cleanPath}`;

            const response = await this._hass.callWS({
                type: 'media_source/browse_media',
                media_content_id: mediaContentId
            });

            return await this._processMediaSourceResponse(response);
        } catch (error) {
            console.error('Error loading from media source:', error);
            throw error;
        }
    }

    async _processMediaSourceResponse(item) {
        let items = [];
        
        if (item.children) {
            const childrenItems = await Promise.all(item.children.map(async (child) => {
                if (child.media_class === 'directory') {
                    return await this._processMediaSourceResponse(child);
                } else if (child.media_class === 'image' || child.media_class === 'video') {
                    try {
                        const resolvedUrl = await this._getResolvedUrl(child);
                        return [{
                            url: resolvedUrl,
                            type: child.media_class,
                            contentId: child.media_content_id
                        }];
                    } catch (e) {
                        return [];
                    }
                }
                return [];
            }));
            items = childrenItems.flat();
        } else if (item.media_class === 'image' || item.media_class === 'video') {
            const resolvedUrl = await this._getResolvedUrl(item);
            items.push({
                url: resolvedUrl,
                type: item.media_class,
                contentId: item.media_content_id
            });
        }
        
        return items;
    }

    async _loadFromLocal() {
        try {
            const path = this._config.path.replace(/^\/local\//, 'local/');
            return await this._loadFromMediaSourcePath(path);
        } catch (e) {
            return [];
        }
    }

    async _loadFromMediaSourcePath(path) {
        const response = await this._hass.callWS({
            type: 'media_source/browse_media',
            media_content_id: `media-source://media_source/${path}`
        });
        return await this._processMediaSourceResponse(response);
    }

    _shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    render() {
        const style = document.createElement('style');
        style.textContent = styles;

        const container = document.createElement('div');
        container.className = 'media-container';

        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        
        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.innerHTML = `
            <button class="control-button prev">⬅️</button>
            <button class="control-button play-pause">${this._isPlaying ? '⏸️' : '▶️'}</button>
            <button class="control-button next">➡️</button>
        `;

        wrapper.appendChild(controls);
        container.appendChild(wrapper);
        
        // Clear the shadow root
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }

        // Add new elements
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // Wait for elements to be in the DOM before adding listeners
        requestAnimationFrame(() => {
            const prevButton = this.shadowRoot.querySelector('.prev');
            const nextButton = this.shadowRoot.querySelector('.next');
            const playPauseButton = this.shadowRoot.querySelector('.play-pause');
            
            if (prevButton) prevButton.addEventListener('click', () => this._previous());
            if (nextButton) nextButton.addEventListener('click', () => this._next());
            if (playPauseButton) playPauseButton.addEventListener('click', () => this._togglePlayPause());
        });
    }

    _showMedia() {
        if (!this._mediaList.length) return;

        const media = this._mediaList[this._currentIndex];
        const wrapper = this.shadowRoot.querySelector('.media-wrapper');
        const oldMedia = wrapper.querySelector('.media-item');
        
        // Hard cleanup of old media to prevent "Zombie" audio
        if (oldMedia) {
            if (oldMedia.tagName === 'VIDEO') {
                oldMedia.pause();
                oldMedia.src = '';
                oldMedia.load(); // Forces browser to release resources
                oldMedia.remove();
            } else {
                oldMedia.remove();
            }
        }

        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        let element;
        if (media.type === 'video') {
            element = this._createVideoElement(media.url);
        } else {
            const preloadedImage = this._preloadedImages.get(media.url);
            if (preloadedImage && preloadedImage.complete) {
                element = preloadedImage.cloneNode(true);
                element.className = 'media-item';
                element.style.objectFit = this._config.fit;
            } else {
                element = this._createImageElement(media.url);
            }
        }

        wrapper.appendChild(element);

        // Videos trigger _next via 'ended' event, Images use a timer
        const isVisible = this._isPageVisible && this._isIntersecting;
        if (media.type !== 'video' && this._isPlaying && isVisible) {
            this._setTimer();
        }
        
        this._preloadNextImage();
    }

    _createVideoElement(url) {
        const video = document.createElement('video');
        video.className = 'media-item';
        video.src = url;
        video.volume = this._config.volume / 100;
        video.style.objectFit = this._config.fit;
        video.controls = true;
        video.playsInline = true;
        video.addEventListener('ended', () => {
            if (this._isPlaying) {
                this._next();
            }
        });
        video.addEventListener('error', () => this._next());
        video.addEventListener('loadedmetadata', () => {
            // Adjust container height based on video aspect ratio
            const container = this.shadowRoot.querySelector('.media-container');
            if (container && video.videoWidth && video.videoHeight) {
                const aspectRatio = video.videoHeight / video.videoWidth;
                container.style.height = `${container.offsetWidth * aspectRatio}px`;
            }
        });
        if (this._isPlaying) {
            video.play().catch(error => console.error('Error playing video:', error));
        }
        return video;
    }

    _createImageElement(url) {
        const img = document.createElement('img');
        img.className = 'media-item';
        img.src = url;
        img.style.objectFit = this._config.fit;
        img.addEventListener('load', () => {
            // Adjust container height based on image aspect ratio
            const container = this.shadowRoot.querySelector('.media-container');
            if (container && img.naturalWidth && img.naturalHeight) {
                const aspectRatio = img.naturalHeight / img.naturalWidth;
                container.style.height = `${container.offsetWidth * aspectRatio}px`;
            }
            if (this._isPlaying) this._setTimer();
        });
        img.addEventListener('error', () => this._next());
        return img;
    }

    _setTimer() {
        if (this._timer) clearTimeout(this._timer);
        
        // Don't set timer if current media is video
        const currentMedia = this.shadowRoot.querySelector('.media-item');
        if (currentMedia && currentMedia.tagName === 'VIDEO') {
            return; // Let video's 'ended' event handle transition
        }
        
        this._timer = setTimeout(() => this._next(), this._config.transition_time * 1000);
    }

    async _getResolvedUrl(item) {
        // Check if we have a cached URL that hasn't expired
        const cachedUrl = this._resolvedUrls.get(item.media_content_id);
        const timestamp = this._urlCacheTimestamps.get(item.media_content_id);
        const now = Date.now();

        if (cachedUrl && timestamp && (now - timestamp) < this._maxCacheAge) {
            return cachedUrl;
        }

        // Resolve new URL
        const resolveResponse = await this._hass.callWS({
            type: 'media_source/resolve_media',
            media_content_id: item.media_content_id
        });

        const resolvedUrl = resolveResponse.url;
        this._resolvedUrls.set(item.media_content_id, resolvedUrl);
        this._urlCacheTimestamps.set(item.media_content_id, now);
        
        return resolvedUrl;
    }

    _next() {
        if (this._mediaList.length <= 1) return;
        
        this._currentIndex++;
        if (this._currentIndex >= this._mediaList.length) {
            this._currentIndex = 0;
            // Re-shuffle at the end of the list for continuous variety
            if (this._config.shuffle) {
                this._mediaList = this._shuffleArray(this._mediaList);
            }
        }
        this._showMedia();
    }

    _previous() {
        if (this._mediaList.length <= 1) return;
        
        this._currentIndex--;
        if (this._currentIndex < 0) {
            this._currentIndex = this._mediaList.length - 1;
        }
        this._showMedia();
    }

    _togglePlayPause() {
        this._isPlaying = !this._isPlaying;
        const button = this.shadowRoot.querySelector('.play-pause');
        button.textContent = this._isPlaying ? '⏸️' : '▶️';

        const video = this.shadowRoot.querySelector('video');
        if (video) {
            this._isPlaying ? video.play() : video.pause();
        } else if (this._isPlaying) {
            this._setTimer();
        } else if (this._timer) {
            clearTimeout(this._timer);
        }
    }

    _preloadNextImage() {
        if (this._mediaList.length <= 1) return;
        
        const nextIndex = (this._currentIndex + 1) % this._mediaList.length;
        const nextMedia = this._mediaList[nextIndex];
        
        if (nextMedia && nextMedia.type === 'image' && !this._preloadedImages.has(nextMedia.url)) {
            const img = new Image();
            img.src = nextMedia.url;
            this._preloadedImages.set(nextMedia.url, img);
        }
    }

    _showError(message) {
        const wrapper = this.shadowRoot.querySelector('.media-wrapper');
        if (wrapper) {
            while (wrapper.firstChild) {
                wrapper.removeChild(wrapper.firstChild);
            }
            const error = document.createElement('div');
            error.style.color = 'white';
            error.style.padding = '20px';
            error.style.textAlign = 'center';
            error.textContent = message;
            wrapper.appendChild(error);
        }
    }
}

// Editor
class HAGalleryEditor extends HTMLElement {
    constructor() {
        super();
        this._config = {};
    }

    setConfig(config) {
        this._config = {
            source_type: config?.source_type || 'local',
            path: config?.path || '',
            transition_time: config?.transition_time || 5,
            shuffle: Boolean(config?.shuffle),
            fit: config?.fit || 'contain',
            volume: Number(config?.volume || 15)
        };
        this.render();
    }

    _valueChanged(ev) {
        if (!ev.detail?.value) return;
        
        const newConfig = {
            ...this._config,
            ...ev.detail.value
        };

        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: newConfig },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this._config) return;

        const schema = [
            { 
                name: 'source_type',
                required: true,
                selector: {
                    select: {
                        options: [
                            { value: 'local', label: 'Local' },
                            { value: 'media_source', label: 'Media Source' }
                        ],
                        mode: 'dropdown'
                    }
                }
            },
            { 
                name: 'path',
                required: true,
                selector: { text: {} }
            },
            {
                name: 'transition_time',
                selector: { number: { min: 1, max: 60, mode: 'box' } }
            },
            {
                name: 'shuffle',
                selector: { boolean: {} }
            },
            { 
                name: 'fit',
                selector: {
                    select: {
                        options: [
                            { value: 'contain', label: 'Contain' },
                            { value: 'cover', label: 'Cover' },
                            { value: 'fill', label: 'Fill' }
                        ],
                        mode: 'dropdown'
                    }
                }
            },
            {
                name: 'volume',
                selector: { number: { min: 0, max: 100, mode: 'slider' } }
            }
        ];

        this.innerHTML = `
            <ha-form
                .schema=${schema}
                .data=${this._config}
                @value-changed=${this._valueChanged}
            ></ha-form>
        `;
    }
}

// Registration
if (!customElements.get('ha-gallery-card')) {
    customElements.define('ha-gallery-card', HAGalleryCard);
    console.info('HA Gallery Card version 1.0.1 registered');
}

if (!customElements.get('ha-gallery-editor')) {
    customElements.define('ha-gallery-editor', HAGalleryEditor);
}

window.customCards = window.customCards || [];
const cardExists = window.customCards.some(c => c.type === 'ha-gallery-card');
if (!cardExists) {
    window.customCards.push({
        type: 'ha-gallery-card',
        name: 'Gallery Card',
        preview: true,
        description: 'A card that displays a gallery of images and videos'
    });
}
