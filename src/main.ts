import './style.css';
import { Simulation } from './core/Simulation';
import { Renderer } from './core/Renderer';
import { Interaction } from './core/Interaction';
import { Controls } from './ui/Controls';
import { ContextMenu } from './ui/ContextMenu';

const simulation = new Simulation();
const renderer = new Renderer(simulation);
const controls = new Controls(simulation);
const contextMenu = new ContextMenu();
new Interaction(simulation, renderer, contextMenu, controls);

console.log('Kinet Sandbox 2.0 Loaded');