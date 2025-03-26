class HAGalleryCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._mediaList = [];
        this._currentIndex = 0;
        this._isPlaying = true;
        this._timer = null;
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

    static getStubConfig() {
        return {
            source_type: 'local',  // 'local' or 'media_source'
            path: '/local/photos',
            transition_time: 5,
            shuffle: false,
            fit: 'contain',
            volume: 15
        };
    }

    setConfig(config) {
        if (!config.path) {
            throw new Error('Please define path');
        }
        if (!['local', 'media_source'].includes(config.source_type)) {
            throw new Error('source_type must be either "local" or "media_source"');
        }
        this._config = config;
        this._config.source_type = config.source_type || 'local';
        this._config.transition_time = config.transition_time || 5;
        this._config.shuffle = config.shuffle || false;
        this._config.fit = config.fit || 'contain';
        this._config.volume = config.volume || 15;
        
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        if (!this._mediaList.length) {
            this._loadMedia();
        }
    }

    async _loadMedia() {
        try {
            let mediaList = [];

            if (this._config.source_type === 'media_source') {
                mediaList = await this._loadFromMediaSource();
            } else {
                mediaList = await this._loadFromLocal();
            }

            this._mediaList = this._config.shuffle ? this._shuffleArray(mediaList) : mediaList;
            if (this._mediaList.length) {
                this._showMedia();
            }
        } catch (error) {
            console.error('Error loading media:', error);
        }
    }

    async _loadFromMediaSource() {
        const path = this._config.path.replace('/local/', '');
        const response = await this._hass.callWS({
            type: 'media_source/browse_media',
            media_content_id: `media-source://media_source/${path}`
        });

        return this._processMediaSourceResponse(response);
    }

    async _processMediaSourceResponse(item) {
        let items = [];
        
        if (item.media_class === 'directory' && item.children) {
            for (const child of item.children) {
                items = items.concat(await this._processMediaSourceResponse(child));
            }
        } else if (item.media_class === 'image' || item.media_class === 'video') {
            const resolveResponse = await this._hass.callWS({
                type: 'media_source/resolve_media',
                media_content_id: item.media_content_id
            });
            if (resolveResponse?.url) {
                items.push({
                    url: resolveResponse.url,
                    type: item.media_class
                });
            }
        }
        
        return items;
    }

    async _loadFromLocal() {
        // For local paths, we'll rely on the files being in the correct location
        // and matching our supported extensions
        return []; // This will be implemented based on directory listing capability
    }

    _shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    _showMedia() {
        if (!this._mediaList.length) return;

        const media = this._mediaList[this._currentIndex];
        const container = this.shadowRoot.querySelector('.media-container');
        const oldMedia = container.querySelector('.media-item');
        
        if (oldMedia) {
            if (oldMedia.tagName === 'VIDEO') oldMedia.pause();
            oldMedia.remove();
        }

        const element = media.type === 'video' 
            ? this._createVideoElement(media.url)
            : this._createImageElement(media.url);

        container.appendChild(element);
    }

    _createVideoElement(url) {
        const video = document.createElement('video');
        video.className = 'media-item';
        video.src = url;
        video.volume = this._config.volume / 100;
        video.style.objectFit = this._config.fit;
        video.controls = true;
        video.playsInline = true;
        video.addEventListener('ended', () => this._next());
        video.addEventListener('error', () => this._next());
        if (this._isPlaying) video.play();
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
        this._currentIndex = (this._currentIndex + 1) % this._mediaList.length;
        this._showMedia();
    }

    _previous() {
        this._currentIndex = (this._currentIndex - 1 + this._mediaList.length) % this._mediaList.length;
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

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 200px;
            }
            .media-container {
                width: 100%;
                height: 100%;
                min-height: 200px;
                position: relative;
                background: #000;
                overflow: hidden;
            }
            .media-item {
                position: absolute;
                top: 0;
                left: 0;
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

        const container = document.createElement('div');
        container.className = 'media-container';
        
        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.innerHTML = `
            <button class="control-button prev">⬅️</button>
            <button class="control-button play-pause">${this._isPlaying ? '⏸️' : '▶️'}</button>
            <button class="control-button next">➡️</button>
        `;

        container.appendChild(controls);
        
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // Add event listeners
        controls.querySelector('.prev').addEventListener('click', () => this._previous());
        controls.querySelector('.next').addEventListener('click', () => this._next());
        controls.querySelector('.play-pause').addEventListener('click', () => this._togglePlayPause());
    }
}

customElements.define('ha-gallery-card', HAGalleryCard);

// Editor
class HaGalleryEditor extends HTMLElement {
    setConfig(config) {
        this._config = config;
    }

    configChanged(newConfig) {
        const event = new Event('config-changed', {
            bubbles: true,
            composed: true
        });
        event.detail = { config: newConfig };
        this.dispatchEvent(event);
    }

    render() {
        if (!this._config) return;

        this.innerHTML = `
            <ha-form
                .data=${this._config}
                .schema=${[
                    { name: 'source_type', selector: { select: { options: [{ value: 'local', label: 'Local' }, { value: 'media_source', label: 'Media Source' }] } } },
                    { name: 'path', selector: { text: {} } },
                    { name: 'transition_time', selector: { number: { min: 1, max: 60 } } },
                    { name: 'shuffle', selector: { boolean: {} } },
                    { 
                        name: 'fit',
                        selector: {
                            select: {
                                options: [
                                    { value: 'contain', label: 'Contain' },
                                    { value: 'cover', label: 'Cover' },
                                    { value: 'fill', label: 'Fill' }
                                ]
                            }
                        }
                    },
                    { name: 'volume', selector: { number: { min: 0, max: 100 } } }
                ]}
                @value-changed=${e => this.configChanged(e.detail.value)}
            ></ha-form>
        `;
    }
}

customElements.define('ha-gallery-editor', HaGalleryEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ha-gallery-card',
    name: 'Gallery Card',
    preview: true,
    description: 'A card that displays a gallery of images and videos'
});
