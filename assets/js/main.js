// main.js - comportamento geral da landing page

// Liga e desliga os disjuntores do quadro de serviços no hero
document.querySelectorAll('.disjuntor').forEach((disjuntor) => {
    disjuntor.addEventListener('click', () => {
        const ligado = disjuntor.classList.toggle('ligado');
        disjuntor.setAttribute('aria-pressed', String(ligado));
    });
});
