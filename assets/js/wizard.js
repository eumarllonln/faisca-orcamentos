// =====================================================================
// wizard.js - formulário de orçamento em etapas
// ---------------------------------------------------------------------
// Responsável por:
//   1. Carregar os serviços e preços do servicos.json
//   2. Mostrar uma etapa por vez e atualizar a barra de progresso
//   3. Validar cada etapa antes de deixar avançar
//   4. Montar o objeto "pedido" com tudo o que o cliente preencheu
//   5. Chamar as funções dos colegas:
//        - buscarCep(cep)                         -> cep.js (Fábio)
//        - calcularOrcamento(pedido, config)       -> calculo.js (Luiz)
//        - gerarLinkWhatsApp(pedido, total, numero) -> whatsapp.js (Fábio)
//
// Autor: Marllon Lorran
// =====================================================================

// ---------------------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------------------

// Total de etapas do formulário (deve bater com o número de <section class="etapa">)
const TOTAL_ETAPAS = 6;

// Caminho do arquivo de dados (o fetch precisa de servidor: use o Live Server)
const CAMINHO_CONFIG = 'assets/data/servicos.json';

// Textos amigáveis para mostrar no resumo (o "value" do HTML é técnico)
const ROTULOS = {
    tipo: {
        instalacao: 'Instalação',
        manutencao: 'Manutenção ou reparo',
        projeto: 'Projeto ou reforma',
    },
    imovel: {
        casa: 'Casa',
        apartamento: 'Apartamento',
        comercio: 'Comércio',
    },
    material: {
        cliente: 'Por conta do cliente',
        eletricista: 'Por conta do eletricista',
    },
    urgencia: {
        normal: 'Normal',
        emergencia: 'Emergência',
    },
};

// ---------------------------------------------------------------------
// ESTADO
// Variáveis que guardam a situação atual do formulário
// ---------------------------------------------------------------------

let etapaAtual = 1;      // etapa que está aparecendo na tela
let config = null;       // conteúdo do servicos.json depois de carregado
let ultimoCalculo = null; // resultado do calcularOrcamento, usado no envio
const quantidades = {};  // quantidade escolhida de cada serviço: { tomada: 3, chuveiro: 1 }

// ---------------------------------------------------------------------
// ATALHOS PARA ELEMENTOS DA PÁGINA
// ---------------------------------------------------------------------

// Função curta para não repetir document.getElementById toda hora
const $ = (id) => document.getElementById(id);

const etapas = document.querySelectorAll('.etapa'); // todas as <section class="etapa">
const btnVoltar = $('btn-voltar');
const btnProximo = $('btn-proximo');
const btnEnviar = $('btn-enviar');

// =====================================================================
// 1. CARREGAR OS DADOS (servicos.json)
// =====================================================================

// async: a função espera a resposta do fetch sem travar a página
async function carregarConfig() {
    try {
        const resposta = await fetch(CAMINHO_CONFIG);

        // resposta.ok é false para erros como 404 (arquivo não encontrado)
        if (!resposta.ok) {
            throw new Error('Arquivo de serviços não encontrado.');
        }

        config = await resposta.json(); // transforma o texto do arquivo em objeto JS
    } catch (erro) {
        // Cai aqui se o arquivo não existir, se o JSON estiver mal escrito
        // ou se a página foi aberta sem servidor (direto pelo arquivo)
        console.error('Erro ao carregar servicos.json:', erro);
        mostrarAviso('Não foi possível carregar a lista de serviços. Abra o site por um servidor (ex: Live Server) e confira o arquivo servicos.json.');
    }
}

// =====================================================================
// 2. LISTA DE ITENS (etapa 2)
// =====================================================================

// Cria uma linha (nome + campo de quantidade) para cada serviço
function renderizarItens() {
    const lista = $('lista-itens');

    // Sem config, não há o que listar (o aviso de erro já está na tela)
    if (!config || !Array.isArray(config.servicos) || config.servicos.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhum serviço cadastrado ainda.</p>';
        return;
    }

    // Filtra pela categoria escolhida na etapa 1.
    // "Projeto ou reforma" mostra todos, porque envolve vários tipos de serviço.
    const tipo = valorMarcado('tipo');
    let servicos = config.servicos;
    if (tipo && tipo !== 'projeto') {
        const filtrados = servicos.filter((s) => s.categoria === tipo);
        // Se nenhum serviço tiver essa categoria, mostra todos para não ficar vazio
        if (filtrados.length > 0) servicos = filtrados;
    }

    // Monta o HTML de todas as linhas de uma vez (mais rápido que criar uma por uma)
    lista.innerHTML = servicos.map((servico) => {
        const id = servico.id;
        const qtd = quantidades[id] || 0; // mantém o que o cliente já tinha digitado

        return `
            <div class="item d-flex justify-content-between align-items-center border-bottom py-2"
                 data-id="${escaparHtml(id)}" data-nome="${escaparHtml(servico.nome)}">
                <label for="qtd-${escaparHtml(id)}" class="mb-0">${escaparHtml(servico.nome)}</label>
                <input type="number" class="form-control qtd" id="qtd-${escaparHtml(id)}"
                       min="0" max="99" value="${qtd}" style="width: 90px">
            </div>`;
    }).join('');
}

// Guarda a quantidade sempre que o cliente digita.
// "Delegação de evento": um único ouvinte na lista atende todos os campos,
// inclusive os que são criados depois pelo renderizarItens.
$('lista-itens').addEventListener('input', (evento) => {
    if (!evento.target.classList.contains('qtd')) return;

    const id = evento.target.closest('.item').dataset.id;
    // parseInt converte texto em número; || 0 trata campo vazio
    let qtd = parseInt(evento.target.value, 10) || 0;
    // Mantém entre 0 e 99
    qtd = Math.min(Math.max(qtd, 0), 99);

    quantidades[id] = qtd;
});

// =====================================================================
// 3. NAVEGAÇÃO ENTRE ETAPAS
// =====================================================================

// Mostra a etapa "numero" e esconde as outras.
// moverFoco = false na abertura da página, para não pular a tela logo de cara
function mostrarEtapa(numero, moverFoco = true) {
    etapaAtual = numero;

    etapas.forEach((secao) => {
        // dataset.etapa lê o atributo data-etapa (vem como texto, por isso o Number)
        secao.hidden = Number(secao.dataset.etapa) !== numero;
    });

    atualizarProgresso();

    // Botão Voltar some na etapa 1; Próximo some na etapa 6 (lá o botão é o Enviar)
    btnVoltar.hidden = numero === 1;
    btnProximo.hidden = numero === TOTAL_ETAPAS;
    // Na etapa 5, o Próximo leva ao resumo
    btnProximo.textContent = numero === TOTAL_ETAPAS - 1 ? 'Ver resumo' : 'Próximo';

    // Ações específicas ao entrar em certas etapas
    if (numero === 2) renderizarItens();
    if (numero === 6) montarResumo();

    // Leva o foco para o título da etapa (acessibilidade) e sobe a tela até o topo
    if (!moverFoco) return;
    const titulo = document.querySelector(`.etapa[data-etapa="${numero}"] h2`);
    if (titulo) titulo.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Atualiza largura, texto e atributo de acessibilidade da barra
function atualizarProgresso() {
    const porcentagem = (etapaAtual / TOTAL_ETAPAS) * 100;
    const barra = $('barra-progresso');

    barra.style.width = `${porcentagem}%`;
    barra.textContent = `Etapa ${etapaAtual} de ${TOTAL_ETAPAS}`;
    $('progresso').setAttribute('aria-valuenow', etapaAtual);
}

// Botão Próximo: só avança se a etapa atual estiver válida
btnProximo.addEventListener('click', () => {
    if (validarEtapa(etapaAtual)) {
        mostrarEtapa(etapaAtual + 1);
    }
});

// Botão Voltar: volta sem validar (o cliente pode querer corrigir algo)
btnVoltar.addEventListener('click', () => {
    mostrarEtapa(etapaAtual - 1);
});

// =====================================================================
// 4. VALIDAÇÃO
// =====================================================================

// Retorna true se a etapa estiver ok. Se não, mostra os erros e retorna false.
function validarEtapa(numero) {
    limparErros();
    let valido = true;

    // Pequena função interna: registra um erro e marca a etapa como inválida
    const erro = (campo, mensagem) => {
        mostrarErro(campo, mensagem);
        valido = false;
    };

    switch (numero) {
        case 1:
            if (!valorMarcado('tipo')) {
                erro('tipo', 'Escolha o tipo de serviço para continuar.');
            }
            break;

        case 2:
            // Precisa ter pelo menos um item com quantidade maior que zero
            if (lerItens().length === 0) {
                erro('itens', 'Escolha pelo menos um serviço e informe a quantidade.');
            }
            break;

        case 3:
            if (!$('imovel').value) {
                erro('imovel', 'Selecione o tipo de imóvel.');
            }
            break;

        case 4:
            if (somenteNumeros($('cep').value).length !== 8) erro('cep', 'Digite um CEP com 8 números.');
            if (!$('rua').value.trim()) erro('rua', 'Informe a rua.');
            if (!$('numero').value.trim()) erro('numero', 'Informe o número (ou "S/N").');
            if (!$('bairro').value.trim()) erro('bairro', 'Informe o bairro.');
            if (!$('cidade').value.trim()) erro('cidade', 'Informe a cidade.');
            break;

        case 5: {
            // As chaves { } criam um bloco: a variável abaixo só existe dentro deste case
            if ($('nome').value.trim().length < 3) erro('nome', 'Informe seu nome.');
            // Telefone com DDD tem 10 (fixo) ou 11 (celular) números
            const digitosTelefone = somenteNumeros($('telefone').value).length;
            if (digitosTelefone < 10 || digitosTelefone > 11) {
                erro('telefone', 'Informe o telefone com DDD. Ex: (83) 99999-9999');
            }
            break;
        }
    }

    // Leva o foco para o primeiro campo com erro, para o cliente corrigir mais rápido
    if (!valido) {
        const primeiroInvalido = document.querySelector('.is-invalid');
        if (primeiroInvalido) primeiroInvalido.focus();
    }

    return valido;
}

// Escreve a mensagem no <p id="erro-campo"> e marca o campo em vermelho
function mostrarErro(campo, mensagem) {
    const areaErro = $(`erro-${campo}`);
    if (areaErro) areaErro.textContent = mensagem;

    const input = $(campo);
    if (input) {
        input.classList.add('is-invalid');          // borda vermelha do Bootstrap
        input.setAttribute('aria-invalid', 'true'); // leitor de tela entende que tem erro
        input.setAttribute('aria-describedby', `erro-${campo}`); // e lê a mensagem junto
    }
}

// Apaga todas as mensagens e marcações de erro
function limparErros() {
    document.querySelectorAll('[id^="erro-"]').forEach((p) => { p.textContent = ''; });
    document.querySelectorAll('.is-invalid').forEach((input) => {
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
    });
}

// Tira o vermelho do campo assim que o cliente começa a corrigir
document.getElementById('form-orcamento').addEventListener('input', (evento) => {
    if (evento.target.classList.contains('is-invalid')) {
        evento.target.classList.remove('is-invalid');
        evento.target.removeAttribute('aria-invalid');
        const areaErro = $(`erro-${evento.target.id}`);
        if (areaErro) areaErro.textContent = '';
    }
});

// =====================================================================
// 5. CEP (etapa 4) - usa buscarCep() do Fábio
// =====================================================================

const campoCep = $('cep');

// Máscara: enquanto digita, formata como 00000-000
campoCep.addEventListener('input', () => {
    const numeros = somenteNumeros(campoCep.value).slice(0, 8);
    campoCep.value = numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;

    // Busca automaticamente quando completar os 8 números
    if (numeros.length === 8) preencherEndereco(numeros);
});

// Chama a função do Fábio e preenche os campos com o resultado
async function preencherEndereco(cep) {
    const status = $('status-cep');

    // Se o cep.js ainda não foi feito, avisa e deixa o cliente digitar à mão
    if (typeof buscarCep !== 'function') {
        status.className = 'small mt-1 mb-0 text-muted';
        status.textContent = 'Busca automática indisponível. Preencha o endereço manualmente.';
        return;
    }

    status.className = 'small mt-1 mb-0 text-muted';
    status.textContent = 'Buscando endereço...';

    try {
        const endereco = await buscarCep(cep);

        // || '' evita escrever "undefined" se algum campo vier vazio
        $('rua').value = endereco.rua || '';
        $('bairro').value = endereco.bairro || '';
        $('cidade').value = endereco.cidade || '';
        $('uf').value = endereco.uf || '';

        status.className = 'small mt-1 mb-0 text-success';
        status.textContent = 'Endereço encontrado.';

        // Próximo campo que o cliente precisa preencher: o número
        $('numero').focus();
    } catch (erro) {
        // A função do Fábio lança erros com mensagens prontas (CEP inválido, não encontrado...)
        status.className = 'small mt-1 mb-0 text-danger';
        status.textContent = `${erro.message} Você pode preencher o endereço manualmente.`;
    }
}

// =====================================================================
// 6. TELEFONE (etapa 5) - máscara (83) 99999-9999
// =====================================================================

const campoTelefone = $('telefone');

campoTelefone.addEventListener('input', () => {
    const n = somenteNumeros(campoTelefone.value).slice(0, 11);

    // Vai montando a máscara conforme a quantidade de números digitados
    if (n.length <= 2) {
        campoTelefone.value = n.length ? `(${n}` : '';
    } else if (n.length <= 6) {
        campoTelefone.value = `(${n.slice(0, 2)}) ${n.slice(2)}`;
    } else if (n.length <= 10) {
        // Fixo: (83) 3333-3333
        campoTelefone.value = `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    } else {
        // Celular: (83) 99999-9999
        campoTelefone.value = `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    }
});

// =====================================================================
// 7. MONTAR O PEDIDO
// Formato combinado com o Fábio e o Luiz
// =====================================================================

function montarPedido() {
    return {
        tipo: valorMarcado('tipo'),
        itens: lerItens(),
        imovel: $('imovel').value,
        material: valorMarcado('material'),
        urgencia: valorMarcado('urgencia'),
        endereco: {
            cep: somenteNumeros($('cep').value),
            rua: $('rua').value.trim(),
            numero: $('numero').value.trim(),
            complemento: $('complemento').value.trim(),
            bairro: $('bairro').value.trim(),
            cidade: $('cidade').value.trim(),
            uf: $('uf').value.trim().toUpperCase(),
        },
        contato: {
            nome: $('nome').value.trim(),
            telefone: $('telefone').value.trim(),
            horario: $('horario').value,
            observacoes: $('observacoes').value.trim(),
        },
    };
}

// Lista só os serviços com quantidade maior que zero, no formato { id, nome, qtd }
function lerItens() {
    if (!config || !Array.isArray(config.servicos)) return [];

    return config.servicos
        .filter((servico) => (quantidades[servico.id] || 0) > 0)
        .map((servico) => ({
            id: servico.id,
            nome: servico.nome,
            qtd: quantidades[servico.id],
        }));
}

// =====================================================================
// 8. RESUMO (etapa 6) - usa calcularOrcamento() do Luiz
// =====================================================================

function montarResumo() {
    const pedido = montarPedido();
    const e = pedido.endereco;
    const c = pedido.contato;

    // Lista de itens em HTML: "3x Tomada"
    const itensHtml = pedido.itens
        .map((item) => `<li>${item.qtd}x ${escaparHtml(item.nome)}</li>`)
        .join('');

    // Monta o endereço só com as partes preenchidas
    const complemento = e.complemento ? ` (${escaparHtml(e.complemento)})` : '';
    const uf = e.uf ? `/${escaparHtml(e.uf)}` : '';

    // escaparHtml: impede que algo digitado pelo cliente vire HTML na página (segurança)
    $('resumo').innerHTML = `
        <dl class="row mb-0">
            <dt class="col-sm-4">Serviço</dt>
            <dd class="col-sm-8">${ROTULOS.tipo[pedido.tipo] || ''}</dd>

            <dt class="col-sm-4">Itens</dt>
            <dd class="col-sm-8"><ul class="mb-0 ps-3">${itensHtml}</ul></dd>

            <dt class="col-sm-4">Imóvel</dt>
            <dd class="col-sm-8">${ROTULOS.imovel[pedido.imovel] || ''}</dd>

            <dt class="col-sm-4">Material</dt>
            <dd class="col-sm-8">${ROTULOS.material[pedido.material]}</dd>

            <dt class="col-sm-4">Urgência</dt>
            <dd class="col-sm-8">${ROTULOS.urgencia[pedido.urgencia]}</dd>

            <dt class="col-sm-4">Endereço</dt>
            <dd class="col-sm-8">
                ${escaparHtml(e.rua)}, ${escaparHtml(e.numero)}${complemento}<br>
                ${escaparHtml(e.bairro)} – ${escaparHtml(e.cidade)}${uf}
            </dd>

            <dt class="col-sm-4">Contato</dt>
            <dd class="col-sm-8">
                ${escaparHtml(c.nome)} – ${escaparHtml(c.telefone)}<br>
                <span class="text-muted">Melhor horário: ${escaparHtml(c.horario)}</span>
            </dd>

            ${c.observacoes ? `
            <dt class="col-sm-4">Observações</dt>
            <dd class="col-sm-8">${escaparHtml(c.observacoes)}</dd>` : ''}
        </dl>`;

    mostrarValores(pedido);
}

// Calcula e mostra os valores. Se o calculo.js ainda não existir, avisa.
function mostrarValores(pedido) {
    const area = $('resumo-valores');
    ultimoCalculo = null;

    if (typeof calcularOrcamento !== 'function') {
        area.innerHTML = '<p class="mb-0 text-muted">O cálculo do valor ainda não está disponível.</p>';
        return;
    }

    try {
        ultimoCalculo = calcularOrcamento(pedido, config);

        area.innerHTML = `
            <div class="d-flex justify-content-between">
                <span>Serviços</span><span>${formatarReais(ultimoCalculo.subtotal)}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Deslocamento</span><span>${formatarReais(ultimoCalculo.deslocamento)}</span>
            </div>
            <hr class="my-2">
            <div class="d-flex justify-content-between fs-5 fw-bold">
                <span>Total estimado</span><span>${formatarReais(ultimoCalculo.total)}</span>
            </div>
            ${ultimoCalculo.aplicouMinimo
                ? `<p class="small text-muted mb-0 mt-2">Foi aplicado o valor mínimo de visita.</p>`
                : ''}`;
    } catch (erro) {
        console.error('Erro no cálculo:', erro);
        area.innerHTML = '<p class="mb-0 text-danger">Não foi possível calcular o valor. Tente novamente.</p>';
    }
}

// =====================================================================
// 9. ENVIO PELO WHATSAPP - usa gerarLinkWhatsApp() do Fábio
// =====================================================================

btnEnviar.addEventListener('click', () => {
    const areaErro = $('erro-envio');
    areaErro.textContent = '';

    if (typeof gerarLinkWhatsApp !== 'function') {
        areaErro.textContent = 'O envio pelo WhatsApp ainda não está disponível.';
        return;
    }
    if (!config || !config.whatsapp) {
        areaErro.textContent = 'Número de WhatsApp não configurado.';
        return;
    }

    const pedido = montarPedido();
    // Se o cálculo não estiver disponível, envia sem valor (0) e o eletricista calcula
    const total = ultimoCalculo ? ultimoCalculo.total : 0;
    const link = gerarLinkWhatsApp(pedido, total, config.whatsapp);

    // Abre o WhatsApp em outra aba. noopener: a nova aba não tem acesso a esta (segurança)
    window.open(link, '_blank', 'noopener');
});

// =====================================================================
// 10. FUNÇÕES AUXILIARES
// =====================================================================

// Valor do radio marcado em um grupo (ou null se nenhum estiver marcado)
function valorMarcado(nome) {
    const marcado = document.querySelector(`input[name="${nome}"]:checked`);
    return marcado ? marcado.value : null;
}

// Remove tudo que não for número: "58038-000" -> "58038000"
function somenteNumeros(texto) {
    return texto.replace(/\D/g, '');
}

// 146 -> "R$ 146,00"
function formatarReais(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Troca caracteres especiais do HTML para que texto digitado não vire código
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
}

// Mostra a caixa amarela de aviso no topo do formulário
function mostrarAviso(mensagem) {
    const aviso = $('aviso-geral');
    aviso.textContent = mensagem;
    aviso.hidden = false;
}

// =====================================================================
// INÍCIO
// Quando a página abre: carrega os dados e mostra a etapa 1
// =====================================================================

carregarConfig().then(() => mostrarEtapa(1, false));
