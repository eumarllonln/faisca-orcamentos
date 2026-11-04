# ⚡ Faísca Orçamentos

Site de orçamento de serviços elétricos para um eletricista autônomo de **João Pessoa - PB**. O cliente monta o pedido em poucas etapas, vê um valor estimado e envia tudo pronto pelo **WhatsApp**.

> 🚧 Projeto em desenvolvimento.

## ✨ Funcionalidades (v1)

- Landing page com apresentação, serviços e área de atendimento
- Formulário de orçamento em etapas (wizard) com barra de progresso e validação
- Cálculo do valor estimado com base em:
  - mão de obra por item
  - material por conta do cliente ou do eletricista
  - urgência (normal ou emergência)
  - taxa de deslocamento por bairro/cidade
  - valor mínimo de visita
- Preenchimento automático do endereço pelo CEP (API [ViaCEP](https://viacep.com.br))
- Envio do pedido formatado pelo WhatsApp (link `wa.me`)

### Próximas versões

- [ ] Histórico de orçamentos salvo no navegador (`localStorage`)
- [ ] Conteinerização com Docker + Nginx
- [ ] Deploy automático com GitHub Actions

## 🛠️ Tecnologias

- HTML5
- CSS3 + [Bootstrap 5](https://getbootstrap.com)
- JavaScript puro (ES6+)
- [ViaCEP](https://viacep.com.br) para busca de endereço
- WhatsApp Click to Chat (`wa.me`)

## 🎨 Identidade visual

| Cor | Hex | Uso |
|---|---|---|
| Laranja | `#F97316` | destaques e botões |
| Grafite | `#2B2D31` | fundo e textos |
| Cinza claro | `#F4F4F5` | seções |

## 📁 Estrutura

```
faisca-orcamentos/
├── index.html            # landing page
├── orcamento.html        # formulário em etapas
├── assets/
│   ├── css/style.css     # identidade visual sobre o Bootstrap
│   ├── js/
│   │   ├── main.js       # comportamento geral da landing
│   │   ├── wizard.js     # navegação entre etapas e validação
│   │   ├── calculo.js    # regras de preço
│   │   ├── cep.js        # integração com a ViaCEP
│   │   └── whatsapp.js   # monta a mensagem e o link
│   ├── data/
│   │   └── servicos.json # itens, preços e taxas de deslocamento
│   └── img/
├── README.md
└── .gitignore
```

## 🚀 Como rodar

Não precisa instalar nada. Clone o repositório e abra com um servidor local (necessário para carregar o `servicos.json`):

```bash
git clone https://github.com/eumarllonln/faisca-orcamentos.git
cd faisca-orcamentos

# opção 1: extensão Live Server do VS Code
# opção 2: Python
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## 🗺️ Roadmap

- [x] Setup do projeto e estrutura de pastas
- [ ] Landing page
- [ ] Estrutura do wizard
- [ ] Dados e cálculo
- [ ] Integração com ViaCEP e taxa de deslocamento
- [ ] Envio pelo WhatsApp
- [ ] Polimento e responsividade
- [ ] Deploy no GitHub Pages

## 🤝 Como contribuir

O projeto é feito em equipe, então seguimos algumas regras para não pisar no trabalho um do outro:

1. **Nunca commitar direto na `main`.** Crie uma branch por tarefa:
   ```bash
   git checkout main
   git pull
   git checkout -b feat/landing-page
   ```
2. **Padrão de branch:** `feat/` (funcionalidade), `fix/` (correção), `docs/` (documentação), `refactor/` (reorganização).
3. **Padrão de commit** ([Conventional Commits](https://www.conventionalcommits.org/pt-br/)), em português e dizendo o que mudou:
   ```
   feat: adiciona etapa de endereço no wizard
   fix: corrige cálculo da taxa de urgência
   style: ajusta espaçamento do formulário
   docs: atualiza roadmap no README
   ```
4. **Abra um Pull Request** quando terminar. Outra pessoa da equipe revisa antes do merge.
5. Antes de começar algo, **pegue uma issue** no GitHub para todo mundo saber quem está fazendo o quê.

## ⚠️ Aviso

Os valores exibidos são **estimativas**. O valor final depende de visita técnica.

## 👥 Equipe

| Nome | GitHub |
|---|---|
| Marllon Lorran | [@eumarllonln](https://github.com/eumarllonln) |
| Fábio Henrique | — |
| Luiz Vinicius Brito Correia | — |
| Pedro Henrique | — |
