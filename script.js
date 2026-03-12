let comprovantes = [];
let autoNotificationInterval = null;
let autoNotificationTimeout = null;
let manualNotificationInterval = null;
let deferredPrompt = null;
let notificacoesEnviadas = 0;
let notificacoesTotal = 0;
let notificacoesEnviadasManual = 0;
let notificacoesTotalManual = 0;
let notificacoesEnviadasEmpresa = 0;
let notificacoesTotalEmpresa = 0;

const form = document.getElementById('comprovanteForm');
const empresaForm = document.getElementById('empresaForm');
const notificationArea = document.getElementById('notificationArea');
const comprovantesList = document.getElementById('comprovantesList');
const enableNotificationsBtn = document.getElementById('enableNotifications');
const installAppBtn = document.getElementById('installApp');
const startAutoBtn = document.getElementById('startAuto');
const stopAutoBtn = document.getElementById('stopAuto');
const stopManualBtn = document.getElementById('stopManual');
const stopEmpresaBtn = document.getElementById('stopEmpresa');
const quantidadeInput = document.getElementById('quantidadeNotif');
const intervaloInput = document.getElementById('intervaloSegundos');
const duracaoInput = document.getElementById('duracaoMinutos');
const valorAutoInput = document.getElementById('valorAuto');
const statusNotif = document.getElementById('statusNotif');
const statusManual = document.getElementById('statusManual');
const statusEmpresa = document.getElementById('statusEmpresa');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const valor = parseFloat(document.getElementById('valorManual').value);
    const quantidade = parseInt(document.getElementById('quantidadeManual').value);
    const nomeEscolhido = document.getElementById('nomeManual').value.trim();
    
    if (Notification.permission !== 'granted') {
        alert('Ative as notificações primeiro!');
        return;
    }
    
    if (quantidade < 1) {
        alert('Configure valores válidos!');
        return;
    }
    
    notificacoesEnviadasManual = 0;
    notificacoesTotalManual = quantidade;
    
    stopManualBtn.style.display = 'block';
    statusManual.style.display = 'block';
    
    // Desabilitar inputs
    document.getElementById('valorManual').disabled = true;
    document.getElementById('nomeManual').disabled = true;
    document.getElementById('quantidadeManual').disabled = true;
    form.querySelector('button[type="submit"]').disabled = true;
    
    atualizarStatusManual();
    
    // Enviar todas as notificações imediatamente
    for (let i = 0; i < quantidade; i++) {
        setTimeout(() => {
            if (nomeEscolhido) {
                // Se tem nome, usa o nome escolhido
                gerarComprovanteComNome(valor, nomeEscolhido, true);
            } else {
                // Se não tem nome, usa aleatório
                gerarComprovanteComValor(valor, true);
            }
            
            if (notificacoesEnviadasManual >= notificacoesTotalManual) {
                pararNotificacoesManual();
                statusManual.innerHTML = '✅ Todas as notificações foram enviadas!';
                setTimeout(() => {
                    statusManual.style.display = 'none';
                }, 3000);
            }
        }, i * 100); // Pequeno delay entre cada uma
    }
});

stopManualBtn.addEventListener('click', () => {
    pararNotificacoesManual();
});

function pararNotificacoesManual() {
    stopManualBtn.style.display = 'none';
    document.getElementById('valorManual').disabled = false;
    document.getElementById('nomeManual').disabled = false;
    document.getElementById('quantidadeManual').disabled = false;
    form.querySelector('button[type="submit"]').disabled = false;
    notificacoesEnviadasManual = 0;
    notificacoesTotalManual = 0;
}

function atualizarStatusManual() {
    if (notificacoesTotalManual > 0) {
        statusManual.innerHTML = `📊 Enviadas: ${notificacoesEnviadasManual} de ${notificacoesTotalManual}`;
    }
}

function mostrarNotificacao(comprovante) {
    const emptyState = notificationArea.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <h3>💜 Nubank</h3>
        <p><strong>${comprovante.titulo}</strong></p>
        <p>${comprovante.tipo} ${comprovante.destinatario} ${comprovante.sufixo || ''}</p>
    `;
    
    notificationArea.insertBefore(notification, notificationArea.firstChild);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function atualizarLista() {
    if (comprovantes.length === 0) {
        comprovantesList.innerHTML = '<p class="empty-state">Nenhum comprovante ainda</p>';
        return;
    }
    
    comprovantesList.innerHTML = comprovantes.map(comp => `
        <div class="comprovante-item">
            <h3>${comp.titulo}</h3>
            <p>${comp.tipo || 'De'}: ${comp.destinatario}</p>
            <p>${comp.sufixo || ''}</p>
            <p class="timestamp">📅 ${comp.timestamp}</p>
        </div>
    `).join('');
}

atualizarLista();

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registrado'))
        .catch(err => console.log('Erro no Service Worker:', err));
}

// Capturar evento de instalação do PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installAppBtn.style.display = 'block';
});

// Botão de instalar app
installAppBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        installAppBtn.style.display = 'none';
    }
    deferredPrompt = null;
});

// Ativar notificações
enableNotificationsBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
        alert('Seu navegador não suporta notificações');
        return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
        enableNotificationsBtn.textContent = '✅ Notificações Ativadas';
        enableNotificationsBtn.disabled = true;
        
        // Notificação de teste com visual Nubank
        enviarNotificacaoNubank('Notificações ativadas', 'Você receberá alertas de transferências');
    } else {
        alert('Permissão negada. Ative nas configurações do navegador.');
    }
});

// Notificações automáticas
startAutoBtn.addEventListener('click', () => {
    const quantidade = parseInt(quantidadeInput.value);
    const intervaloSegundos = parseInt(intervaloInput.value);
    const duracaoMinutos = parseInt(duracaoInput.value);
    const valorAuto = parseFloat(valorAutoInput.value);
    
    if (Notification.permission !== 'granted') {
        alert('Ative as notificações primeiro!');
        return;
    }
    
    if (quantidade < 1 || intervaloSegundos < 1 || duracaoMinutos < 1) {
        alert('Configure valores válidos!');
        return;
    }
    
    // Calcular intervalo em milissegundos
    const intervaloMs = intervaloSegundos * 1000;
    const duracaoMs = duracaoMinutos * 60 * 1000;
    
    notificacoesEnviadas = 0;
    notificacoesTotal = quantidade;
    
    startAutoBtn.style.display = 'none';
    stopAutoBtn.style.display = 'block';
    quantidadeInput.disabled = true;
    intervaloInput.disabled = true;
    duracaoInput.disabled = true;
    valorAutoInput.disabled = true;
    statusNotif.style.display = 'block';
    
    atualizarStatus();
    
    // Enviar primeira notificação imediatamente
    gerarComprovanteComValor(valorAuto);
    
    // Configurar intervalo entre notificações
    autoNotificationInterval = setInterval(() => {
        if (notificacoesEnviadas >= notificacoesTotal) {
            return;
        }
        gerarComprovanteComValor(valorAuto);
    }, intervaloMs);
    
    // Parar automaticamente após a duração configurada
    autoNotificationTimeout = setTimeout(() => {
        pararNotificacoes();
        statusNotif.innerHTML = '✅ Tempo finalizado!';
        setTimeout(() => {
            statusNotif.style.display = 'none';
        }, 3000);
    }, duracaoMs);
});

stopAutoBtn.addEventListener('click', () => {
    pararNotificacoes();
});

function pararNotificacoes() {
    clearInterval(autoNotificationInterval);
    clearTimeout(autoNotificationTimeout);
    startAutoBtn.style.display = 'block';
    stopAutoBtn.style.display = 'none';
    quantidadeInput.disabled = false;
    intervaloInput.disabled = false;
    duracaoInput.disabled = false;
    valorAutoInput.disabled = false;
    notificacoesEnviadas = 0;
    notificacoesTotal = 0;
}

function atualizarStatus() {
    if (notificacoesTotal > 0) {
        statusNotif.innerHTML = `📊 Enviadas: ${notificacoesEnviadas} de ${notificacoesTotal}`;
    }
}

function gerarComprovanteComNome(valor, nome, isManual = false, isEmpresa = false) {
    const mensagens = [
        {
            titulo: `Você recebeu R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
            tipo: 'O valor que',
            sufixo: 'te transferiu via Pix já está rendendo.'
        }
    ];
    
    const mensagemEscolhida = mensagens[0];
    
    const comprovante = {
        id: Date.now() + Math.random(), // Adiciona random para IDs únicos
        titulo: mensagemEscolhida.titulo,
        tipo: mensagemEscolhida.tipo,
        sufixo: mensagemEscolhida.sufixo,
        valor: parseFloat(valor).toFixed(2),
        destinatario: nome,
        timestamp: new Date().toLocaleString('pt-BR')
    };
    
    comprovantes.unshift(comprovante);
    mostrarNotificacao(comprovante);
    atualizarLista();
    
    // Enviar notificação REAL do sistema com visual Nubank
    enviarNotificacaoNubank(
        comprovante.titulo,
        `${comprovante.tipo} ${comprovante.destinatario} ${comprovante.sufixo}`
    );
    
    if (isManual) {
        notificacoesEnviadasManual++;
        atualizarStatusManual();
    } else if (isEmpresa) {
        notificacoesEnviadasEmpresa++;
        atualizarStatusEmpresa();
    } else {
        notificacoesEnviadas++;
        atualizarStatus();
    }
}

function gerarComprovanteComValor(valor, isManual = false) {
    const mensagens = [
        {
            titulo: `Você recebeu R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
            tipo: 'O valor que',
            sufixo: 'te transferiu via Pix já está rendendo.',
            remetentes: gerarNomesAleatorios(20)
        }
    ];
    
    const mensagemEscolhida = mensagens[0];
    const remetente = mensagemEscolhida.remetentes[Math.floor(Math.random() * mensagemEscolhida.remetentes.length)];
    
    const comprovante = {
        id: Date.now(),
        titulo: mensagemEscolhida.titulo,
        tipo: mensagemEscolhida.tipo,
        sufixo: mensagemEscolhida.sufixo,
        valor: parseFloat(valor).toFixed(2),
        destinatario: remetente,
        timestamp: new Date().toLocaleString('pt-BR')
    };
    
    comprovantes.unshift(comprovante);
    mostrarNotificacao(comprovante);
    atualizarLista();
    
    // Enviar notificação REAL do sistema com visual Nubank
    enviarNotificacaoNubank(
        comprovante.titulo,
        `${comprovante.tipo} ${comprovante.destinatario} ${comprovante.sufixo}`
    );
    
    if (isManual) {
        notificacoesEnviadasManual++;
        atualizarStatusManual();
    } else {
        notificacoesEnviadas++;
        atualizarStatus();
    }
}

function gerarNomesAleatorios(quantidade) {
    const primeiroNomes = [
        'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Lucas', 'Beatriz',
        'Rafael', 'Camila', 'Thiago', 'Patricia', 'Bruno', 'Amanda', 'Marcos', 'Larissa',
        'Felipe', 'Gabriela', 'Diego', 'Vanessa', 'Rodrigo', 'Tatiana', 'André', 'Carla',
        'Paulo', 'Renata', 'Gustavo', 'Mariana', 'Leonardo', 'Isabela', 'Fernando', 'Leticia',
        'Ricardo', 'Fernanda', 'Vinicius', 'Bruna', 'Marcelo', 'Aline', 'Fabio', 'Priscila',
        'Daniel', 'Natalia', 'Leandro', 'Daniela', 'Guilherme', 'Carolina', 'Henrique', 'Bianca',
        'Matheus', 'Jéssica', 'Alexandre', 'Raquel', 'Renan', 'Viviane', 'Igor', 'Adriana',
        'Caio', 'Luciana', 'Murilo', 'Simone', 'Vitor', 'Elaine', 'Eduardo', 'Cristina'
    ];
    
    const nomesDoMeio = [
        'dos Santos', 'da Silva', 'de Oliveira', 'de Souza', 'da Costa', 'Pereira',
        'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes',
        'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves',
        'Monteiro', 'Mendes', 'Barros', 'Freitas', 'Barbosa', 'Pinto',
        'Moreira', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Cardoso'
    ];
    
    const sobrenomes = [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida',
        'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha',
        'Ribeiro', 'Alves', 'Pereira', 'Monteiro', 'Mendes', 'Barros', 'Freitas', 'Barbosa',
        'Pinto', 'Moreira', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Cardoso', 'Teixeira',
        'Correia', 'Vieira', 'Duarte', 'Nunes', 'Ramos', 'Moura', 'Azevedo', 'Lopes'
    ];
    
    const nomes = [];
    for (let i = 0; i < quantidade; i++) {
        const primeiro = primeiroNomes[Math.floor(Math.random() * primeiroNomes.length)];
        const meioOuNao = Math.random() > 0.4; // 60% de chance de ter nome do meio
        const sobrenomeComposto = Math.random() > 0.6; // 40% de chance de sobrenome composto
        
        let nomeCompleto = primeiro;
        
        if (meioOuNao) {
            const meio = nomesDoMeio[Math.floor(Math.random() * nomesDoMeio.length)];
            nomeCompleto += ' ' + meio;
        }
        
        const sobrenome1 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        nomeCompleto += ' ' + sobrenome1;
        
        if (sobrenomeComposto) {
            const sobrenome2 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
            if (sobrenome2 !== sobrenome1) {
                nomeCompleto += ' ' + sobrenome2;
            }
        }
        
        nomes.push(nomeCompleto);
    }
    
    return nomes;
}

function enviarNotificacaoNubank(titulo, corpo) {
    if (Notification.permission !== 'granted') return;
    
    const options = {
        body: corpo,
        icon: './nubank.png',
        badge: './nubank.png',
        tag: 'nubank-' + Date.now(),
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
        data: {
            url: window.location.href
        },
        image: './nubank.png',
        dir: 'ltr',
        lang: 'pt-BR'
    };
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(titulo, options);
        });
    } else {
        new Notification(titulo, options);
    }
}

// Verificar se já tem permissão
if (Notification.permission === 'granted') {
    enableNotificationsBtn.textContent = '✅ Notificações Ativadas';
    enableNotificationsBtn.disabled = true;
}

// Modo Empresas
empresaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const valor = parseFloat(document.getElementById('valorEmpresa').value);
    const quantidade = parseInt(document.getElementById('quantidadeEmpresa').value);
    const empresaEscolhida = document.getElementById('nomeEmpresa').value.trim();
    
    if (Notification.permission !== 'granted') {
        alert('Ative as notificações primeiro!');
        return;
    }
    
    if (quantidade < 1) {
        alert('Configure valores válidos!');
        return;
    }
    
    notificacoesEnviadasEmpresa = 0;
    notificacoesTotalEmpresa = quantidade;
    
    stopEmpresaBtn.style.display = 'block';
    statusEmpresa.style.display = 'block';
    
    // Desabilitar inputs
    document.getElementById('valorEmpresa').disabled = true;
    document.getElementById('nomeEmpresa').disabled = true;
    document.getElementById('quantidadeEmpresa').disabled = true;
    empresaForm.querySelector('button[type="submit"]').disabled = true;
    
    atualizarStatusEmpresa();
    
    // Enviar todas as notificações imediatamente
    for (let i = 0; i < quantidade; i++) {
        setTimeout(() => {
            if (empresaEscolhida) {
                gerarComprovanteComNome(valor, empresaEscolhida, false, true);
            } else {
                gerarComprovanteEmpresa(valor);
            }
            
            if (notificacoesEnviadasEmpresa >= notificacoesTotalEmpresa) {
                pararNotificacoesEmpresa();
                statusEmpresa.innerHTML = '✅ Todas as notificações foram enviadas!';
                setTimeout(() => {
                    statusEmpresa.style.display = 'none';
                }, 3000);
            }
        }, i * 100);
    }
});

stopEmpresaBtn.addEventListener('click', () => {
    pararNotificacoesEmpresa();
});

function pararNotificacoesEmpresa() {
    stopEmpresaBtn.style.display = 'none';
    document.getElementById('valorEmpresa').disabled = false;
    document.getElementById('nomeEmpresa').disabled = false;
    document.getElementById('quantidadeEmpresa').disabled = false;
    empresaForm.querySelector('button[type="submit"]').disabled = false;
    notificacoesEnviadasEmpresa = 0;
    notificacoesTotalEmpresa = 0;
}

function atualizarStatusEmpresa() {
    if (notificacoesTotalEmpresa > 0) {
        statusEmpresa.innerHTML = `📊 Enviadas: ${notificacoesEnviadasEmpresa} de ${notificacoesTotalEmpresa}`;
    }
}

function gerarNomesEmpresas(quantidade) {
    const prefixos = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Global', 'Master',
        'Super', 'Mega', 'Ultra', 'Max', 'Pro', 'Plus', 'Premium', 'Elite',
        'Star', 'Gold', 'Silver', 'Diamond', 'Royal', 'Imperial', 'Nacional',
        'Brasil', 'Central', 'Norte', 'Sul', 'Leste', 'Oeste', 'União'
    ];
    
    const tipos = [
        'Serviços', 'Comércio', 'Tecnologia', 'Soluções', 'Sistemas', 'Digital',
        'Online', 'Web', 'Net', 'Tech', 'Soft', 'Info', 'Data', 'Cloud',
        'Smart', 'Fast', 'Easy', 'Quick', 'Express', 'Direct', 'Total',
        'Geral', 'Integrada', 'Avançada', 'Moderna', 'Nova', 'Atual'
    ];
    
    const nomes = [];
    for (let i = 0; i < quantidade; i++) {
        const prefixo = prefixos[Math.floor(Math.random() * prefixos.length)];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        nomes.push(`${prefixo} ${tipo} Ltda`);
    }
    return nomes;
}

function gerarComprovanteEmpresa(valor) {
    const empresas = gerarNomesEmpresas(1);
    const empresa = empresas[0];
    
    const mensagens = [
        {
            titulo: `Você recebeu R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
            tipo: 'O valor que',
            sufixo: 'te transferiu via Pix já está rendendo.'
        }
    ];
    
    const mensagemEscolhida = mensagens[0];
    
    const comprovante = {
        id: Date.now() + Math.random(),
        titulo: mensagemEscolhida.titulo,
        tipo: mensagemEscolhida.tipo,
        sufixo: mensagemEscolhida.sufixo,
        valor: parseFloat(valor).toFixed(2),
        destinatario: empresa,
        timestamp: new Date().toLocaleString('pt-BR')
    };
    
    comprovantes.unshift(comprovante);
    mostrarNotificacao(comprovante);
    atualizarLista();
    
    enviarNotificacaoNubank(
        comprovante.titulo,
        `${comprovante.tipo} ${comprovante.destinatario} ${comprovante.sufixo}`
    );
    
    notificacoesEnviadasEmpresa++;
    atualizarStatusEmpresa();
}

// Link do Instagram - funciona em PWA e navegador
document.querySelector('.instagram-link').addEventListener('click', function(e) {
    const instagramUrl = 'https://www.instagram.com/guhhh_44?igsh=d3FzMmRkbDM3eTRo&utm_source=qr';
    const instagramApp = 'instagram://user?username=guhhh_44';
    
    // Tenta abrir o app do Instagram primeiro
    window.location.href = instagramApp;
    
    // Se não conseguir abrir o app em 1 segundo, abre no navegador
    setTimeout(() => {
        window.open(instagramUrl, '_blank');
    }, 1000);
    
    e.preventDefault();
});

// Modal de boas-vindas - aparece sempre
window.addEventListener('DOMContentLoaded', function() {
    const welcomeModal = document.getElementById('welcomeModal');
    const followButton = document.getElementById('followButton');
    
    // Sempre mostrar modal ao abrir o app
    welcomeModal.classList.remove('hidden');
    console.log('Mostrando modal');
    
    // Quando clicar no botão
    followButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Fechar modal
        welcomeModal.classList.add('hidden');
        
        // Abrir Instagram
        const instagramUrl = 'https://www.instagram.com/guhhh_44?igsh=d3FzMmRkbDM3eTRo&utm_source=qr';
        const instagramApp = 'instagram://user?username=guhhh_44';
        
        window.location.href = instagramApp;
        setTimeout(() => {
            window.open(instagramUrl, '_blank');
        }, 1000);
    });
});
