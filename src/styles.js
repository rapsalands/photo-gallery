export const styles = `
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
