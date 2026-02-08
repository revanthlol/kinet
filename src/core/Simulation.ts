import Matter from 'matter-js';
import { ParticleSystem } from '../systems/ParticleSystem';

export class Simulation {
  public engine: Matter.Engine;
  public runner: Matter.Runner;
  public particleSystem: ParticleSystem;
  
  constructor() {
    this.engine = Matter.Engine.create();
    this.engine.enableSleeping = true;
    this.runner = Matter.Runner.create();
    this.particleSystem = new ParticleSystem(this.engine.world);

    this.createWorld();
  }

  createWorld() {
    Matter.Composite.clear(this.engine.world, false);
    
    // "Infinite" floor: Just a very wide rectangle
    const ground = Matter.Bodies.rectangle(0, 1000, 50000, 200, { 
        isStatic: true,
        friction: 1.0,
        render: { fillStyle: '#222' },
        label: 'ground'
    });

    Matter.Composite.add(this.engine.world, ground);
  }

  update() {
    this.particleSystem.update();
  }

  clear() {
      // Remove all constraints and dynamic bodies, keep ground
      const world = this.engine.world;
      const dynamicBodies = world.bodies.filter(b => b.label !== 'ground');
      Matter.Composite.remove(world, dynamicBodies);
      Matter.Composite.clear(world, true); // Keep static? No, manual filter better.
      // Rebuild constraints array manually
      world.constraints = []; 
      this.particleSystem.clear();
  }
}