((LitElement) => {
    console.info(
        '%c HA-GALLERY-CARD %c 1.2.0 ',
        'color: white; background: #039be5; font-weight: 700;',
        'color: #039be5; background: white; font-weight: 700;',
    );
})(window.customElements.get('home-assistant-main')
    ? Object.getPrototypeOf(customElements.get('home-assistant-main'))
    : Object.getPrototypeOf(customElements.get('hui-view')));

class HAGalleryCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        if (!config.media_sources) {
            throw new Error('Please define media_sources');
        }
        this.config = config;
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
            }
            .gallery-container {
                width: 100%;
                height: 100%;
                position: relative;
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
            }
            .media-item.active {
                opacity: 1;
            }
            img, video {
                width: 100%;
                height: 100%;
                object-fit: ${this.fitMode};
                object-position: center;
            }
            .controls {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.5);
                color: white;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            :host(:hover) .controls {
                opacity: 1;
            }
            .play-pause, .prev, .next {
                cursor: pointer;
                padding: 5px;
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
            <div class="prev">⬅️</div>
            <div class="play-pause">⏸️</div>
            <div class="next">➡️</div>
            <input type="range" class="volume-control" min="0" max="100" value="${this.defaultVolume}">
        `;

        container.appendChild(controls);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

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
        try {
            console.debug("Loading media list with sources:", this.config.media_sources);
            
            // Call Home Assistant API to get media list
            const responses = await Promise.all(this.config.media_sources.map(async (source) => {
                console.debug("Processing source:", source);
                
                try {
                    if (source.type === 'media_source') {
                        // Handle media source browsing
                        const mediaSourceId = source.path.split('media-source://media_source/')[1];
                        console.debug("Browsing media source:", mediaSourceId);
                        
                        const response = await this._hass.callWS({
                            type: 'media_source/browse_media',
                            media_content_id: `media-source://media_source/${mediaSourceId}`
                        });
                        console.debug("Media source response:", response);
                        return response;
                    } else {
                        // Handle local source
                        const response = await this._hass.callWS({
                            type: 'ha_gallery/get_media',
                            media_sources: [source]
                        });
                        console.debug("Local source response:", response);
                        return response;
                    }
                } catch (error) {
                    console.error("Error processing source:", source, error);
                    return null;
                }
            }));

            console.debug("All responses:", responses);

            this.mediaList = responses.reduce((acc, response) => {
                if (response && response.success && response.media_list) {
                    // Handle local source response
                    console.debug("Adding media from local source:", response.media_list);
                    return acc.concat(response.media_list);
                } else if (response && response.children) {
                    // Handle media source response
                    console.debug("Processing media source children:", response.children);
                    const mediaItems = response.children
                        .filter(child => child.media_class === 'image' || child.media_class === 'video')
                        .map(child => ({
                            type: child.media_class,
                            url: child.media_content_id,
                            thumbnail: child.thumbnail
                        }));
                    console.debug("Adding media from media source:", mediaItems);
                    return acc.concat(mediaItems);
                } else {
                    console.warn("Invalid response format:", response);
                    return acc;
                }
            }, []);

            console.debug("Final media list:", this.mediaList);
            
            if (this.mediaList.length === 0) {
                console.warn("No media found in any source");
            }
        } catch (error) {
            console.error("Error loading media list:", error);
            this.mediaList = [];
        }
    }

    shuffleMediaList() {
        for (let i = this.mediaList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.mediaList[i], this.mediaList[j]] = [this.mediaList[j], this.mediaList[i]];
        }
    }

    async showCurrentMedia() {
        if (!this.mediaList || this.mediaList.length === 0) {
            console.warn("No media to display");
            return;
        }

        const container = this.shadowRoot.querySelector('.gallery-container');
        const currentMedia = this.mediaList[this.mediaIndex];
        
        if (!currentMedia) {
            console.error("Invalid media at index", this.mediaIndex);
            return;
        }

        console.debug("Showing media:", currentMedia);

        // Remove old media items
        const oldItems = container.querySelectorAll('.media-item');
        oldItems.forEach(item => {
            if (!item.classList.contains('active')) {
                item.remove();
            }
        });

        // Create new media item
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';

        if (currentMedia.type === 'video') {
            const video = document.createElement('video');
            video.src = currentMedia.url;
            video.controls = true;
            video.volume = this.defaultVolume / 100;
            video.style.objectFit = this.fitMode;
            mediaItem.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = currentMedia.url;
            img.style.objectFit = this.fitMode;
            mediaItem.appendChild(img);
        }

        // Add new media item
        container.insertBefore(mediaItem, container.firstChild);

        // Trigger reflow
        mediaItem.offsetHeight;

        // Remove active class from old items and add to new
        oldItems.forEach(item => item.classList.remove('active'));
        mediaItem.classList.add('active');

        // Set up next media timer if playing
        if (this.isPlaying && currentMedia.type !== 'video') {
            this.setNextMediaTimer();
        }
    }

    setNextMediaTimer() {
        if (this.nextMediaTimer) {
            clearTimeout(this.nextMediaTimer);
        }
        this.nextMediaTimer = setTimeout(() => this.nextMedia(), this.transitionInterval * 1000);
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
        button.textContent = this.isPlaying ? '⏸️' : '▶️';

        if (this.isPlaying) {
            this.setNextMediaTimer();
        } else if (this.nextMediaTimer) {
            clearTimeout(this.nextMediaTimer);
        }
    }

    updateVolume(value) {
        this.defaultVolume = value;
        const video = this.shadowRoot.querySelector('video');
        if (video) {
            video.volume = value / 100;
        }
    }

    static getStubConfig() {
        return {
            media_sources: [
                {
                    type: 'local',
                    path: '/local/photos'
                }
            ],
            transition_interval: 5,
            shuffle: false,
            fit_mode: "contain",
            default_volume: 50
        };
    }
}

customElements.define('ha-gallery-card', HAGalleryCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ha-gallery-card',
    name: 'HA Photo Gallery',
    preview: false,
    description: 'A gallery card that displays images and videos with auto-transition'
});
