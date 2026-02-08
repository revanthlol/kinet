import Matter from 'matter-js';
import { Simulation } from './Simulation';
import { Renderer } from './Renderer';
import { ContextMenu } from '../ui/ContextMenu';
import { Controls } from '../ui/Controls';

export class Interaction {
  // ... (keeping structure identical, focusing on modifications)
  simulation: Simulation;
  renderer: Renderer;
  contextMenu: ContextMenu;
  controls: Controls;

  keys: { [key: string]: boolean } = {};
  camVelocity: { x: number, y: number } = { x: 0, y: 0 };
  
  // States
  isPanDrag: boolean = false;
  panStart: { x: number, y: number } = { x: 0, y: 0 };
  camStart: { x: number, y: number } = { x: 0, y: 0 };
  mousePos: { x: number, y: number } = { x: 0, y: 0 };
  
  dragConstraint: Matter.Constraint | null = null;
  springStartBody: Matter.Body | null = null;
  hoverBody: Matter.Body | null = null;
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
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    cvs.addEventListener('contextmenu', (e) => {
        if (e.ctrlKey) { e.preventDefault(); return; } 
        e.preventDefault();
        this.contextMenu.show(e.clientX, e.clientY);
    });
    cvs.addEventListener('pointerdown', (e) => this.handleDown(e));
    cvs.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerup', (e) => this.handleUp(e));
  }

  update() {
    // Smooth camera inertia
    let ax = 0, ay = 0;
    if (this.keys['w']) ay += 1.5;
    if (this.keys['s']) ay -= 1.5;
    if (this.keys['a']) ax += 1.5;
    if (this.keys['d']) ax -= 1.5;
    
    this.camVelocity.x += ax; this.camVelocity.y += ay;
    this.camVelocity.x *= 0.85; this.camVelocity.y *= 0.85;

    const z = Math.max(0.2, this.renderer.camera.zoom);
    this.renderer.camera.x += this.camVelocity.x / z;
    this.renderer.camera.y += this.camVelocity.y / z;
  }

  handleDown(e: PointerEvent) {
    if (e.button === 1 || (e.ctrlKey && e.button === 2) || e.altKey) {
        this.isPanDrag = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.camStart = { x: this.renderer.camera.x, y: this.renderer.camera.y };
        this.contextMenu.hide();
        return;
    }
    if (e.button !== 0) return;

    const wPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
    const body = this.findBodyAt(wPos);

    if (this.controls.activeTool === 'move') {
        if (body) this.startDrag(body, wPos);
        else this.spawnShape(wPos.x, wPos.y);
    } 
    else if (this.controls.activeTool === 'connect') {
        if (body) this.springStartBody = body;
    } 
    else if (this.controls.activeTool === 'shoot') {
        this.slingshotStart = wPos;
    }
  }

  handleMove(e: PointerEvent) {
    const wPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
    this.mousePos = wPos;

    if (this.isPanDrag) {
        this.renderer.camera.x = this.camStart.x + (e.clientX - this.panStart.x);
        this.renderer.camera.y = this.camStart.y + (e.clientY - this.panStart.y);
        return;
    }
    
    if (this.dragConstraint && this.dragConstraint.bodyB) {
        this.dragConstraint.pointA = wPos;
        Matter.Sleeping.set(this.dragConstraint.bodyB, false);
    }
    
    if (this.controls.activeTool === 'connect' && this.springStartBody) {
        const b = this.findBodyAt(wPos);
        this.hoverBody = (b && b.id !== this.springStartBody.id) ? b : null;
    }
  }

  handleUp(e: PointerEvent) {
      const wPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
      if (this.isPanDrag) { this.isPanDrag = false; return; }
      
      // Cleanup Drag
      if (this.dragConstraint) {
          Matter.Composite.remove(this.simulation.engine.world, this.dragConstraint);
          this.dragConstraint = null;
      }

      // Cleanup Spring
      if (this.controls.activeTool === 'connect' && this.springStartBody && this.hoverBody) {
          this.createSpring(this.springStartBody, this.hoverBody);
      }
      this.springStartBody = null;
      this.hoverBody = null;

      // Cleanup Shoot
      if (this.controls.activeTool === 'shoot' && this.slingshotStart) {
          const dx = this.slingshotStart.x - wPos.x;
          const dy = this.slingshotStart.y - wPos.y;
          // Spawn Bullet
          const body = this.spawnShape(this.slingshotStart.x, this.slingshotStart.y, true);
          const force = 0.002 * body.mass;
          Matter.Body.applyForce(body, body.position, { x: dx*force, y: dy*force });
          this.slingshotStart = null;
      }
  }

  findBodyAt(pos: {x:number, y:number}) {
    const all = Matter.Composite.allBodies(this.simulation.engine.world);
    const hits = Matter.Query.point(all, pos);
    return hits.sort((a,b) => (a.isStatic === b.isStatic) ? 0 : a.isStatic ? 1 : -1)[0];
  }

  startDrag(body: Matter.Body, pos: {x:number,y:number}) {
      this.dragConstraint = Matter.Constraint.create({
          bodyB: body, pointA: pos,
          pointB: { x: pos.x - body.position.x, y: pos.y - body.position.y },
          stiffness: 0.5, damping: 0.1, render: { visible: false }
      });
      Matter.Composite.add(this.simulation.engine.world, this.dragConstraint);
  }

  createSpring(a: Matter.Body, b: Matter.Body) {
      const len = Matter.Vector.magnitude(Matter.Vector.sub(a.position, b.position));
      const s = Matter.Constraint.create({
          bodyA: a, bodyB: b, length: len,
          stiffness: this.controls.springStiffness, 
          damping: this.controls.springDamping,
          render: { strokeStyle: '#facc15', lineWidth: 4 }
      });
      Matter.Composite.add(this.simulation.engine.world, s);
      this.simulation.particleSystem.spawn(b.position.x, b.position.y, 4);
  }

  spawnShape(x: number, y: number, isProj = false) {
      const cfg = this.contextMenu.getConfig();
      const s = cfg.size;
      const opts: any = {
          restitution: cfg.bounciness,
          friction: 0.5,
          density: isProj ? 0.005 : cfg.density,
          render: { fillStyle: isProj ? '#f87171' : this.getRandomColor() },
          // Store spawn time for "pop in" animation in Renderer
          plugin: { spawnTime: Date.now() }
      };

      let body: Matter.Body;
      switch (cfg.shape) {
          case 'circle': body = Matter.Bodies.circle(x, y, s/2, opts); break;
          case 'triangle': body = Matter.Bodies.polygon(x, y, 3, s/2, opts); break;
          case 'pentagon': body = Matter.Bodies.polygon(x, y, 5, s/2, opts); break;
          case 'hexagon': body = Matter.Bodies.polygon(x, y, 6, s/2, opts); break;
          case 'star': 
             // Crude star approximated by low-density complex polygon or chamfering?
             // MatterJS default polygon is regular convex. Let's stick to Septagon for 'Star' slot or simple Box
             // Actually, let's use a Chamfer for a distinct look or just 7-gon.
             body = Matter.Bodies.polygon(x, y, 5, s/2, opts); // Same as Pentagon visually without custom vertex sets, let's use random vertices
             // Just standard pentagon for now to prevent vertex complexity bugs in simple logic
             break;
          case 'box': default: body = Matter.Bodies.rectangle(x, y, s, s, opts); break;
      }
      
      // If star, maybe change color specifically?
      if (cfg.shape === 'star') body.render.fillStyle = '#fde047'; 

      if (isProj) body.frictionAir = 0.005;

      Matter.Composite.add(this.simulation.engine.world, body);
      return body;
  }

  getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 65%)`;
  }
}