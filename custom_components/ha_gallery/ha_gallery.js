class HAGalleryCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set hass(hass) {
        this._hass = hass;

        if (!this.initialized) {
            this.initialized = true;
            this.mediaIndex = 0;
            this.mediaList = [];
            this.isPlaying = true;
            this.loadConfiguration();
            this.setupGallery();
        }
    }

    setConfig(config) {
        this.config = config;
    }

    loadConfiguration() {
        // Load configuration from HA config entry
        const configEntry = this._hass.states['ha_gallery.config'];
        if (configEntry) {
            this.transitionInterval = configEntry.attributes.transition_interval || 5;
            this.shuffle = configEntry.attributes.shuffle || false;
            this.fitMode = configEntry.attributes.fit_mode || 'contain';
            this.defaultVolume = configEntry.attributes.default_volume || 50;
        }
    }

    async setupGallery() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                position: relative;
                width: 100%;
                height: 100%;
            }
            .gallery-container {
                width: 100%;
                height: 100%;
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
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                object-fit: var(--fit-mode, contain);
            }
            .media-item.active {
                opacity: 1;
            }
            .controls {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.5);
                padding: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .gallery-container:hover .controls {
                opacity: 1;
            }
            button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 5px 10px;
            }
            button:hover {
                background: rgba(255,255,255,0.1);
            }
            .volume-control {
                width: 100px;
            }
        `;

        const container = document.createElement('div');
        container.className = 'gallery-container';
        
        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.innerHTML = `
            <button class="prev">Previous</button>
            <button class="play-pause">Pause</button>
            <button class="next">Next</button>
            <input type="range" class="volume-control" min="0" max="100" value="${this.defaultVolume}">
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
        container.appendChild(controls);

        // Event listeners
        controls.querySelector('.prev').addEventListener('click', () => this.previousMedia());
        controls.querySelector('.next').addEventListener('click', () => this.nextMedia());
        controls.querySelector('.play-pause').addEventListener('click', () => this.togglePlayPause());
        controls.querySelector('.volume-control').addEventListener('input', (e) => this.updateVolume(e.target.value));

        // Start loading media
        await this.loadMediaList();
        if (this.shuffle) {
            this.shuffleMediaList();
        }
        this.showCurrentMedia();
    }

    async loadMediaList() {
        // TODO: Implement API call to Home Assistant to get media list
        // For now, using dummy data
        this.mediaList = [
            { type: 'image', url: '/local/media/image1.jpg' },
            { type: 'video', url: '/local/media/video1.mp4' },
            { type: 'image', url: '/local/media/image2.jpg' }
        ];
    }

    shuffleMediaList() {
        for (let i = this.mediaList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.mediaList[i], this.mediaList[j]] = [this.mediaList[j], this.mediaList[i]];
        }
    }

    async showCurrentMedia() {
        const container = this.shadowRoot.querySelector('.gallery-container');
        const currentMedia = this.mediaList[this.mediaIndex];
        
        // Remove previous active media
        const activeMedia = container.querySelector('.media-item.active');
        if (activeMedia) {
            activeMedia.remove();
        }

        // Create new media element
        const mediaElement = currentMedia.type === 'video' 
            ? document.createElement('video')
            : document.createElement('img');
        
        mediaElement.className = 'media-item';
        mediaElement.src = currentMedia.url;
        mediaElement.style.setProperty('--fit-mode', this.fitMode);

        if (currentMedia.type === 'video') {
            mediaElement.volume = this.defaultVolume / 100;
            mediaElement.addEventListener('ended', () => this.nextMedia());
        }

        container.insertBefore(mediaElement, container.firstChild);
        
        // Wait for media to load
        await new Promise((resolve) => {
            mediaElement.onload = resolve;
            mediaElement.onerror = resolve;
        });

        mediaElement.classList.add('active');

        // Set timer for next media if it's an image
        if (currentMedia.type === 'image' && this.isPlaying) {
            this.setNextMediaTimer();
        }

        if (currentMedia.type === 'video' && this.isPlaying) {
            mediaElement.play();
        }
    }

    setNextMediaTimer() {
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
        }
        this.transitionTimer = setTimeout(() => this.nextMedia(), this.transitionInterval * 1000);
    }

    nextMedia() {
        this.mediaIndex = (this.mediaIndex + 1) % this.mediaList.length;
        this.showCurrentMedia();
    }

    previousMedia() {
        this.mediaIndex = (this.mediaIndex - 1 + this.mediaList.length) % this.mediaList.length;
        this.showCurrentMedia();
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        const button = this.shadowRoot.querySelector('.play-pause');
        button.textContent = this.isPlaying ? 'Pause' : 'Play';

        const currentMedia = this.shadowRoot.querySelector('.media-item');
        if (currentMedia.tagName === 'VIDEO') {
            if (this.isPlaying) {
                currentMedia.play();
            } else {
                currentMedia.pause();
            }
        } else if (this.isPlaying) {
            this.setNextMediaTimer();
        } else {
            clearTimeout(this.transitionTimer);
        }
    }

    updateVolume(value) {
        const video = this.shadowRoot.querySelector('video');
        if (video) {
            video.volume = value / 100;
        }
        this.defaultVolume = value;
    }

    static getConfigElement() {
        return document.createElement('ha-gallery-editor');
    }

    static getStubConfig() {
        return {};
    }
}

customElements.define('ha-gallery-card', HAGalleryCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ha-gallery-card',
    name: 'Home Assistant Gallery',
    preview: false,
    description: 'A gallery card that displays images and videos with auto-transition'
});
