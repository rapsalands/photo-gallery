export const styles = `
    :host {
        display: block;
        position: relative;
        width: 100%;
    }
    .media-container {
        width: 100%;
        background: #000;
        border: 1px solid #555;
        padding: 5px;
        box-sizing: border-box;
    }
    figure {
        margin: 5px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
    }
    .media-item {
        max-width: 100%;
        max-height: calc(100vh - 150px);
        object-fit: contain;
        display: block;
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
        transition: transform 0.2s;
    }
    .control-button:hover {
        transform: scale(1.1);
    }
    figcaption {
        text-align: center;
        color: white;
        padding: 5px 0;
    }
`;
