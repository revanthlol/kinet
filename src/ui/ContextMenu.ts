export class ContextMenu {
    element: HTMLElement;
    
    // State
    shape: 'box' | 'circle' | 'triangle' = 'box';
    size: number = 50;
    density: number = 0.001; // Standard Matter.js density
    bounciness: number = 0.6;
  
    constructor() {
      this.element = document.createElement('div');
      this.element.id = 'context-menu';
      document.body.appendChild(this.element);
  
      document.addEventListener('click', (e) => {
          // Hide if clicking outside menu
          if (!this.element.contains(e.target as Node)) {
              this.hide();
          }
      });
  
      this.build();
    }
  
    build() {
        // 1. Shapes
        this.addTitle('Shape');
        const grid = document.createElement('div');
        grid.className = 'shape-grid';
        this.addShapeBtn(grid, '⬜', 'box');
        this.addShapeBtn(grid, '⚪', 'circle');
        this.addShapeBtn(grid, '△', 'triangle');
        this.element.appendChild(grid);
  
        this.addDivider();
  
        // 2. Sliders
        this.addTitle('Properties');
        this.addSlider('Size', 10, 150, 50, (v) => this.size = v);
        this.addSlider('Mass', 1, 10, 1, (v) => this.density = v * 0.001); // Multiply for usable density
        this.addSlider('Bounce', 0, 1.2, 0.6, (v) => this.bounciness = v);
    }
  
    addShapeBtn(parent: HTMLElement, icon: string, val: any) {
        const btn = document.createElement('div');
        btn.className = 'shape-btn';
        if (val === this.shape) btn.classList.add('selected');
        btn.textContent = icon;
        btn.onclick = (e) => {
            e.stopPropagation(); // Don't close
            this.shape = val;
            // Visual toggle
            Array.from(parent.children).forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
        };
        parent.appendChild(btn);
    }
  
    addSlider(label: string, min: number, max: number, def: number, cb: (v: number) => void) {
        const row = document.createElement('div');
        row.className = 'control-row';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.min = min.toString();
        inp.max = max.toString();
        inp.step = label === 'Mass' || label === 'Bounce' ? '0.1' : '1';
        inp.value = def.toString();
  
        // Prevent closing menu when dragging slider
        inp.onclick = (e) => e.stopPropagation();
        inp.oninput = (e) => cb(parseFloat((e.target as HTMLInputElement).value));
  
        row.appendChild(lbl);
        row.appendChild(inp);
        this.element.appendChild(row);
    }
  
    addTitle(text: string) {
        const d = document.createElement('div');
        d.className = 'menu-title';
        d.textContent = text;
        this.element.appendChild(d);
    }
    addDivider() {
        const d = document.createElement('div');
        d.className = 'divider';
        this.element.appendChild(d);
    }
  
    show(x: number, y: number) {
      // Keep it on screen
      const rect = this.element.getBoundingClientRect();
      // (Calculation omitted for brevity, basic positioning)
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      this.element.style.display = 'flex';
    }
  
    hide() {
      this.element.style.display = 'none';
    }
  
    getConfig() {
        return { 
            shape: this.shape, 
            size: this.size, 
            density: this.density, 
            bounciness: this.bounciness 
        };
    }
  }