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
        if (!config.source_type || !['local', 'media_source'].includes(config.source_type)) {
            throw new Error('source_type must be either "local" or "media_source"');
        }

        // Create a new config object with all properties
        this._config = {
            source_type: config.source_type,
            path: config.path,
            transition_time: config.transition_time || 5,
            shuffle: Boolean(config.shuffle),
            fit: config.fit || 'contain',
            volume: Number(config.volume || 15)
        };
        
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
        // Remove /local/ prefix if present
        const path = this._config.path.replace(/^\/local\//, '');
        // If path is empty or just "local", use the root media source
        const mediaSourceId = path || 'local';
        
        console.debug("Browsing media source:", mediaSourceId);
        
        const response = await this._hass.callWS({
            type: 'media_source/browse_media',
            media_content_id: `media-source://media_source/${mediaSourceId}`
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
            if (oldMedia.tagName === 'VIDEO') {
                oldMedia.pause();
                oldMedia.currentTime = 0;
            }
            oldMedia.remove();
        }

        const element = media.type === 'video' 
            ? this._createVideoElement(media.url)
            : this._createImageElement(media.url);

        container.appendChild(element);

        // Only set timer for images, videos will use 'ended' event
        if (media.type !== 'video' && this._isPlaying) {
            this._setTimer();
        }
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
                padding: 20px;
                box-sizing: border-box;
            }
            .media-item {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                max-width: calc(100% - 40px);  /* Account for padding */
                max-height: calc(100% - 40px);  /* Account for padding */
                width: auto;
                height: auto;
                object-fit: scale-down;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            video.media-item {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .controls {
                position: absolute;
                top: 20px;  /* Match padding */
                left: 20px;  /* Match padding */
                right: 20px;  /* Match padding */
                padding: 10px;
                background: rgba(0,0,0,0.5);
                color: white;
                display: flex;
                justify-content: center;
                gap: 20px;
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 1;
                border-radius: 8px 8px 0 0;
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
                transition: transform 0.2s;
            }
            .control-button:hover {
                transform: scale(1.1);
            }
            .media-container::before {
                content: '';
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                bottom: 20px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                pointer-events: none;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
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
}

customElements.define('ha-gallery-card', HAGalleryCard);

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

customElements.define('ha-gallery-editor', HAGalleryEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ha-gallery-card',
    name: 'Gallery Card',
    preview: true,
    description: 'A card that displays a gallery of images and videos'
});
