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
  
  isDraggingCamera: boolean = false;
  dragStart: { x: number, y: number } = { x: 0, y: 0 };
  camStart: { x: number, y: number } = { x: 0, y: 0 };
  
  dragBody: Matter.Body | null = null;
  constraint: Matter.Constraint | null = null;

  springStartBody: Matter.Body | null = null;
  tempSpring: any = null; // Visual line while dragging

  constructor(sim: Simulation, renderer: Renderer, contextMenu: ContextMenu, controls: Controls) {
    this.simulation = sim;
    this.renderer = renderer;
    this.contextMenu = contextMenu;
    this.controls = controls;
    
    this.setupInputs();
  }

  setupInputs() {
    const cvs = this.renderer.canvas;

    cvs.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Prevent if moving camera
        if (this.isDraggingCamera) return; 
        
        this.contextMenu.show(e.clientX, e.clientY);
    });

    cvs.addEventListener('pointerdown', (e) => this.handleDown(e));
    cvs.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerup', (e) => this.handleUp(e));
  }

  // --- Handlers ---

  handleDown(e: PointerEvent) {
      // Middle Click OR Space+Click = Pan Camera
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
          this.isDraggingCamera = true;
          this.dragStart = { x: e.clientX, y: e.clientY };
          this.camStart = { x: this.renderer.camera.x, y: this.renderer.camera.y };
          return;
      }

      if (e.button !== 0) return; // Only Left Click interaction beyond this

      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
      const bodies = Matter.Query.point(Matter.Composite.allBodies(this.simulation.engine.world), worldPos);
      const clickedBody = bodies.find(b => !b.isStatic); // Prioritize dynamic bodies

      // Tool: Connect (Springs)
      if (this.controls.activeTool === 'connect') {
          if (clickedBody) {
              this.springStartBody = clickedBody;
          }
          return;
      }

      // Default Tool: Drag or Spawn
      if (clickedBody) {
          this.startDragBody(clickedBody, worldPos);
      } else {
          // Check if hitting Background walls? Ignore.
          // Spawn object
          this.spawnFromContext(worldPos.x, worldPos.y);
      }
  }

  handleMove(e: PointerEvent) {
      if (this.isDraggingCamera) {
          const dx = e.clientX - this.dragStart.x;
          const dy = e.clientY - this.dragStart.y;
          this.renderer.camera.x = this.camStart.x + dx;
          this.renderer.camera.y = this.camStart.y + dy;
          return;
      }

      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);

      // Update Body Drag
      if (this.constraint) {
          this.constraint.pointB = worldPos;
      }

      // Update Spring Drag Visual? (Not fully implemented for simplicity, just logic)
  }

  handleUp(e: PointerEvent) {
      if (this.isDraggingCamera) {
          this.isDraggingCamera = false;
          return;
      }

      const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);

      // Spring Connect Finish
      if (this.controls.activeTool === 'connect' && this.springStartBody) {
          const bodies = Matter.Query.point(Matter.Composite.allBodies(this.simulation.engine.world), worldPos);
          const endBody = bodies.find(b => b !== this.springStartBody); // Allow static anchor
          
          if (endBody) {
              const spring = Matter.Constraint.create({
                  bodyA: this.springStartBody,
                  bodyB: endBody,
                  stiffness: 0.05,
                  damping: 0.05,
                  render: { strokeStyle: '#d4ac0d', lineWidth: 2 }
              });
              Matter.Composite.add(this.simulation.engine.world, spring);
          }
          this.springStartBody = null;
      }

      this.stopDragBody();
  }

  // --- Logic Helpers ---

  startDragBody(body: Matter.Body, point: { x: number, y: number }) {
      this.dragBody = body;
      this.constraint = Matter.Constraint.create({
          bodyB: body,
          pointB: { x: 0, y: 0 }, // Center
          pointA: point, // Mouse
          stiffness: 0.5,
          render: { visible: false }
      });
      Matter.Composite.add(this.simulation.engine.world, this.constraint);
      // Hack to set offset relative to body
      // We essentially just reset point B to local offset
      const localPoint = { x: point.x - body.position.x, y: point.y - body.position.y };
      this.constraint.pointB = localPoint;
  }

  stopDragBody() {
      if (this.constraint) {
          Matter.Composite.remove(this.simulation.engine.world, this.constraint);
      }
      this.constraint = null;
      this.dragBody = null;
  }

  spawnFromContext(x: number, y: number) {
      const cfg = this.contextMenu.getConfig();
      
      let body: Matter.Body;
      const opts = {
          restitution: cfg.bounciness,
          friction: 0.5,
          density: cfg.density,
          render: { fillStyle: `hsl(${Math.random()*360}, 60%, 55%)` }
      };

      if (cfg.shape === 'box') {
          body = Matter.Bodies.rectangle(x, y, cfg.size, cfg.size, opts);
      } else if (cfg.shape === 'circle') {
          body = Matter.Bodies.circle(x, y, cfg.size / 2, opts);
      } else {
          body = Matter.Bodies.polygon(x, y, 3, cfg.size / 2, opts);
      }

      Matter.Body.setVelocity(body, { x: (Math.random()-0.5), y: (Math.random()-0.5) });
      Matter.Composite.add(this.simulation.engine.world, body);
  }
}