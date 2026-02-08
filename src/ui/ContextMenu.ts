export class ContextMenu {
    element: HTMLElement;
    
    // Settings
    shape: string = 'box';
    size: number = 50;
    density: number = 0.001;
    bounciness: number = 0.6;
    visible: boolean = false;
  
    constructor() {
      this.element = document.createElement('div');
      this.element.id = 'context-menu';
      document.body.appendChild(this.element);
  
      // Global listener to auto-close
      window.addEventListener('pointerdown', (e) => {
          if (this.visible && !this.element.contains(e.target as Node)) {
              // Tiny hack to let the click interaction pass through to canvas first? 
              // No, standard behavior is close immediately.
              this.hide();
          }
      }, { capture: true }); // Capture ensures we detect clicks outside before they hit canvas logic potentially
  
      this.build();
    }
  
    build() {
        this.element.innerHTML = '';
  
        // --- 1. Shapes Grid ---
        this.addTitle('Select Shape');
        
        const grid = document.createElement('div');
        grid.className = 'shape-grid';
  
        // Shape Options
        this.addShapeBtn(grid, '⬜', 'box');
        this.addShapeBtn(grid, '⚪', 'circle');
        this.addShapeBtn(grid, '🔺', 'triangle');
        this.addShapeBtn(grid, '⬠', 'pentagon');
        this.addShapeBtn(grid, '⬡', 'hexagon');
        this.addShapeBtn(grid, '★', 'star');
  
        this.element.appendChild(grid);
        
        const spacer = document.createElement('div');
        spacer.style.height = '4px';
        this.element.appendChild(spacer);
        this.addDivider();
  
        // --- 2. Sliders ---
        this.addTitle('Properties');
        this.addSlider('Size', 10, 150, 50, (v) => this.size = v);
        this.addSlider('Mass', 0.5, 10, 1, (v) => this.density = v * 0.001);
        this.addSlider('Bounce', 0, 1.2, 0.6, (v) => this.bounciness = v);
    }
  
    addShapeBtn(parent: HTMLElement, icon: string, val: string) {
        const btn = document.createElement('div');
        btn.className = 'shape-btn';
        if (val === this.shape) btn.classList.add('selected');
        btn.textContent = icon;
        btn.onclick = (e) => {
            e.stopPropagation();
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
        inp.step = '0.1';
        inp.value = def.toString();
        
        // Stop prop to allow dragging without closing menu
        inp.onpointerdown = (e) => e.stopPropagation();
        inp.oninput = (e) => cb(parseFloat((e.target as HTMLInputElement).value));
  
        row.appendChild(lbl);
        row.appendChild(inp);
        this.element.appendChild(row);
    }
  
    addTitle(text: string) {
        const d = document.createElement('div');
        d.className = 'section-title';
        d.textContent = text;
        this.element.appendChild(d);
    }
    addDivider() {
        const d = document.createElement('div');
        d.className = 'divider';
        this.element.appendChild(d);
    }
  
    show(x: number, y: number) {
        this.visible = true;
        this.element.style.display = 'flex';
  
        // Bounds checking (Keep inside window)
        const rect = this.element.getBoundingClientRect();
        let left = x; 
        let top = y;
  
        if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 20;
        if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 20;
        
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }
  
    hide() {
        this.visible = false;
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