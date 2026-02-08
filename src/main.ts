import './style.css';
import { Simulation } from './core/Simulation';
import { Renderer } from './core/Renderer';
import { Interaction } from './core/Interaction';
import { Controls } from './ui/Controls';

// Initialize core components
const simulation = new Simulation();
const renderer = new Renderer(simulation);
const controls = new Controls(simulation);

// Hook up interactions using the renderer's canvas
new Interaction(simulation, renderer.canvas);

// Log startup
console.log('Kinet Sandbox Initialized');