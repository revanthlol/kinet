export class Camera {
    x: number = 0;
    y: number = 0;
    zoom: number = 1;
    minZoom: number = 0.1;
    maxZoom: number = 5.0;

    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
    }

    apply(ctx: CanvasRenderingContext2D) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.zoom, this.zoom);
    }

    screenToWorld(sx: number, sy: number) {
        return {
            x: (sx - this.x) / this.zoom,
            y: (sy - this.y) / this.zoom
        };
    }

    move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }
}