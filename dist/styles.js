export const styles = `
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
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        padding: 16px;
        box-sizing: border-box;
    }
    .media-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255, 255, 255, 0.2);
    }
    .media-item {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: scale-down;
    }
    video.media-item {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .controls {
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
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
