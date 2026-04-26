console.log('HA Gallery Card module loaded - Version 1.0.3-DIAG');

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
        this._resolvedUrls = new Map();
        this._urlCacheTimestamps = new Map();
        this._maxCacheAge = 300000; // 5 mins
        this._isLoading = false;
        this._consecutiveFailures = 0;

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
        if (video) video.pause();
    }

    static get properties() {
        return {
            _config: { type: Object },
            _hass: { type: Object }
        };
    }

    static getConfigElement() {
        return document.createElement('ha-gallery-editor');
    }

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

    setConfig(config) {
        if (!config.path) throw new Error('Please define path');
        
        const oldConfig = this._config;
        this._config = {
            source_type: config.source_type || 'media_source',
            path: config.path,
            transition_time: config.transition_time || 5,
            shuffle: Boolean(config.shuffle),
            fit: config.fit || 'contain',
            volume: Number(config.volume || 15)
        };

        if (oldConfig && (oldConfig.path !== this._config.path)) {
            this._mediaList = [];
            if (this._hass) this._loadMedia();
        }
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        if (!this._mediaList.length && this._config && !this._isLoading) {
            this._loadMedia();
        }
    }

    async _loadMedia() {
        if (this._isLoading) return;
        this._isLoading = true;
        
        const rawPath = (this._config.path || '').trim();
        console.log('[HA Gallery] STARTING LOAD. Path:', rawPath);
        
        try {
            // Smart ID resolution:
            // 1. If it already has a protocol (contains '://'), use it exactly as is.
            // 2. Otherwise, prepend the standard Home Assistant media_source prefix.
            const mediaContentId = rawPath.includes('://') 
                ? rawPath 
                : `media-source://media_source/${rawPath.replace(/^\/+/, '')}`;

            console.log('[HA Gallery] Requesting Browse with ID:', mediaContentId);
            
            const response = await this._hass.callWS({
                type: 'media_source/browse_media',
                media_content_id: mediaContentId
            });

            console.log('[HA Gallery] RAW RESPONSE RECEIVED:', response);

            if (!response || !response.children) {
                console.warn('[HA Gallery] Response has no children.');
                this._mediaList = [];
            } else {
                this._mediaList = response.children
                    .filter(child => child.media_class === 'image' || child.media_class === 'video')
                    .map(child => ({
                        url: null,
                        type: child.media_class,
                        contentId: child.media_content_id,
                        title: child.title
                    }));
                
                console.log(`[HA Gallery] Filtered ${this._mediaList.length} media items.`);
            }

            if (this._mediaList.length > 0) {
                if (this._config.shuffle) {
                    this._mediaList = this._shuffleArray(this._mediaList);
                }
                this._currentIndex = 0;
                this._showMedia();
            } else {
                this._showError('No media found.');
            }
        } catch (error) {
            console.error('[HA Gallery] LOAD ERROR:', error);
            this._showError('Error: ' + (error.message || 'Unknown. See Console.'));
        } finally {
            this._isLoading = false;
        }
    }

    async _showMedia() {
        if (!this._mediaList.length) return;
        const media = this._mediaList[this._currentIndex];
        
        try {
            console.log(`[HA Gallery] Showing item ${this._currentIndex + 1}/${this._mediaList.length}: ${media.title || media.contentId}`);
            
            const mediaUrl = await this._getResolvedUrl(media);
            this._consecutiveFailures = 0;

            const wrapper = this.shadowRoot.querySelector('.media-wrapper');
            const oldMedia = wrapper.querySelector('.media-item');
            
            if (oldMedia) {
                if (oldMedia.tagName === 'VIDEO') {
                    oldMedia.pause();
                    oldMedia.src = '';
                    oldMedia.load();
                }
                oldMedia.remove();
            }

            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }

            const element = media.type === 'video' 
                ? this._createVideoElement(mediaUrl)
                : this._createImageElement(mediaUrl);

            wrapper.appendChild(element);

            if (media.type !== 'video' && this._isPlaying && this._isPageVisible && this._isIntersecting) {
                this._setTimer();
            }
        } catch (error) {
            console.error('[HA Gallery] DISPLAY ERROR:', error);
            this._consecutiveFailures++;
            if (this._consecutiveFailures < 5) {
                this._timer = setTimeout(() => this._next(), 2000);
            } else {
                this._showError('Multiple failures. Stopped.');
            }
        }
    }

    async _getResolvedUrl(item) {
        const cachedUrl = this._resolvedUrls.get(item.contentId);
        const timestamp = this._urlCacheTimestamps.get(item.contentId);
        if (cachedUrl && timestamp && (Date.now() - timestamp) < this._maxCacheAge) {
            return cachedUrl;
        }

        const resolveResponse = await this._hass.callWS({
            type: 'media_source/resolve_media',
            media_content_id: item.contentId
        });

        this._resolvedUrls.set(item.contentId, resolveResponse.url);
        this._urlCacheTimestamps.set(item.contentId, Date.now());
        return resolveResponse.url;
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
                this._timer = setTimeout(() => this._next(), this._config.transition_time * 1000);
            }
        });
        video.addEventListener('error', () => this._next());
        return video;
    }

    _createImageElement(url) {
        const img = document.createElement('img');
        img.className = 'media-item';
        img.src = url;
        img.style.objectFit = this._config.fit;
        img.addEventListener('load', () => {
            if (this._isPlaying) this._setTimer();
        });
        img.addEventListener('error', () => this._next());
        return img;
    }

    _setTimer() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this._next(), this._config.transition_time * 1000);
    }

    _next() {
        if (!this._mediaList.length) return;
        this._currentIndex = (this._currentIndex + 1) % this._mediaList.length;
        if (this._currentIndex === 0 && this._config.shuffle) {
            this._mediaList = this._shuffleArray(this._mediaList);
        }
        this._showMedia();
    }

    _previous() {
        if (!this._mediaList.length) return;
        this._currentIndex = (this._currentIndex - 1 + this._mediaList.length) % this._mediaList.length;
        this._showMedia();
    }

    _shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    _showError(message) {
        const wrapper = this.shadowRoot.querySelector('.media-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `<div style="color: white; padding: 20px; text-align: center;">${message}</div>`;
        }
    }

    render() {
        const style = document.createElement('style');
        style.textContent = styles;
        const container = document.createElement('div');
        container.className = 'media-container';
        container.innerHTML = `<div class="media-wrapper"><div class="controls"><button class="control-button prev">⬅️</button><button class="control-button play-pause">${this._isPlaying ? '⏸️' : '▶️'}</button><button class="control-button next">➡️</button></div></div>`;
        
        while (this.shadowRoot.firstChild) this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        requestAnimationFrame(() => {
            this.shadowRoot.querySelector('.prev')?.addEventListener('click', () => this._previous());
            this.shadowRoot.querySelector('.next')?.addEventListener('click', () => this._next());
            this.shadowRoot.querySelector('.play-pause')?.addEventListener('click', () => {
                this._isPlaying = !this._isPlaying;
                if (!this._isPlaying && this._timer) clearTimeout(this._timer);
                if (this._isPlaying) this._showMedia();
                this.render();
            });
        });
    }
}

// Editor
class HAGalleryEditor extends HTMLElement {
    constructor() { super(); this._config = {}; }
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
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: { ...this._config, ...ev.detail.value } },
            bubbles: true, composed: true
        }));
    }
    render() {
        const schema = [
            { name: 'source_type', selector: { select: { options: [{ value: 'local', label: 'Local' }, { value: 'media_source', label: 'Media Source' }], mode: 'dropdown' } } },
            { name: 'path', selector: { text: {} } },
            { name: 'transition_time', selector: { number: { min: 1, max: 60, mode: 'box' } } },
            { name: 'shuffle', selector: { boolean: {} } },
            { name: 'fit', selector: { select: { options: [{ value: 'contain', label: 'Contain' }, { value: 'cover', label: 'Cover' }, { value: 'fill', label: 'Fill' }], mode: 'dropdown' } } },
            { name: 'volume', selector: { number: { min: 0, max: 100, mode: 'slider' } } }
        ];
        this.innerHTML = `<ha-form .schema=${schema} .data=${this._config} @value-changed=${this._valueChanged}></ha-form>`;
    }
}

if (!customElements.get('ha-gallery-card')) customElements.define('ha-gallery-card', HAGalleryCard);
if (!customElements.get('ha-gallery-editor')) customElements.define('ha-gallery-editor', HAGalleryEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'ha-gallery-card')) {
    window.customCards.push({ type: 'ha-gallery-card', name: 'Gallery Card', preview: true, description: 'Diagnostic version' });
}
