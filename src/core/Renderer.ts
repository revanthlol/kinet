import Matter from 'matter-js';
import { Simulation } from './Simulation';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  simulation: Simulation;
  width: number;
  height: number;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error("Could not get canvas context");
    this.ctx = context;

    document.getElementById('app')!.appendChild(this.canvas);
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.handleResize();
    
    window.addEventListener('resize', () => this.handleResize());
    
    // Start custom render loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // Rebuild boundaries
    this.simulation.createBoundaries(this.width, this.height);
  }

  loop() {
    // 1. Step Physics
    Matter.Runner.tick(this.simulation.runner, this.simulation.engine, 1000 / 60);
    this.simulation.update();

    // 2. Clear Screen
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 3. Render Bodies
    const bodies = Matter.Composite.allBodies(this.simulation.engine.world);
    
    this.ctx.beginPath();
    for (const body of bodies) {
      if (body.render.visible === false) continue;
      
      const vertices = body.vertices;
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let j = 1; j < vertices.length; j += 1) {
        this.ctx.lineTo(vertices[j].x, vertices[j].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
    }
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.stroke();
    this.ctx.fillStyle = '#444444';
    this.ctx.fill();

    // 4. Render Particles
    for (const p of this.simulation.particleSystem.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;

    requestAnimationFrame(this.loop);
  }
}