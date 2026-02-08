import { Simulation } from '../core/Simulation';

export class Controls {
  container: HTMLElement;
  simulation: Simulation;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    
    // UI Container overlay
    this.container = document.createElement('div');
    this.container.id = 'ui-layer';
    document.body.appendChild(this.container);

    this.buildPanel();
  }

  buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    // Gravity Control
    this.addSlider(panel, 'Gravity Y', 0, 2, 1, 0.1, (val) => {
      this.simulation.engine.gravity.y = val;
    });
    this.addSlider(panel, 'Gravity X', -1, 1, 0, 0.1, (val) => {
      this.simulation.engine.gravity.x = val;
    });

    // Time Scale
    this.addSlider(panel, 'Time Scale', 0.1, 3.0, 1.0, 0.1, (val) => {
      // Matter.js time scaling trick
      this.simulation.engine.timing.timeScale = val;
    });

    // Reset Button
    const btnRow = document.createElement('div');
    btnRow.className = 'control-row';
    const btn = document.createElement('button');
    btn.textContent = 'Clear World';
    btn.onclick = () => this.simulation.clear();
    btnRow.appendChild(btn);
    panel.appendChild(btnRow);

    this.container.appendChild(panel);
    
    const instruct = document.createElement('div');
    instruct.className = 'control-panel';
    instruct.style.opacity = '0.7';
    instruct.innerHTML = `<span>Tap empty space to spawn.<br>Drag objects to move.</span>`;
    this.container.appendChild(instruct);
  }

  addSlider(parent: HTMLElement, label: string, min: number, max: number, initial: number, step: number, callback: (val: number) => void) {
    const row = document.createElement('div');
    row.className = 'control-row';
    
    const lab = document.createElement('span');
    lab.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = initial.toString();
    
    input.oninput = (e: Event) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      callback(val);
    };

    row.appendChild(lab);
    row.appendChild(input);
    parent.appendChild(row);
  }
}