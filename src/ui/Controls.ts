import { Simulation } from '../core/Simulation';
import { Interaction } from '../core/Interaction';

export class Controls {
  container: HTMLElement;
  simulation: Simulation;
  interaction?: Interaction; // Late bind
  activeTool: string = 'move';

  // Tool Params
  springStiffness: number = 0.05;
  springDamping: number = 0.05;
  springLengthMult: number = 1.0;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
    this.container = document.createElement('div');
    this.container.id = 'ui-layer';
    document.body.appendChild(this.container);
    this.buildPanel();
  }

  setInteraction(i: Interaction) {
    this.interaction = i;
    this.updateCursor();
  }

  updateCursor() {
    const canvas = document.querySelector('canvas');
    if(canvas) {
      canvas.className = '';
      canvas.classList.add(`tool-${this.activeTool}`);
    }
  }

  buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    // -- Tools --
    const toolTitle = document.createElement('div');
    toolTitle.className = 'section-title';
    toolTitle.textContent = 'Tools';
    panel.appendChild(toolTitle);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '4px';

    this.createToolBtn(btnRow, '✋ Move', 'move', true);
    this.createToolBtn(btnRow, '🔗 Link', 'connect');
    this.createToolBtn(btnRow, '☄️ Shoot', 'shoot');

    panel.appendChild(btnRow);

    // -- Physics Global --
    this.addHeader(panel, 'World Physics');
    this.addSlider(panel, 'Gravity Y', -2, 2, 1, 0.1, (v) => this.simulation.engine.gravity.y = v);
    this.addSlider(panel, 'Time Scale', 0.1, 3.0, 1.0, 0.1, (v) => this.simulation.engine.timing.timeScale = v);

    // -- Spring Settings (Visible only relevant context theoretically, but we keep accessible) --
    this.addHeader(panel, 'Spring Properties');
    this.addSlider(panel, 'Stiffness', 0.001, 0.2, 0.05, 0.001, (v) => this.springStiffness = v);
    this.addSlider(panel, 'Damping', 0, 0.5, 0.05, 0.01, (v) => this.springDamping = v);

    // -- Actions --
    const div = document.createElement('div');
    div.style.marginTop = '8px';
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Reset World';
    clearBtn.style.width = '100%';
    clearBtn.onclick = () => this.simulation.clear();
    div.appendChild(clearBtn);
    panel.appendChild(div);

    this.container.appendChild(panel);
  }

  createToolBtn(parent: HTMLElement, text: string, name: string, active = false) {
      const btn = document.createElement('button');
      btn.textContent = text;
      
      if (active) {
          btn.classList.add('active');
          this.activeTool = name;
      }

      btn.onclick = () => {
          // Visual toggle
          Array.from(parent.children).forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          this.activeTool = name;
          this.updateCursor();
      };

      parent.appendChild(btn);
  }

  addHeader(parent: HTMLElement, text: string) {
    const h = document.createElement('div');
    h.className = 'section-title';
    h.textContent = text;
    parent.appendChild(h);
  }

  addSlider(p: HTMLElement, lbl: string, min: number, max: number, def: number, step: number, cb: (v: number)=>void) {
      const r = document.createElement('div');
      r.className = 'control-row';
      const label = document.createElement('label');
      label.textContent = lbl;
      const i = document.createElement('input');
      i.type='range'; i.min=min+''; i.max=max+''; i.step=step+''; i.value=def+'';
      i.oninput = (e) => cb(parseFloat((e.target as any).value));
      r.appendChild(label); r.appendChild(i);
      p.appendChild(r);
  }
}