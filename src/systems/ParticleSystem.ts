import Matter from 'matter-js';

// Simple lightweight particle structure
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class ParticleSystem {
  particles: Particle[] = [];
  world: Matter.World;
  
  constructor(world: Matter.World) {
    this.world = world;
  }

  spawn(x: number, y: number, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)` // Cyan-ish hues
      });
    }
  }

  update() {
    const gravity = this.world.gravity;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      
      // Simple Gravity application
      p.vx += gravity.x * gravity.scale * 2; // exaggerated for visual flair
      p.vy += gravity.y * gravity.scale * 2;

      p.life -= 0.01;
      
      // Screen floor bounce (very simple approx)
      if (p.y > window.innerHeight) {
        p.y = window.innerHeight;
        p.vy *= -0.6;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles = [];
  }
}