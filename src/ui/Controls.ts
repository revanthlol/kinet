import { Simulation } from '../core/Simulation';
import { Interaction } from '../core/Interaction';

export class Controls {
  container: HTMLElement;
  simulation: Simulation;
  interaction?: Interaction;
  activeTool: string = 'move';
  
  springStiffness = 0.05;
  springDamping = 0.05;

  constructor(sim: Simulation) {
    this.simulation = sim;
    this.container = document.createElement('div');
    this.container.id = 'ui-layer';
    document.body.appendChild(this.container);
    this.build();
  }

  setInteraction(i: Interaction) {
    this.interaction = i;
    this.updateCursor();
  }

  updateCursor() {
    const c = document.querySelector('canvas');
    if(!c) return;
    c.className = '';
    c.classList.add(`tool-${this.activeTool}`);
  }

  build() {
    const p = document.createElement('div');
    p.className = 'control-panel panel-glass';

    // 1. Tool Switcher
    this.addHeader(p, 'Tools');
    const toolGrid = document.createElement('div');
    toolGrid.className = 'tool-grid';
    this.addToolBtn(toolGrid, '✋', 'move', true);
    this.addToolBtn(toolGrid, '🔗', 'connect');
    this.addToolBtn(toolGrid, '☄️', 'shoot');
    p.appendChild(toolGrid);

    // 2. World Settings
    this.addHeader(p, 'World Settings');
    this.addSlider(p, 'Gravity', -3, 3, 1, 0.5, v => this.simulation.engine.gravity.y = v);
    this.addSlider(p, 'Speed', 0.1, 3.0, 1.0, 0.1, v => this.simulation.engine.timing.timeScale = v);

    // 3. Actions
    const btnBox = document.createElement('div');
    btnBox.style.marginTop = '12px';
    const rst = document.createElement('button');
    rst.textContent = 'Clear All';
    rst.style.width = '100%';
    rst.onclick = () => this.simulation.clear();
    btnBox.appendChild(rst);
    p.appendChild(btnBox);

    this.container.appendChild(p);
  }

  addHeader(parent: HTMLElement, txt: string) {
    const h = document.createElement('div');
    h.className = 'section-header';
    h.textContent = txt;
    parent.appendChild(h);
  }

  addToolBtn(parent: HTMLElement, label: string, tool: string, def=false) {
      const b = document.createElement('button');
      b.textContent = label;
      if(def) b.classList.add('active');
      b.onclick = () => {
          Array.from(parent.children).forEach(c => c.classList.remove('active'));
          b.classList.add('active');
          this.activeTool = tool;
          this.updateCursor();
      };
      parent.appendChild(b);
  }

  addSlider(parent: HTMLElement, label: string, min: number, max: number, def: number, step: number, cb: (v: number)=>void) {
      const r = document.createElement('div');
      r.className = 'row';
      const t = document.createElement('span');
      t.textContent = label;
      const i = document.createElement('input');
      i.type='range'; i.min=min+''; i.max=max+''; i.step=step+''; i.value=def+'';
      i.oninput = (e) => cb(parseFloat((e.target as any).value));
      r.appendChild(t); r.appendChild(i);
      parent.appendChild(r);
  }
}