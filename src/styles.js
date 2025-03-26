export const styles = `
    :host {
        display: block;
        position: relative;
        width: 100%;
        height: 0;
        padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
        background: #000;
    }
    .media-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
    }
    .media-item {
        max-width: calc(100% - 40px);
        max-height: calc(100% - 40px);
        display: block;
        margin: auto;
        border: 2px solid rgba(255, 255, 255, 0.2);
    }
    video.media-item {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .controls {
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
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
