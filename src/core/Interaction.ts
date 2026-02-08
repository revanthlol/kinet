import Matter from 'matter-js';
import { Simulation } from './Simulation';
import { Renderer } from './Renderer';
import { ContextMenu } from '../ui/ContextMenu';
import { Controls } from '../ui/Controls';

export class Interaction {
  simulation: Simulation;
  renderer: Renderer;
  contextMenu: ContextMenu;
  controls: Controls;

  // Camera & Navigation
  keys: { [key: string]: boolean } = {};
  isPanDrag: boolean = false;
  panStart: { x: number, y: number } = { x: 0, y: 0 };
  camStart: { x: number, y: number } = { x: 0, y: 0 };

  // Pointer State
  mousePos: { x: number, y: number } = { x: 0, y: 0 };
  
  // -- Tools State --
  dragConstraint: Matter.Constraint | null = null;
  
  // Spring Logic
  springStartBody: Matter.Body | null = null; // The body we started dragging from
  hoverBody: Matter.Body | null = null;       // The body currently under the mouse

  // Slingshot
  slingshotStart: { x: number, y: number } | null = null;

  constructor(sim: Simulation, renderer: Renderer, ctxMenu: ContextMenu, controls: Controls) {
    this.simulation = sim;
    this.renderer = renderer;
    this.contextMenu = ctxMenu;
    this.controls = controls;

    this.bindEvents();
  }

  bindEvents() {
    const cvs = this.renderer.canvas;
    
    // Keyboard
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

    // Mouse / Touch
    cvs.addEventListener('contextmenu', (e) => {
        if (e.ctrlKey) { e.preventDefault(); return; } // Let pan logic handle
        e.preventDefault();
        this.contextMenu.show(e.clientX, e.clientY);
    });

    cvs.addEventListener('pointerdown', (e) => this.handleDown(e));
    cvs.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerup', (e) => this.handleUp(e));
  }

  update() {
      // WASD Camera
      const speed = 15 / this.renderer.camera.zoom;
      if (this.keys['w']) this.renderer.camera.y += speed;
      if (this.keys['s']) this.renderer.camera.y -= speed;
      if (this.keys['a']) this.renderer.camera.x += speed;
      if (this.keys['d']) this.renderer.camera.x -= speed;
  }

  handleDown(e: PointerEvent) {
      if (e.button === 1 || (e.ctrlKey && e.button === 2) || (e.altKey)) {
          this.isPanDrag = true;
          this.panStart = { x: e.clientX, y: e.clientY };
          this.camStart = { x: this.renderer.camera.x, y: this.renderer.camera.y };
          return;
      }
      if (e.button !== 0) return;

      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
      const clickedBody = this.findBodyAt(worldPos);

      // --- State Machine ---
      if (this.controls.activeTool === 'move') {
          if (clickedBody) this.startDrag(clickedBody, worldPos);
          else this.spawnShape(worldPos.x, worldPos.y);
      } 
      else if (this.controls.activeTool === 'connect') {
          // Only start a spring if we clicked a valid body
          if (clickedBody) {
              this.springStartBody = clickedBody;
          }
      }
      else if (this.controls.activeTool === 'shoot') {
          this.slingshotStart = worldPos;
      }
  }

  handleMove(e: PointerEvent) {
      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
      this.mousePos = worldPos;

      // Pan
      if (this.isPanDrag) {
          this.renderer.camera.x = this.camStart.x + (e.clientX - this.panStart.x);
          this.renderer.camera.y = this.camStart.y + (e.clientY - this.panStart.y);
          return;
      }

      // Drag
      if (this.dragConstraint && this.dragConstraint.bodyB) {
          // Adjust offset to make grabbing feel "tight"
          this.dragConstraint.pointA = worldPos; 
          Matter.Sleeping.set(this.dragConstraint.bodyB, false); // Wake up
      }

      // Connect Tool: Hover Check
      if (this.controls.activeTool === 'connect' && this.springStartBody) {
          const body = this.findBodyAt(worldPos);
          // Highlight valid target (different body, or background which we might allow pinning to)
          if (body && body.id !== this.springStartBody.id) {
              this.hoverBody = body;
          } else {
              this.hoverBody = null;
          }
      }
  }

  handleUp(e: PointerEvent) {
      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);

      if (this.isPanDrag) { this.isPanDrag = false; return; }

      // Release Drag
      if (this.dragConstraint) {
          Matter.Composite.remove(this.simulation.engine.world, this.dragConstraint);
          this.dragConstraint = null;
      }

      // Release Connect
      if (this.controls.activeTool === 'connect' && this.springStartBody) {
          const target = this.hoverBody; 
          
          if (target && target.id !== this.springStartBody.id) {
              // We have a start body and an end body
              this.createSpring(this.springStartBody, target);
          } else if (!target) {
             // Pin to background (optional feature, maybe useful?)
             // this.createPin(this.springStartBody, worldPos);
          }
          this.springStartBody = null;
          this.hoverBody = null;
      }

      // Release Slingshot
      if (this.controls.activeTool === 'shoot' && this.slingshotStart) {
          const dx = this.slingshotStart.x - worldPos.x;
          const dy = this.slingshotStart.y - worldPos.y;
          // Spawn shape
          const body = this.spawnShape(this.slingshotStart.x, this.slingshotStart.y, true);
          const forceMult = 0.002 * body.mass; // Scale force by mass
          Matter.Body.applyForce(body, body.position, { x: dx * forceMult, y: dy * forceMult });
          this.slingshotStart = null;
      }
  }

  // --- Logic Helpers ---

  findBodyAt(pos: {x:number, y:number}) {
      const bodies = Matter.Composite.allBodies(this.simulation.engine.world);
      // Query.point is precise for rigid bodies
      const hit = Matter.Query.point(bodies, pos);
      // Filter out walls? Not necessarily, let's allow sticking to ground (label='ground')
      // Prefer dynamic bodies on top
      return hit.sort((a,b) => (a.isStatic === b.isStatic) ? 0 : a.isStatic ? 1 : -1)[0];
  }

  startDrag(body: Matter.Body, mouse: {x:number, y:number}) {
      this.dragConstraint = Matter.Constraint.create({
          bodyB: body,
          pointB: { x: mouse.x - body.position.x, y: mouse.y - body.position.y },
          pointA: mouse,
          stiffness: 0.5,
          damping: 0.1,
          render: { visible: false } // We draw custom mouse cursor/line
      });
      Matter.Composite.add(this.simulation.engine.world, this.dragConstraint);
  }

  createSpring(bodyA: Matter.Body, bodyB: Matter.Body) {
      const len = Matter.Vector.magnitude(Matter.Vector.sub(bodyA.position, bodyB.position));
      const spring = Matter.Constraint.create({
          bodyA: bodyA,
          bodyB: bodyB,
          length: len,
          stiffness: this.controls.springStiffness,
          damping: this.controls.springDamping,
          render: { strokeStyle: '#eebb44', lineWidth: 4, type: 'spring' }
      });
      Matter.Composite.add(this.simulation.engine.world, spring);
      
      // visual pop
      this.simulation.particleSystem.spawn(bodyA.position.x, bodyA.position.y, 3);
      this.simulation.particleSystem.spawn(bodyB.position.x, bodyB.position.y, 3);
  }

  spawnShape(x: number, y: number, isProjectile = false) {
      const cfg = this.contextMenu.getConfig();
      let body: Matter.Body;
      const opts: any = {
          restitution: cfg.bounciness,
          friction: 0.5,
          density: isProjectile ? 0.005 : cfg.density,
          render: { 
            fillStyle: isProjectile ? '#ff5555' : this.getRandomColor() 
          }
      };
      
      const s = cfg.size;

      if (cfg.shape === 'box') body = Matter.Bodies.rectangle(x, y, s, s, opts);
      else if (cfg.shape === 'circle') body = Matter.Bodies.circle(x, y, s/2, opts);
      else body = Matter.Bodies.polygon(x, y, 3, s/2, opts);

      if (isProjectile) {
        // Bullet shape tweaks
        body.frictionAir = 0.001; 
      }

      Matter.Composite.add(this.simulation.engine.world, body);
      return body;
  }

  getRandomColor() {
      // Nice pleasing pastel palettes
      return `hsl(${Math.random()*360}, 65%, 60%)`;
  }
}