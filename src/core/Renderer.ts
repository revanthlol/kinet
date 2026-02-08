import Matter from 'matter-js';
import { Simulation } from './Simulation';
import { Camera } from './Camera';
import { Interaction } from './Interaction';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  simulation: Simulation;
  camera: Camera;
  interaction?: Interaction; 
  width: number;
  height: number;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    this.camera = new Camera();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    document.getElementById('app')!.appendChild(this.canvas);
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    requestAnimationFrame(this.loop.bind(this));
  }

  setInteraction(i: Interaction) {
    this.interaction = i;
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85; // Snappier zoom
    const mb = this.camera.screenToWorld(e.clientX, e.clientY);
    
    const newZoom = Math.min(Math.max(this.camera.zoom * factor, 0.05), 8);
    this.camera.zoom = newZoom;
    this.camera.x = e.clientX - mb.x * newZoom;
    this.camera.y = e.clientY - mb.y * newZoom;
  }

  loop() {
    this.interaction?.update();
    Matter.Runner.tick(this.simulation.runner, this.simulation.engine, 1000/60);
    this.simulation.update();

    // -- Draw --
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawGrid();

    this.ctx.save();
    this.camera.apply(this.ctx);

    // Physics
    this.renderBodies();
    this.renderConstraints();
    this.renderParticles();
    
    // Gizmos (Selection / Hover)
    this.renderGizmos();

    this.ctx.restore();
    requestAnimationFrame(this.loop.bind(this));
  }

  renderBodies() {
      this.ctx.lineWidth = 2;
      for (const b of Matter.Composite.allBodies(this.simulation.engine.world)) {
          if (!b.render.visible) continue;
          this.ctx.beginPath();
          b.vertices.forEach((v, i) => i===0 ? this.ctx.moveTo(v.x, v.y) : this.ctx.lineTo(v.x, v.y));
          this.ctx.closePath();
          
          this.ctx.fillStyle = b.render.fillStyle || '#444';
          if (b.isStatic && b.label !== 'ground') this.ctx.fillStyle = '#2a2a2a'; // dark walls
          if (b.label === 'ground') this.ctx.fillStyle = '#1e1e1e'; // Match bg so only stroke shows
          
          this.ctx.strokeStyle = '#000';
          if (b.label === 'ground') this.ctx.strokeStyle = '#64b5f6';

          this.ctx.fill();
          this.ctx.stroke();

          // Selection highlight for current tool hover
          if (this.interaction?.hoverBody === b) {
              this.ctx.strokeStyle = '#ffff00';
              this.ctx.lineWidth = 4;
              this.ctx.stroke();
              this.ctx.lineWidth = 2;
          }
      }
  }

  // Draw Nice Zig-Zag Springs
  renderConstraints() {
      const constraints = Matter.Composite.allConstraints(this.simulation.engine.world);
      
      for (const c of constraints) {
          if (c.render.visible === false || c.label === 'Mouse Constraint') continue;

          const pA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
          const pB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;

          this.ctx.strokeStyle = c.render.strokeStyle || '#d4ac0d';
          this.ctx.lineWidth = c.render.lineWidth || 2;
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';

          this.ctx.beginPath();
          // Math for Coils
          const delta = Matter.Vector.sub(pB, pA);
          const normal = Matter.Vector.perp(Matter.Vector.normalise(delta));
          
          const coils = 12; // Number of zags
          const width = 10; // Width of coil
          
          this.ctx.moveTo(pA.x, pA.y);
          for (let i = 1; i <= coils; i++) {
              // Interpolate along line
              const t = i / (coils + 1);
              const px = pA.x + delta.x * t;
              const py = pA.y + delta.y * t;
              // Zig Zag Offset
              const offset = (i % 2 === 0) ? width : -width;
              this.ctx.lineTo(px + normal.x * offset, py + normal.y * offset);
          }
          this.ctx.lineTo(pB.x, pB.y);
          this.ctx.stroke();
          
          // Draw endpoints
          this.ctx.fillStyle = this.ctx.strokeStyle;
          this.ctx.beginPath(); this.ctx.arc(pA.x, pA.y, 4, 0, Math.PI*2); this.ctx.fill();
          this.ctx.beginPath(); this.ctx.arc(pB.x, pB.y, 4, 0, Math.PI*2); this.ctx.fill();
      }
  }

  renderParticles() {
      for (const p of this.simulation.particleSystem.particles) {
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.life;
          this.ctx.fillRect(p.x, p.y, 5, 5);
      }
      this.ctx.globalAlpha = 1.0;
  }

  renderGizmos() {
      if (!this.interaction) return;

      const mp = this.interaction.mousePos;

      // 1. Hover/Active Highlights
      if (this.interaction.springStartBody) {
          // Highlight Source Body
          const p = this.interaction.springStartBody.position;
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath(); 
          this.ctx.arc(p.x, p.y, 10, 0, Math.PI*2); 
          this.ctx.stroke();
          
          // Draw Connecting Line to Mouse
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(mp.x, mp.y);
          this.ctx.strokeStyle = this.interaction.hoverBody ? '#00ff00' : '#ffff00'; // Green if Valid
          this.ctx.setLineDash([5, 5]);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
      }

      // 2. Slingshot Visual
      if (this.interaction.slingshotStart) {
          const start = this.interaction.slingshotStart;
          this.ctx.strokeStyle = '#ff4444';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(start.x, start.y);
          this.ctx.lineTo(mp.x, mp.y);
          this.ctx.stroke();
          
          // Reticle
          this.ctx.beginPath(); 
          this.ctx.arc(start.x, start.y, 5, 0, Math.PI*2); 
          this.ctx.fillStyle='#ff4444'; this.ctx.fill();
      }

      // 3. Drag Line
      if (this.interaction.dragConstraint) {
           const pA = this.interaction.dragConstraint.pointA; // Mouse
           const body = this.interaction.dragConstraint.bodyB;
           if (!body) return;
           const pB = Matter.Vector.add(body.position, this.interaction.dragConstraint.pointB); // Local attach point
           
           this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
           this.ctx.lineWidth = 1;
           this.ctx.beginPath();
           this.ctx.moveTo(pA.x, pA.y);
           this.ctx.lineTo(pB.x, pB.y);
           this.ctx.stroke();
      }
  }

  drawGrid() {
     // Subtle infinite grid
     const spacing = 150 * this.camera.zoom;
     if (spacing < 10) return; // Optimization

     const startX = this.camera.x % spacing;
     const startY = this.camera.y % spacing;

     this.ctx.beginPath();
     this.ctx.lineWidth = 1;
     this.ctx.strokeStyle = '#2d2d2d';
     
     // Vertical
     for (let x = startX; x < this.width; x += spacing) {
        this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height);
     }
     // Horizontal
     for (let y = startY; y < this.height; y += spacing) {
         this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y);
     }
     this.ctx.stroke();
  }
}