export class Camera {
    x: number = 0;
    y: number = 0;
    zoom: number = 1;
    minZoom: number = 0.1;
    maxZoom: number = 5.0;

    constructor() {
        // Center initially
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
    }

    apply(ctx: CanvasRenderingContext2D) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.zoom, this.zoom);
    }

    // Convert Screen coordinates (pixels) to World coordinates
    screenToWorld(sx: number, sy: number) {
        return {
            x: (sx - this.x) / this.zoom,
            y: (sy - this.y) / this.zoom
        };
    }
}