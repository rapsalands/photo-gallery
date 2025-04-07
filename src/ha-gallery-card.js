console.log('HA Gallery Card module loaded');
import { styles } from './styles.js';

class HAGalleryCard extends HTMLElement {
    constructor() {
        super();
        console.log('HA Gallery Card constructor called');
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
            source_type: 'media_source',
            path: 'local/photos',
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
        
        const validFitValues = ['contain', 'cover', 'fill'];
        if (config.fit && !validFitValues.includes(config.fit)) {
            console.warn(`Invalid fit value "${config.fit}". Using "contain" instead. Valid values are: ${validFitValues.join(', ')}`);
        }

        // Create a new config object with all properties
        this._config = {
            source_type: config.source_type,
            path: config.path,
            transition_time: config.transition_time || 5,
            shuffle: Boolean(config.shuffle),
            fit: validFitValues.includes(config.fit) ? config.fit : 'contain',
            volume: Number(config.volume || 15)
        };
        
        console.log('Card configuration:', this._config);
        this.render();
    }

    set hass(hass) {
        console.log('hass setter called, current config:', this._config);
        console.log('Current media list length:', this._mediaList.length);
        this._hass = hass;
        if (!this._mediaList.length && this._config) {
            console.log('Initializing media loading...');
            this._loadMedia();
        }
    }

    async _loadMedia() {
        try {
            console.log('_loadMedia called with config:', this._config);
            let mediaList = [];

            if (this._config.source_type === 'media_source') {
                console.log('Loading from media source...');
                mediaList = await this._loadFromMediaSource();
            } else {
                console.log('Loading from local source...');
                mediaList = await this._loadFromLocal();
            }

            console.log('Loaded media list:', mediaList);

            if (mediaList && mediaList.length > 0) {
                this._mediaList = this._config.shuffle ? this._shuffleArray(mediaList) : mediaList;
                console.log('Final media list:', this._mediaList);
                this._showMedia();
            } else {
                console.warn('No media found in the specified path');
                this._showError('No media found in the specified path. Please check your configuration.');
            }
        } catch (error) {
            console.error('Error loading media:', error);
            let errorMessage = 'Error loading media. ';
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please check browser console for details.';
            }
            this._showError(errorMessage);
        }
    }

    _showError(message) {
        const wrapper = this.shadowRoot.querySelector('.media-wrapper');
        if (wrapper) {
            // Clear any existing content
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

    async _loadFromMediaSource() {
        try {
            // Remove leading slash if present and clean the path
            const cleanPath = this._config.path.replace(/^\/+/, '');
            console.log('Loading media from path:', cleanPath);

            // For media_source type, we need to use the full media source identifier
            const mediaContentId = cleanPath.startsWith('media-source://') 
                ? cleanPath 
                : `media-source://media_source/${cleanPath}`;

            console.log('Using media content ID:', mediaContentId);

            // First, try to browse the media
            const response = await this._hass.callWS({
                type: 'media_source/browse_media',
                media_content_id: mediaContentId
            });

            console.log('Media source response:', response);

            if (response && response.children) {
                return Promise.all(response.children.map(async (item) => {
                    console.log('Processing item:', item);
                    if (item.media_class === 'image' || item.media_class === 'video') {
                        try {
                            const resolveResponse = await this._hass.callWS({
                                type: 'media_source/resolve_media',
                                media_content_id: item.media_content_id
                            });
                            console.log('Resolved media:', resolveResponse);
                            return {
                                url: resolveResponse.url,
                                type: item.media_class
                            };
                        } catch (resolveError) {
                            console.error('Error resolving media item:', resolveError);
                            return null;
                        }
                    }
                    return null;
                })).then(items => {
                    const filteredItems = items.filter(item => item !== null);
                    console.log('Final media list:', filteredItems);
                    return filteredItems;
                });
            }
            return [];
        } catch (error) {
            console.error('Error loading from media source:', error);
            throw error; // Re-throw to show in UI
        }
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

        wrapper.appendChild(element);

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

console.log('Registering ha-gallery-card custom element');
customElements.define('ha-gallery-card', HAGalleryCard);
console.log('Registering ha-gallery-editor custom element');
customElements.define('ha-gallery-editor', HAGalleryEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ha-gallery-card',
    name: 'Gallery Card',
    preview: true,
    description: 'A card that displays a gallery of images and videos'
});
console.log('HA Gallery Card registration complete');
