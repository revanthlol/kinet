import Matter from 'matter-js';
import { ParticleSystem } from '../systems/ParticleSystem';

export class Simulation {
  public engine: Matter.Engine;
  public runner: Matter.Runner;
  public particleSystem: ParticleSystem;
  
  constructor() {
    // Initialize Matter.js engine
    this.engine = Matter.Engine.create();
    
    // Enable sleeping for performance
    this.engine.enableSleeping = true;
    
    // Create Runner
    this.runner = Matter.Runner.create();
    
    // Init custom particle system
    this.particleSystem = new ParticleSystem(this.engine.world);

    // Initial Walls (will be resized by Renderer)
    this.createBoundaries(window.innerWidth, window.innerHeight);
  }

  createBoundaries(width: number, height: number) {
    Matter.World.clear(this.engine.world, false); // Keep custom bodies
    Matter.Composite.clear(this.engine.world, false); // Clear bodies, keep constraints if needed

    const thick = 100;
    const ground = Matter.Bodies.rectangle(width / 2, height + thick / 2, width, thick, { isStatic: true });
    const ceiling = Matter.Bodies.rectangle(width / 2, -thick / 2, width, thick, { isStatic: true });
    const left = Matter.Bodies.rectangle(-thick / 2, height / 2, thick, height, { isStatic: true });
    const right = Matter.Bodies.rectangle(width + thick / 2, height / 2, thick, height, { isStatic: true });

    Matter.Composite.add(this.engine.world, [ground, ceiling, left, right]);
  }

  update() {
    // Particles update step
    this.particleSystem.update();
  }

  clear() {
    Matter.Composite.clear(this.engine.world, false);
    this.createBoundaries(window.innerWidth, window.innerHeight);
    this.particleSystem.clear();
  }
}