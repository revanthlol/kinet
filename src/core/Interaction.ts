import Matter from 'matter-js';
import { Simulation } from './Simulation';

export class Interaction {
  simulation: Simulation;
  canvas: HTMLCanvasElement;
  mouseConstraint: Matter.MouseConstraint;

  constructor(simulation: Simulation, canvas: HTMLCanvasElement) {
    this.simulation = simulation;
    this.canvas = canvas;

    // Matter.js Interaction (Dragging)
    const mouse = Matter.Mouse.create(canvas);
    mouse.pixelRatio = window.devicePixelRatio || 1; // High DPI fix
    
    this.mouseConstraint = Matter.MouseConstraint.create(simulation.engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    Matter.Composite.add(simulation.engine.world, this.mouseConstraint);

    // Custom Interaction (Spawning on Click)
    Matter.Events.on(this.mouseConstraint, 'mousedown', (event) => {
      // If we clicked a body, drag (handled by constraint). 
      // If we clicked empty space, spawn an object.
      // event.source is the mouse constraint
      const mousePos = event.mouse.position;
      const bodiesUnderMouse = Matter.Query.point(
        Matter.Composite.allBodies(simulation.engine.world), 
        mousePos
      );

      // Filter out walls/static if needed, but walls usually invisible bounds outside screen for this toy
      const dynamicBodies = bodiesUnderMouse.filter(b => !b.isStatic);

      if (dynamicBodies.length === 0) {
        this.spawnRandomShape(mousePos.x, mousePos.y);
      }
    });

    Matter.Events.on(simulation.engine, 'collisionStart', (event) => {
        // Emit particles on collision for "juice"
        event.pairs.forEach((pair) => {
            const collisionMomentum = pair.collision.depth * 2; // rough proxy for impact
            if (collisionMomentum > 2) {
                const cx = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
                const cy = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
                this.simulation.particleSystem.spawn(cx, cy, 3);
            }
        });
    });
  }

  spawnRandomShape(x: number, y: number) {
    const size = 30 + Math.random() * 20;
    let body;
    const rand = Math.random();

    if (rand < 0.33) {
       body = Matter.Bodies.rectangle(x, y, size, size, {
           restitution: 0.6,
           friction: 0.5
       });
    } else if (rand < 0.66) {
       body = Matter.Bodies.circle(x, y, size / 2, {
           restitution: 0.8,
           friction: 0.5
       });
    } else {
       // Polygon
       body = Matter.Bodies.polygon(x, y, Math.floor(Math.random() * 5 + 3), size / 2, {
           restitution: 0.6
       });
    }

    Matter.Body.setVelocity(body, { 
        x: (Math.random() - 0.5) * 10, 
        y: (Math.random() - 0.5) * 10 
    });

    Matter.Composite.add(this.simulation.engine.world, body);
  }
}