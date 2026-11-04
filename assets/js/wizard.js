// wizard.js - controla o formulário em etapas
// Autor: Marllon Lorran

// ===== VARIÁVEIS =====
let etapaAtual = 1;   // etapa que está aparecendo
let config = null;    // dados do servicos.json (preços, WhatsApp...)
let total = 0;        // valor calculado no resumo

// ===== CARREGAR O servicos.json =====
// fetch busca o arquivo; .then roda quando ele chega
fetch('assets/data/servicos.json')
    .then(function (resposta) { return resposta.json(); })
    .then(function (dados) { config = dados; });

// ===== MOSTRAR UMA ETAPA =====
function mostrarEtapa(numero) {
    etapaAtual = numero;

    // Esconde todas as etapas e mostra só a do número pedido
    const etapas = document.querySelectorAll('.etapa');
    etapas.forEach(function (etapa) {
        etapa.hidden = etapa.dataset.etapa != numero;
    });

    // Atualiza a barra: etapa 3 de 6 = 50%
    const barra = document.getElementById('barra');
    barra.style.width = (numero / 6 * 100) + '%';
    barra.textContent = 'Etapa ' + numero + ' de 6';

    // Esconde o Voltar na etapa 1 e o Próximo na etapa 6
    document.getElementById('btn-voltar').hidden = numero === 1;
    document.getElementById('btn-proximo').hidden = numero === 6;

    // Limpa a mensagem de erro
    document.getElementById('erro').textContent = '';

    // Na última etapa, monta o resumo
    if (numero === 6) montarResumo();
}

// ===== VALIDAR A ETAPA ATUAL =====
// Retorna uma mensagem de erro, ou '' (vazio) se estiver tudo certo
function validar() {
    if (etapaAtual === 1 && !valorMarcado('tipo')) return 'Escolha o tipo de serviço.';
    if (etapaAtual === 2 && lerItens().length === 0) return 'Coloque a quantidade de pelo menos um item.';
    if (etapaAtual === 3 && valor('imovel') === '') return 'Selecione o tipo de imóvel.';
    if (etapaAtual === 4 && (valor('cep') === '' || valor('rua') === '' || valor('numero') === '' || valor('bairro') === '' || valor('cidade') === '')) {
        return 'Preencha o endereço completo.';
    }
    if (etapaAtual === 5 && (valor('nome') === '' || valor('telefone') === '')) return 'Preencha nome e telefone.';
    return '';
}

// ===== BOTÕES PRÓXIMO E VOLTAR =====
document.getElementById('btn-proximo').addEventListener('click', function () {
    const mensagem = validar();
    if (mensagem !== '') {
        document.getElementById('erro').textContent = mensagem; // mostra o erro e para
        return;
    }
    mostrarEtapa(etapaAtual + 1);
});

document.getElementById('btn-voltar').addEventListener('click', function () {
    mostrarEtapa(etapaAtual - 1);
});

// ===== BUSCAR CEP (usa a função do Fábio) =====
document.getElementById('btn-cep').addEventListener('click', async function () {
    // NOVO: se o cep.js do Fábio ainda não estiver pronto, avisa e para aqui
    if (typeof buscarCep !== 'function') {
        document.getElementById('erro').textContent = 'Busca de CEP ainda não disponível. Preencha o endereço manualmente.';
        return;
    }

    try {
        const endereco = await buscarCep(valor('cep')); // await: espera a resposta da internet
        document.getElementById('rua').value = endereco.rua;
        document.getElementById('bairro').value = endereco.bairro;
        document.getElementById('cidade').value = endereco.cidade;
        document.getElementById('uf').value = endereco.uf;
    } catch (e) {
        // Se der erro (CEP inválido, sem internet...), mostra a mensagem
        document.getElementById('erro').textContent = e.message;
    }
});

// ===== LER OS ITENS ESCOLHIDOS =====
// Devolve só os itens com quantidade maior que 0: [{ id, nome, qtd }]
function lerItens() {
    const itens = [];
    document.querySelectorAll('.item').forEach(function (item) {
        const qtd = Number(item.querySelector('.qtd').value);
        if (qtd > 0) {
            itens.push({ id: item.dataset.id, nome: item.dataset.nome, qtd: qtd });
        }
    });
    return itens;
}

// ===== MONTAR O PEDIDO (formato combinado com Fábio e Luiz) =====
function montarPedido() {
    return {
        tipo: valorMarcado('tipo'),
        itens: lerItens(),
        imovel: valor('imovel'),
        material: valorMarcado('material'),
        urgencia: valorMarcado('urgencia'),
        endereco: {
            cep: valor('cep'), rua: valor('rua'), numero: valor('numero'),
            complemento: valor('complemento'), bairro: valor('bairro'),
            cidade: valor('cidade'), uf: valor('uf')
        },
        contato: {
            nome: valor('nome'), telefone: valor('telefone'),
            horario: valor('horario'), observacoes: valor('observacoes')
        }
    };
}

// ===== RESUMO (usa a função do Luiz) =====
function montarResumo() {
    const pedido = montarPedido();

    // Lista os itens: "3x Tomada"
    let lista = '';
    pedido.itens.forEach(function (item) {
        lista += '<li>' + item.qtd + 'x ' + item.nome + '</li>';
    });

    document.getElementById('resumo').innerHTML =
        '<p><strong>Itens:</strong></p><ul>' + lista + '</ul>' +
        '<p><strong>Endereço:</strong> ' + pedido.endereco.rua + ', ' + pedido.endereco.numero +
        ' - ' + pedido.endereco.bairro + ', ' + pedido.endereco.cidade + '</p>' +
        '<p><strong>Contato:</strong> ' + pedido.contato.nome + ' - ' + pedido.contato.telefone + '</p>';

    // NOVO: se o calculo.js do Luiz ainda não estiver pronto, avisa e para aqui
    if (typeof calcularOrcamento !== 'function') {
        document.getElementById('total').textContent = 'Cálculo ainda não disponível.';
        return;
    }

    // Calcula o valor com a função do Luiz
    const resultado = calcularOrcamento(pedido, config);
    total = resultado.total;
    document.getElementById('total').textContent =
        'Total estimado: ' + total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ===== ENVIAR PELO WHATSAPP (usa a função do Fábio) =====
document.getElementById('btn-enviar').addEventListener('click', function () {
    // NOVO: se o whatsapp.js do Fábio ainda não estiver pronto, avisa e para aqui
    if (typeof gerarLinkWhatsApp !== 'function') {
        document.getElementById('erro').textContent = 'Envio pelo WhatsApp ainda não disponível.';
        return;
    }

    const link = gerarLinkWhatsApp(montarPedido(), total, config.whatsapp);
    window.open(link, '_blank'); // abre o WhatsApp em outra aba
});

// ===== FUNÇÕES DE APOIO =====
// Valor de um campo, sem espaços nas pontas
function valor(id) {
    return document.getElementById(id).value.trim();
}

// Valor do radio marcado em um grupo (ou null se nenhum)
function valorMarcado(nome) {
    const marcado = document.querySelector('input[name="' + nome + '"]:checked');
    return marcado ? marcado.value : null;
}

// ===== COMEÇO: mostra a etapa 1 =====
mostrarEtapa(1);