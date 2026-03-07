import './style.css'

const app = document.querySelector<HTMLElement>('#app');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');

// Menu Mobile Toggle
openSidebarBtn?.addEventListener('click', () => {
    sidebar?.classList.remove('-translate-x-full');
});
closeSidebarBtn?.addEventListener('click', () => {
    sidebar?.classList.add('-translate-x-full');
});

// Render Views function
const renderDashboard = () => {
    if (!app) return;
    app.innerHTML = `
    <header class="mb-8 mt-4">
      <h1 class="text-3xl sm:text-4xl font-display font-bold text-white mb-2">Painel de Controle</h1>
      <p class="text-muted">Monitoramento em tempo real do controle de ponto facial</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
      
      <!-- Card: Prestadores -->
      <div class="glass-card p-6 flex justify-between items-center group">
        <div>
          <p class="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Prestadores</p>
          <p class="text-4xl font-display font-bold text-primary mb-1">3</p>
          <p class="text-sm text-muted">3 ativos</p>
        </div>
        <div class="w-12 h-12 rounded-lg bg-surface border border-white/5 flex items-center justify-center group-hover:border-primary/50 transition-colors">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
      </div>

      <!-- Card: Ativos Agora -->
      <div class="glass-card p-6 flex justify-between items-center group">
        <div>
          <p class="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Ativos Agora</p>
          <p class="text-4xl font-display font-bold text-success mb-1">0</p>
          <p class="text-sm text-muted">em turno</p>
        </div>
        <div class="w-12 h-12 rounded-lg bg-surface border border-white/5 flex items-center justify-center group-hover:border-success/50 transition-colors">
          <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>

      <!-- Card: Registros Hoje -->
      <div class="glass-card p-6 flex justify-between items-center group">
        <div>
          <p class="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Registros Hoje</p>
          <p class="text-4xl font-display font-bold text-[#f59e0b] mb-1">0</p>
          <p class="text-sm text-muted">0 concluídos</p>
        </div>
        <div class="w-12 h-12 rounded-lg bg-surface border border-white/5 flex items-center justify-center group-hover:border-[#f59e0b]/50 transition-colors">
          <svg class="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>

      <!-- Card: Horas Hoje -->
      <div class="glass-card p-6 flex justify-between items-center group">
        <div>
          <p class="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Horas Hoje</p>
          <p class="text-4xl font-display font-bold text-danger mb-1">0.0h</p>
          <p class="text-sm text-muted">total acumulado</p>
        </div>
        <div class="w-12 h-12 rounded-lg bg-surface border border-white/5 flex items-center justify-center group-hover:border-danger/50 transition-colors">
          <svg class="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
      </div>

      <!-- Card: Quiosques -->
      <div class="glass-card p-6 flex justify-between items-center group md:col-span-2 lg:col-span-1">
        <div>
          <p class="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Quiosques</p>
          <p class="text-4xl font-display font-bold text-danger mb-1">0/8</p>
          <p class="text-sm text-muted">nenhum online</p>
        </div>
        <div class="w-12 h-12 rounded-lg bg-surface border border-white/5 flex items-center justify-center group-hover:border-danger/50 transition-colors">
          <svg class="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
      </div>

    </div>

    <!-- Notificações -->
    <div class="glass-panel p-1 rounded-xl">
      <div class="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors border-b border-transparent">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span class="font-medium text-white">Notificações</span>
        </div>
        <span class="text-sm text-muted">Nenhum alerta no momento</span>
      </div>
      <div class="p-8 flex flex-col items-center justify-center text-center opacity-70 border-t border-white/5">
        <div class="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </div>
        <p class="text-white font-medium mb-1">Tudo em ordem</p>
        <p class="text-sm text-muted">Alertas de atraso, turnos e saídas aparecem aqui automaticamente</p>
      </div>
    </div>
  `;
};

const renderPonto = () => {
    if (!app) return;
    app.innerHTML = `
    <header class="mb-4 mt-4 flex justify-between items-center flex-wrap gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl font-display font-bold text-white mb-2">Ponto Eletrônico</h1>
        <p class="text-muted">Reconhecimento facial em tempo real via webcam</p>
      </div>
      <button class="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 text-primary rounded-lg transition-colors font-medium flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
        Modo Quiosque
      </button>
    </header>

    <div class="glass-panel p-2 flex flex-col h-[70vh] min-h-[500px] relative mt-6">
      <!-- Camera Mockup Overlay -->
      <div class="flex-grow bg-black rounded-t-lg relative flex flex-col items-center justify-center overflow-hidden border border-white/5">
        <!-- Target Brackets -->
        <div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white"></div>
        <div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white"></div>
        <div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white"></div>
        <div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white"></div>
        
        <div class="absolute top-4 right-6 text-primary font-mono text-sm">13:59:22</div>
        
        <div class="flex flex-col items-center">
           <svg class="w-12 h-12 text-primary animate-spin mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
           <p class="font-mono text-muted">Carregando modelo de reconhecimento...</p>
        </div>
        
        <div class="absolute bottom-6 font-mono text-xs text-muted flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-muted/50"></span> Carregando modelo de reconhecimento...
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-4 p-4 bg-surface rounded-b-lg border border-transparent border-t-white/5 mt-auto">
        <button class="bg-success/20 hover:bg-success/30 text-success border border-success/30 py-4 font-display font-semibold text-lg sm:text-xl rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          Registrar Entrada
        </button>
        <button class="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-4 font-display font-semibold text-lg sm:text-xl rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Registrar Saída
        </button>
      </div>
    </div>
  `;
};

const renderPrestadores = () => {
    if (!app) return;
    app.innerHTML = `
      <header class="mb-8 mt-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 class="text-3xl sm:text-4xl font-display font-bold text-white mb-2">Prestadores de Serviço</h1>
          <p class="text-muted">Cadastre prestadores com 4 capturas faciais para máxima precisão</p>
        </div>
        <button class="px-5 py-2.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 font-semibold rounded-lg shadow-[0_0_15px_theme('colors.primary.glow')] transition-all flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Novo Prestador
        </button>
      </header>
  
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  
        <!-- Card: Prestador Fake 1 -->
        <div class="glass-card p-6 flex flex-col h-full bg-[#111827]">
          <div class="flex justify-between items-start mb-4">
            <div class="flex gap-4">
              <div class="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 bg-surface">
                 <img src="https://ui-avatars.com/api/?name=Cirlene&background=71717a&color=fff&size=100" alt="Avatar Cirlene" class="w-full h-full object-cover">
              </div>
              <div>
                <h3 class="text-xl font-bold text-white font-display">Cirlene</h3>
                <p class="text-sm text-muted">Tecnica</p>
                <p class="text-xs font-mono text-muted mt-1">CPF: <span class="text-white/70">57035482415</span> <span class="ml-2">IBAV</span></p>
              </div>
            </div>
            <span class="text-xs font-bold text-success font-mono">Ativo</span>
          </div>
  
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 font-mono">
               <div class="w-1.5 h-1.5 rounded-full bg-primary"></div> Manhã (08:00–12:00)
            </span>
            <span class="px-2 py-1 text-xs rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1 font-mono">
               <div class="w-1.5 h-1.5 rounded-full bg-success"></div> Tarde (13:30–18:00)
            </span>
            <span class="px-2 py-1 text-xs rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 font-medium font-mono">Duplo turno</span>
          </div>
  
          <p class="text-sm text-primary flex items-center gap-1 mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Face registrada (4 posições)
          </p>
  
          <div class="flex justify-end gap-6 mt-auto pt-4 border-t border-white/5">
            <button class="text-sm font-medium text-success hover:text-success/80 flex items-center gap-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              Desativar
            </button>
            <button class="text-sm font-medium text-danger hover:text-danger/80 flex items-center gap-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Excluir
            </button>
          </div>
        </div>

        <!-- Card: Prestador Fake 2 -->
        <div class="glass-card p-6 flex flex-col h-full bg-[#111827]">
          <div class="flex justify-between items-start mb-4">
            <div class="flex gap-4">
              <div class="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/10 bg-surface">
                 <img src="https://ui-avatars.com/api/?name=Amanda&background=71717a&color=fff&size=100" alt="Avatar Amanda" class="w-full h-full object-cover">
              </div>
              <div>
                <h3 class="text-xl font-bold text-white font-display">Amanda</h3>
                <p class="text-sm text-muted">operadora</p>
                <p class="text-xs font-mono text-muted mt-1">CPF: <span class="text-white/70">04733955170</span> <span class="ml-2">IBAV</span></p>
              </div>
            </div>
            <span class="text-xs font-bold text-success font-mono">Ativo</span>
          </div>
  
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 font-mono">
               <div class="w-1.5 h-1.5 rounded-full bg-primary"></div> Manhã (08:00–12:00)
            </span>
            <span class="px-2 py-1 text-xs rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1 font-mono">
               <div class="w-1.5 h-1.5 rounded-full bg-success"></div> Tarde (13:30–18:00)
            </span>
            <span class="px-2 py-1 text-xs rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 font-medium font-mono">Duplo turno</span>
          </div>
  
          <p class="text-sm text-primary flex items-center gap-1 mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Face registrada (4 posições)
          </p>
  
          <div class="flex justify-end gap-6 mt-auto pt-4 border-t border-white/5">
            <button class="text-sm font-medium text-success hover:text-success/80 flex items-center gap-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              Desativar
            </button>
            <button class="text-sm font-medium text-danger hover:text-danger/80 flex items-center gap-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Excluir
            </button>
          </div>
        </div>
  
      </div>
    `;
};

// Navegação simples fake
const setActiveMenu = (id: string) => {
    document.querySelectorAll('nav a').forEach(el => {
        el.classList.remove('bg-white/5', 'text-white', 'border-primary/20');
        el.classList.add('text-muted', 'border-transparent');

        // reset icons color
        const svg = el.querySelector('svg');
        if (svg) svg.classList.remove('text-primary');
    });

    const active = document.getElementById(id);
    if (active) {
        active.classList.remove('text-muted', 'border-transparent');
        active.classList.add('bg-white/5', 'text-white', 'border-primary/20');

        const svg = active.querySelector('svg');
        if (svg) svg.classList.add('text-primary');
    }
};

document.getElementById('nav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu('nav-dashboard');
    renderDashboard();
    if (window.innerWidth < 768) sidebar?.classList.add('-translate-x-full');
});
document.getElementById('nav-ponto')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu('nav-ponto');
    renderPonto();
    if (window.innerWidth < 768) sidebar?.classList.add('-translate-x-full');
});
document.getElementById('nav-prestadores')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu('nav-prestadores');
    renderPrestadores();
    if (window.innerWidth < 768) sidebar?.classList.add('-translate-x-full');
});

// Inicialização
renderDashboard();
