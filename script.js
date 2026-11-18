const apiKey = document.getElementById("apiKey");
const mensagem = document.getElementById("mensagem");
const areaConversa = document.getElementById("areaConversa");
const btnEnviar = document.getElementById("btnEnviar");
const inicial = document.getElementById("inicial");
const mensagemInicial = document.getElementById("mensagemInicial");
const btnEnviarInicial = document.getElementById("btnEnviarInicial");
const mensagemInferior = document.getElementById("mensagemInferior");
const listaConversas = document.getElementById("listaConversas");
const btnNovaConversa = document.getElementById("btnNovaConversa");

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const CHAVE_STORAGE = "tiaozinGPT_conversas";

let conversas = JSON.parse(localStorage.getItem(CHAVE_STORAGE)) || [];
let conversaAtual = null;
let enviando = false;

function salvar() {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(conversas));
}

// Mostra a tela inicial ou a tela de conversa
function mostrarTela(temMensagens) {
    inicial.style.display = temMensagens ? "none" : "flex";
    areaConversa.style.display = temMensagens ? "block" : "none";
    mensagemInferior.style.setProperty("display", temMensagens ? "flex" : "none", "important");
}

function atualizarLista() {
    listaConversas.innerHTML = "";

    [...conversas].reverse().forEach(function (conversa) {
        const item = document.createElement("li");
        item.classList.add("conversa");

        const botao = document.createElement("button");
        botao.textContent = conversa.titulo;

        if (conversa === conversaAtual) {
            botao.classList.add("ativa");
        }

        botao.addEventListener("click", function () {
            abrirConversa(conversa);
        });

        item.appendChild(botao);
        listaConversas.appendChild(item);
    });
}

function novaConversa() {
    if (enviando) return;

    conversaAtual = null;
    areaConversa.innerHTML = "";
    mensagem.value = "";
    mensagemInicial.value = "";

    mostrarTela(false);
    atualizarLista();
}

function abrirConversa(conversa) {
    if (enviando) return;

    conversaAtual = conversa;
    areaConversa.innerHTML = "";

    conversa.mensagens.forEach(function (item) {
        adicionarMensagem(item.content, item.role === "user" ? "usuario" : "ia");
    });

    mostrarTela(conversa.mensagens.length > 0);
    atualizarLista();
}

function adicionarMensagem(texto, tipo) {
    const balao = document.createElement("div");
    balao.classList.add("balao", tipo);

    if (tipo === "ia" && typeof marked !== "undefined") {
        balao.innerHTML = marked.parse(texto);
    } else {
        balao.textContent = texto;
    }

    areaConversa.appendChild(balao);
    areaConversa.scrollTop = areaConversa.scrollHeight;

    return balao;
}

function bloquearBotoes(bloquear) {
    enviando = bloquear;
    btnEnviar.disabled = bloquear;
    btnEnviarInicial.disabled = bloquear;
    btnNovaConversa.disabled = bloquear;
}

async function enviarMensagem(textoDigitado) {
    if (enviando) return;

    const texto = (textoDigitado || mensagem.value).trim();
    const chave = apiKey.value.trim();

    if (texto === "") return;

    if (chave === "") {
        alert("Digite sua API Key primeiro!");
        return;
    }

    // Cria a conversa se ainda não existir
    if (!conversaAtual) {
        conversaAtual = {
            titulo: texto.length > 30 ? texto.substring(0, 30) + "..." : texto,
            mensagens: []
        };
        conversas.push(conversaAtual);
    }

    mostrarTela(true);
    adicionarMensagem(texto, "usuario");

    mensagem.value = "";
    mensagemInicial.value = "";

    bloquearBotoes(true);

    const carregando = adicionarMensagem("Pensando...", "ia");

    conversaAtual.mensagens.push({ role: "user", content: texto });
    salvar();
    atualizarLista();

    try {
        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + chave
            },
            body: JSON.stringify({
                model: MODEL,
                messages: conversaAtual.mensagens
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.error?.message || "Erro na comunicação com a API.");
        }

        const respostaIA = dados.choices[0].message.content;

        conversaAtual.mensagens.push({ role: "assistant", content: respostaIA });
        salvar();

        if (typeof marked !== "undefined") {
            carregando.innerHTML = marked.parse(respostaIA);
        } else {
            carregando.textContent = respostaIA;
        }

    } catch (erro) {
        // Remove a pergunta que falhou
        conversaAtual.mensagens.pop();
        salvar();

        carregando.textContent = "Erro: " + erro.message;
    }

    bloquearBotoes(false);
}

// Eventos
btnEnviarInicial.addEventListener("click", function () {
    enviarMensagem(mensagemInicial.value);
});

mensagemInicial.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        enviarMensagem(mensagemInicial.value);
    }
});

btnEnviar.addEventListener("click", function () {
    enviarMensagem();
});

mensagem.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        enviarMensagem();
    }
});

btnNovaConversa.addEventListener("click", novaConversa);

// Ao abrir a página, abre a última conversa (se houver)
atualizarLista();

if (conversas.length > 0) {
    abrirConversa(conversas[conversas.length - 1]);
}