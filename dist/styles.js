export const styles = `
    :host {
        display: block;
        position: relative;
        width: 100%;
    }
    .media-container {
        width: 100%;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .media-wrapper {
        position: relative;
        width: 100%;  /* Fixed width */
        border: 5px solid #000;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .media-item {
        width: 100%;  /* Always take full width */
        height: auto;  /* Height adjusts automatically */
        object-fit: fill;  /* Stretch to fill */
        display: block;
    }
    video.media-item {
        aspect-ratio: 16/9;  /* Maintain aspect ratio for videos */
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
