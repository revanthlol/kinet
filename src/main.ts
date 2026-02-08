import './style.css';
import { Simulation } from './core/Simulation';
import { Renderer } from './core/Renderer';
import { Interaction } from './core/Interaction';
import { Controls } from './ui/Controls';
import { ContextMenu } from './ui/ContextMenu';

const simulation = new Simulation();
const controls = new Controls(simulation); // Create UI first
const renderer = new Renderer(simulation);
const contextMenu = new ContextMenu();

const interaction = new Interaction(simulation, renderer, contextMenu, controls);
controls.setInteraction(interaction);
renderer.setInteraction(interaction);

console.log('Kinet V3: Robust Spring Tool & Customization Ready');