export class ContextMenu {
    element: HTMLElement;
    
    // Model
    shape: string = 'box';
    size: number = 50;
    density: number = 0.001;
    bounciness: number = 0.6;
    hue: number = 0;
    isStatic: boolean = false;
    visible: boolean = false;
  
    constructor() {
      this.element = document.createElement('div');
      this.element.id = 'context-menu';
      this.element.className = 'panel-glass';
      document.body.appendChild(this.element);
  
      // Prevent closing when interacting with menu
      this.element.addEventListener('pointerdown', (e) => e.stopPropagation());
  
      // Close when clicking strictly outside
      window.addEventListener('pointerdown', () => {
        if(this.visible) this.hide();
      });
  
      this.hue = Math.floor(Math.random() * 360);
      this.build();
    }
  
    build() {
      this.element.innerHTML = '';
  
      // 1. Shapes Grid
      this.addHeader('Spawn Shape');
      const shapeGrid = document.createElement('div');
      shapeGrid.className = 'tool-grid';
      ['box','circle','triangle','pentagon','hexagon','star'].forEach(s => {
         const icons: any = { box:'⬛', circle:'⬤', triangle:'▲', pentagon:'⬠', hexagon:'⬡', star:'★' };
         this.createShapeBtn(shapeGrid, icons[s], s);
      });
      this.element.appendChild(shapeGrid);
  
      // 2. Physics Properties
      this.addHeader('Properties');
      this.addSlider('Size', 10, 300, this.size, 1, (v) => this.size = v);
      this.addSlider('Mass', 0.1, 20, this.density * 1000, 0.1, (v) => this.density = v/1000);
      this.addSlider('Bounce', 0, 1.5, this.bounciness, 0.1, (v) => this.bounciness = v);
  
      // 3. Style & State
      this.addHeader('Style');
      this.addColorSlider();
      this.addToggle('Static (Fixed)', this.isStatic, (v) => this.isStatic = v);
    }
  
    // --- Widgets ---
  
    addHeader(txt: string) {
      const d = document.createElement('div');
      d.className = 'section-header';
      d.textContent = txt;
      this.element.appendChild(d);
    }
  
    createShapeBtn(parent: HTMLElement, icon: string, val: string) {
      const btn = document.createElement('div');
      btn.className = 'shape-btn';
      if(this.shape === val) btn.classList.add('selected');
      btn.textContent = icon;
      btn.onclick = () => {
          this.shape = val;
          Array.from(parent.children).forEach(c => c.classList.remove('selected'));
          btn.classList.add('selected');
      };
      parent.appendChild(btn);
    }
  
    addSlider(label: string, min: number, max: number, def: number, step: number, cb: (v: number) => void) {
      const row = document.createElement('div');
      row.className = 'row';
      const txt = document.createElement('span');
      txt.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = min.toString(); inp.max = max.toString(); inp.step = step.toString();
      inp.value = def.toString();
      inp.oninput = (e) => cb(parseFloat((e.target as any).value));
      
      row.appendChild(txt);
      row.appendChild(inp);
      this.element.appendChild(row);
    }
  
    addColorSlider() {
      const row = document.createElement('div');
      row.className = 'row';
      const txt = document.createElement('span');
      txt.textContent = 'Color';
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.className = 'hue-slider';
      inp.min = '0'; inp.max = '360';
      inp.value = this.hue.toString();
      inp.oninput = (e) => this.hue = parseInt((e.target as any).value);
      
      row.appendChild(txt);
      row.appendChild(inp);
      this.element.appendChild(row);
    }
  
    addToggle(label: string, def: boolean, cb: (v: boolean) => void) {
      const row = document.createElement('label');
      row.className = 'toggle-row';
      
      const txt = document.createElement('span');
      txt.textContent = label;
      
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = def;
      inp.onchange = (e) => cb((e.target as any).checked);
  
      const ind = document.createElement('div');
      ind.className = 'toggle-indicator';
  
      row.appendChild(txt);
      row.appendChild(inp);
      row.appendChild(ind);
      this.element.appendChild(row);
    }
  
    // --- Logic ---
    
    show(x: number, y: number) {
        this.visible = true;
        this.element.style.display = 'flex';
        
        const r = this.element.getBoundingClientRect();
        let left = x;
        let top = y;
        
        // Prevent offscreen
        if(left + r.width > window.innerWidth) left = window.innerWidth - r.width - 10;
        if(top + r.height > window.innerHeight) top = window.innerHeight - r.height - 10;
  
        this.element.style.left = `${Math.max(10, left)}px`;
        this.element.style.top = `${Math.max(10, top)}px`;
    }
  
    hide() {
        this.visible = false;
        this.element.style.display = 'none';
    }
  
    getConfig() {
        return { 
            shape: this.shape, size: this.size, density: this.density,
            bounciness: this.bounciness, hue: this.hue, isStatic: this.isStatic 
        };
    }
  }