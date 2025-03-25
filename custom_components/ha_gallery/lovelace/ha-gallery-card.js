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
            this.defaultVolume = configEntry.attributes.default_volume || 15;
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
                min-height: 200px;
            }
            .gallery-container {
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
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
            }
            .media-item.active {
                opacity: 1;
            }
            img, video {
                width: 100%;
                height: 100%;
                object-fit: ${this.fitMode || 'contain'};
                object-position: center;
            }
            .controls {
                position: absolute;
                top: 0;
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
                z-index: 10;
            }
            :host(:hover) .controls {
                opacity: 1;
            }
            .controls-left, .controls-right {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .play-pause, .prev, .next {
                cursor: pointer;
                padding: 5px;
            }
            .volume-control {
                width: 100px;
            }
            .duration {
                margin-left: 10px;
                font-size: 14px;
                font-family: monospace;
            }
            .progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 0%;
                height: 2px;
                background: #039be5;
                transition: width 0.1s linear;
            }
            .empty-gallery {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #fff;
                text-align: center;
            }
        `;

        const container = document.createElement('div');
        container.className = 'gallery-container';

        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.innerHTML = `
            <div class="controls-left">
                <div class="prev">⬅️</div>
                <div class="play-pause">⏸️</div>
                <div class="next">➡️</div>
                <div class="duration"></div>
            </div>
            <div class="controls-right">
                <input type="range" class="volume-control" min="0" max="100" value="${this.defaultVolume}">
            </div>
        `;

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        controls.appendChild(progressBar);

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

                        // Recursively get all media items from directories
                        const getAllMediaItems = async (item) => {
                            console.debug("Processing media item:", item);
                            let items = [];

                            if (item.media_class === 'directory') {
                                console.debug("Browsing directory:", item.media_content_id);
                                const dirResponse = await this._hass.callWS({
                                    type: 'media_source/browse_media',
                                    media_content_id: item.media_content_id
                                });
                                console.debug("Directory response:", dirResponse);

                                if (dirResponse && dirResponse.children) {
                                    for (const child of dirResponse.children) {
                                        items = items.concat(await getAllMediaItems(child));
                                    }
                                }
                            } else if (item.media_class === 'image' || item.media_class === 'video') {
                                // Get media URL
                                console.debug("Getting URL for media item:", item.media_content_id);
                                try {
                                    const resolveResponse = await this._hass.callWS({
                                        type: 'media_source/resolve_media',
                                        media_content_id: item.media_content_id
                                    });
                                    console.debug("Resolve response:", resolveResponse);
                                    
                                    if (resolveResponse && resolveResponse.url) {
                                        items.push({
                                            type: item.media_class,
                                            url: resolveResponse.url,
                                            thumbnail: item.thumbnail
                                        });
                                    } else {
                                        console.warn("No URL in resolve response for:", item.media_content_id);
                                    }
                                } catch (error) {
                                    console.error("Error resolving media URL:", error);
                                }
                            }
                            return items;
                        };

                        // Process root response
                        if (response) {
                            if (response.media_class === 'directory') {
                                // It's a directory, process all items
                                const items = await getAllMediaItems(response);
                                console.debug("Found media items:", items);
                                return { success: true, media_list: items };
                            } else if (response.media_class === 'image' || response.media_class === 'video') {
                                // Single media item
                                const resolveResponse = await this._hass.callWS({
                                    type: 'media_source/resolve_media',
                                    media_content_id: response.media_content_id
                                });
                                console.debug("Single item resolve response:", resolveResponse);
                                
                                if (resolveResponse && resolveResponse.url) {
                                    return {
                                        success: true,
                                        media_list: [{
                                            type: response.media_class,
                                            url: resolveResponse.url,
                                            thumbnail: response.thumbnail
                                        }]
                                    };
                                }
                            }
                        }
                        return { success: false };
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
                } else {
                    console.warn("Invalid response format:", response);
                    return acc;
                }
            }, []);

            console.debug("Final media list:", this.mediaList);
            
            if (this.mediaList.length === 0) {
                console.warn("No media found in any source");
                const container = this.shadowRoot.querySelector('.gallery-container');
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-gallery';
                emptyMessage.textContent = 'No media found in configured sources';
                container.appendChild(emptyMessage);
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

        // Clear any existing timer
        if (this.nextMediaTimer) {
            clearTimeout(this.nextMediaTimer);
            this.nextMediaTimer = null;
        }

        // Reset progress bar
        const progressBar = this.shadowRoot.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }

        // Clear duration display
        const durationDisplay = this.shadowRoot.querySelector('.duration');
        if (durationDisplay) {
            durationDisplay.textContent = '';
        }

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
            video.style.objectFit = this.fitMode || 'contain';
            video.playsInline = true;
            video.autoplay = this.isPlaying;
            video.muted = false;

            // Handle video events
            video.addEventListener('ended', () => {
                console.debug("Video ended, moving to next media");
                if (this.isPlaying) {
                    this.nextMedia();
                }
            });

            video.addEventListener('error', (e) => {
                console.error("Video error:", e);
                // Move to next media after error
                if (this.isPlaying) {
                    this.setNextMediaTimer();
                }
            });

            video.addEventListener('loadeddata', () => {
                console.debug("Video loaded");
                if (this.isPlaying) {
                    video.play().catch(e => console.error("Error playing video:", e));
                }
            });

            video.addEventListener('timeupdate', () => {
                if (durationDisplay && video.duration) {
                    const currentTime = Math.floor(video.currentTime);
                    const duration = Math.floor(video.duration);
                    durationDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
                }
                if (progressBar && video.duration) {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            });

            mediaItem.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = currentMedia.url;
            img.style.objectFit = this.fitMode || 'contain';

            // Handle image events
            img.addEventListener('load', () => {
                console.debug("Image loaded");
                if (this.isPlaying) {
                    this.setNextMediaTimer();
                    // Start progress bar animation for images
                    if (progressBar) {
                        progressBar.style.transition = `width ${this.transitionInterval}s linear`;
                        progressBar.style.width = '100%';
                    }
                    if (durationDisplay) {
                        durationDisplay.textContent = `${this.formatTime(0)} / ${this.formatTime(this.transitionInterval)}`;
                    }
                }
            });

            img.addEventListener('error', () => {
                console.error("Image failed to load:", currentMedia.url);
                if (this.isPlaying) {
                    this.setNextMediaTimer();
                }
            });

            mediaItem.appendChild(img);
        }

        // Add new media item
        container.insertBefore(mediaItem, container.firstChild);

        // Trigger reflow
        mediaItem.offsetHeight;

        // Remove active class from old items and add to new
        oldItems.forEach(item => {
            const oldVideo = item.querySelector('video');
            if (oldVideo) {
                oldVideo.pause();
            }
            item.classList.remove('active');
            item.remove();
        });
        mediaItem.classList.add('active');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

        const currentVideo = this.shadowRoot.querySelector('video');
        if (currentVideo) {
            if (this.isPlaying) {
                currentVideo.play().catch(e => console.error("Error playing video:", e));
            } else {
                currentVideo.pause();
            }
        } else if (this.isPlaying) {
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

    static getConfigElement() {
        return document.createElement('ha-gallery-editor');
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
            default_volume: 15
        };
    }
}

customElements.define('ha-gallery-card', HAGalleryCard);

// Create editor class
class HaGalleryEditor extends HTMLElement {
    setConfig(config) {
        this.config = config;
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
        if (!this.config) {
            return;
        }

        const container = document.createElement('div');
        container.innerHTML = `
            <ha-form
                .data=${this.config}
                .schema=${[
                    {
                        name: "media_sources",
                        selector: {
                            object: {
                                type: { selector: { select: { options: ["local", "media_source"] } } },
                                path: { selector: { text: {} } }
                            }
                        }
                    },
                    { name: "transition_interval", selector: { number: { min: 1, max: 60 } } },
                    { name: "shuffle", selector: { boolean: {} } },
                    { 
                        name: "fit_mode",
                        selector: {
                            select: {
                                options: [
                                    { value: "contain", label: "Contain" },
                                    { value: "cover", label: "Cover" },
                                    { value: "fill", label: "Fill" }
                                ]
                            }
                        }
                    },
                    { name: "default_volume", selector: { number: { min: 0, max: 100 } } }
                ]}
                @value-changed=${e => this.configChanged(e.detail.value)}
            ></ha-form>
        `;

        return container;
    }
}

customElements.define('ha-gallery-editor', HaGalleryEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "ha-gallery-card",
    name: "HA Gallery Card",
    preview: true,
    description: "A card that displays a gallery of images and videos"
});
