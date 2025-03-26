export const styles = `
    :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 200px;
        padding: 8px;
        box-sizing: border-box;
        background: #000;
    }
    .media-container {
        width: 100%;
        height: 100%;
        min-height: 200px;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .media-item {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: scale-down;
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    video.media-item {
        width: 100%;
        height: 100%;
        object-fit: contain;
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
        transition: transform 0.2s;
    }
    .control-button:hover {
        transform: scale(1.1);
    }
`;
