import Matter from 'matter-js';
import { Simulation } from './Simulation';
import { Camera } from './Camera';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  simulation: Simulation;
  camera: Camera;
  width: number;
  height: number;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    this.camera = new Camera(); // Initialize Camera
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    document.getElementById('app')!.appendChild(this.canvas);
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    
    // Zoom listener (passive: false to allow preventDefault)
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = 1 + (zoomIntensity * direction);

    const mouseBeforeZoom = this.camera.screenToWorld(e.clientX, e.clientY);
    
    // Clamp zoom
    const newZoom = Math.min(Math.max(this.camera.zoom * factor, this.camera.minZoom), this.camera.maxZoom);
    this.camera.zoom = newZoom;

    // Adjust camera position so mouse stays relative to world point
    this.camera.x = e.clientX - mouseBeforeZoom.x * newZoom;
    this.camera.y = e.clientY - mouseBeforeZoom.y * newZoom;
  }

  loop() {
    // 1. Step Physics
    Matter.Runner.tick(this.simulation.runner, this.simulation.engine, 1000 / 60);
    this.simulation.update();

    // 2. Clear Screen
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 3. Grid Background (Parallax illusion)
    this.drawGrid();

    // 4. Apply Camera Transform
    this.ctx.save();
    this.camera.apply(this.ctx);

    // 5. Render Bodies
    const bodies = Matter.Composite.allBodies(this.simulation.engine.world);
    this.ctx.beginPath();
    for (const body of bodies) {
      if (body.render.visible === false) continue;
      const vertices = body.vertices;
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let j = 1; j < vertices.length; j++) {
        this.ctx.lineTo(vertices[j].x, vertices[j].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
    }
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#888';
    this.ctx.stroke();
    // Fill based on properties or random ID
    this.ctx.fillStyle = '#444';
    
    // Highlight if selected/static
    for (const body of bodies) {
       this.ctx.fillStyle = body.isStatic ? '#222' : (body.render.fillStyle || '#444');
       this.ctx.fill();
    }

    // 6. Render Constraints (Springs)
    const constraints = Matter.Composite.allConstraints(this.simulation.engine.world);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#d4ac0d'; // Gold spring
    this.ctx.beginPath();
    for (const c of constraints) {
        if (!c.pointA || !c.pointB) continue;
        // World coordinates of points
        const pA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
        const pB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;
        this.ctx.moveTo(pA.x, pA.y);
        
        // Draw coil effect
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(pB, pA));
        const mid = Matter.Vector.div(Matter.Vector.add(pA, pB), 2);
        
        // Simple line for now
        this.ctx.lineTo(pB.x, pB.y);
    }
    this.ctx.stroke();

    // 7. Render Particles
    for (const p of this.simulation.particleSystem.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, 4 / this.camera.zoom + 2, 4 / this.camera.zoom + 2); // Scale size with zoom
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
    requestAnimationFrame(this.loop);
  }

  drawGrid() {
      const spacing = 100 * this.camera.zoom;
      const offsetX = this.camera.x % spacing;
      const offsetY = this.camera.y % spacing;

      this.ctx.beginPath();
      this.ctx.strokeStyle = '#2a2a2a';
      this.ctx.lineWidth = 1;

      for (let x = offsetX; x < this.width; x += spacing) {
          this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height);
      }
      for (let y = offsetY; y < this.height; y += spacing) {
          this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y);
      }
      this.ctx.stroke();
  }
}