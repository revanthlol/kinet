import Matter from 'matter-js';
import { Simulation } from './Simulation';
import { Camera } from './Camera';
import { Interaction } from './Interaction';

export class Renderer {
  // ... (setup remains same)
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

  setInteraction(i: Interaction) { this.interaction = i; }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const mb = this.camera.screenToWorld(e.clientX, e.clientY);
    this.camera.zoom = Math.min(Math.max(this.camera.zoom * factor, 0.05), 8);
    this.camera.x = e.clientX - mb.x * this.camera.zoom;
    this.camera.y = e.clientY - mb.y * this.camera.zoom;
  }

  loop() {
    // 1. Update Logic
    this.interaction?.update();
    Matter.Runner.tick(this.simulation.runner, this.simulation.engine, 1000/60);
    this.simulation.update();

    // 2. Clear
    this.ctx.fillStyle = '#0f0f11';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 3. Grid
    this.drawGrid();

    // 4. Scene
    this.ctx.save();
    this.camera.apply(this.ctx);

    this.renderBodies();
    this.renderConstraints();
    this.renderParticles();
    this.renderGizmos();

    this.ctx.restore();
    requestAnimationFrame(this.loop.bind(this));
  }

  renderBodies() {
      const now = Date.now();
      const bodies = Matter.Composite.allBodies(this.simulation.engine.world);

      this.ctx.lineWidth = 2;
      
      for (const b of bodies) {
          if (!b.render.visible) continue;
          
          // --- Spawn Animation Logic ---
          let scale = 1.0;
          if (b.plugin && b.plugin.spawnTime) {
              const age = now - b.plugin.spawnTime;
              if (age < 300) { // 300ms pop-in
                  // Elastic Out ease
                  const t = age / 300;
                  const c4 = (2 * Math.PI) / 3;
                  scale = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
              }
          }

          this.ctx.save();
          // Transform for scaling around body center
          if (scale !== 1.0) {
              this.ctx.translate(b.position.x, b.position.y);
              this.ctx.scale(scale, scale);
              this.ctx.translate(-b.position.x, -b.position.y);
          }

          this.ctx.beginPath();
          b.vertices.forEach((v, i) => i===0 ? this.ctx.moveTo(v.x, v.y) : this.ctx.lineTo(v.x, v.y));
          this.ctx.closePath();
          
          this.ctx.fillStyle = b.render.fillStyle || '#444';
          if (b.isStatic && b.label !== 'ground') this.ctx.fillStyle = '#18181b';
          if (b.label === 'ground') this.ctx.fillStyle = '#0f0f11';

          this.ctx.strokeStyle = b.label==='ground' ? '#3b82f6' : '#000';
          this.ctx.fill();
          this.ctx.stroke();

          // Selection Outline
          if (this.interaction?.hoverBody === b) {
              this.ctx.strokeStyle = '#22c55e'; // Bright green
              this.ctx.lineWidth = 4;
              this.ctx.stroke();
          }

          this.ctx.restore(); // Undo scale
      }
  }

  renderConstraints() {
      const cons = Matter.Composite.allConstraints(this.simulation.engine.world);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      for (const c of cons) {
          if (!c.render.visible || c.label === 'Mouse Constraint') continue;
          if (!c.pointA || !c.pointB) continue;

          const pA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
          const pB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;

          this.ctx.strokeStyle = '#eab308'; // Gold-yellow
          this.ctx.lineWidth = 3;
          
          // Coil visual
          const delta = Matter.Vector.sub(pB, pA);
          const dist = Matter.Vector.magnitude(delta);
          const normal = Matter.Vector.perp(Matter.Vector.normalise(delta));
          
          const coils = 12;
          const width = 8;
          
          this.ctx.beginPath();
          this.ctx.moveTo(pA.x, pA.y);
          for (let i = 1; i <= coils; i++) {
              const t = i / (coils+1);
              const px = pA.x + delta.x*t;
              const py = pA.y + delta.y*t;
              const off = (i%2===0 ? width : -width);
              this.ctx.lineTo(px + normal.x*off, py + normal.y*off);
          }
          this.ctx.lineTo(pB.x, pB.y);
          this.ctx.stroke();
          
          // Dots at ends
          this.ctx.fillStyle = '#eab308';
          this.ctx.beginPath(); this.ctx.arc(pA.x, pA.y, 4, 0, Math.PI*2); this.ctx.fill();
          this.ctx.beginPath(); this.ctx.arc(pB.x, pB.y, 4, 0, Math.PI*2); this.ctx.fill();
      }
  }

  renderParticles() {
      for (const p of this.simulation.particleSystem.particles) {
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.life;
          // Scale particles down by zoom slightly less than physics objects to keep visibility?
          // Default logic is fine
          this.ctx.fillRect(p.x, p.y, 4, 4);
      }
      this.ctx.globalAlpha = 1.0;
  }

  renderGizmos() {
      if (!this.interaction) return;
      const mp = this.interaction.mousePos;

      if (this.interaction.springStartBody) {
          const p = this.interaction.springStartBody.position;
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([6, 6]);
          this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(mp.x, mp.y); this.ctx.stroke();
          this.ctx.setLineDash([]);
          // Source Highlight
          this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 8, 0, Math.PI*2); 
          this.ctx.fillStyle = 'rgba(255,255,255,0.2)'; this.ctx.fill();
      }

      if (this.interaction.slingshotStart) {
          const s = this.interaction.slingshotStart;
          this.ctx.strokeStyle = '#f87171';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath(); this.ctx.moveTo(s.x, s.y); this.ctx.lineTo(mp.x, mp.y); this.ctx.stroke();
          this.ctx.beginPath(); this.ctx.arc(s.x, s.y, 5, 0, Math.PI*2); 
          this.ctx.fillStyle='#f87171'; this.ctx.fill();
      }
  }

  drawGrid() {
      // Improved Dark Mode Grid
      const s = 100 * this.camera.zoom;
      if (s < 5) return;
      const ox = this.camera.x % s;
      const oy = this.camera.y % s;
      
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#1f1f23'; // Slightly lighter than bg
      this.ctx.lineWidth = 1;

      for (let x = ox; x < this.width; x += s) {
          this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height);
      }
      for (let y = oy; y < this.height; y += s) {
          this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y);
      }
      this.ctx.stroke();
  }
}