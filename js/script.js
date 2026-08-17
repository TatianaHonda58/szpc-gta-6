// OBJETIVO: dar comportamento ao site do GTA VI com JavaScript.

// Passos:
// 1. MENU QUE SOME AO ROLAR
//    - achar o menu no HTML
//    - escutar o evento de rolagem da janela
//    - se a página desceu mais de 50px, adicionar a classe "menu-rolado"
//    - se voltou pro topo, remover a classe

// 2. BLOCOS QUE APARECEM
//    - achar todos os elementos com a classe "aparecer"
//    - avisar quando cada um entrar na tela
//    - ao entrar, adicionar a classe "visivel"

// 3. VÍDEO QUE ANDA COM O SCROLL
//    - achar o vídeo da capa
//    - prender a capa na tela enquanto a pessoa rola
//    - sumir com o conteúdo da capa e revelar o vídeo
//    - avançar o tempo do vídeo conforme o scroll
//    - o vídeo NUNCA toca sozinho: quem manda no tempo é a rolagem
//    - quando o vídeo chega no fim, o pin acaba junto e a página é liberada

const menu = document.getElementById("menu");
const blocos = document.querySelectorAll(".aparecer");
const video = document.querySelector(".capa-video");
const capa = document.querySelector(".capa");
const capaPainel = document.querySelector(".capa-painel");
const capaConteudo = document.querySelector(".capa-conteudo");
const capaBarra = document.querySelector(".capa-barra");
const capaSeta = document.querySelector(".capa-seta");

if (menu) {
    window.addEventListener("scroll", function () {
        if (window.scrollY > 50) {
            menu.classList.add("menu-rolado");
        } else {
            menu.classList.remove("menu-rolado");
        }
    });
}

if (blocos.length) {
    const observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visivel");
            }
        });
    });

    blocos.forEach(function (bloco) {
        observador.observe(bloco);
    });
}

if (window.gsap && window.ScrollTrigger && video && capa && capaPainel && capaConteudo) {
    gsap.registerPlugin(ScrollTrigger);

    const DISTANCIA_PIN = 2500;
    // margem pra parar no último frame sem disparar o "ended" (que rebobina em alguns navegadores)
    const MARGEM_FINAL = 0.05;

    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.removeAttribute("autoplay");
    video.removeAttribute("loop");
    video.loop = false;
    video.pause();

    let duracao = 0;
    let liberado = false;

    // trava de segurança: se algo mandar o vídeo tocar, ele volta a ficar parado
    video.addEventListener("play", function () {
        if (!liberado) {
            video.pause();
        }
    });

    const guardarDuracao = function () {
        if (video.duration && Number.isFinite(video.duration)) {
            duracao = video.duration;
            ScrollTrigger.refresh();
        }
    };

    if (video.readyState >= 1) {
        guardarDuracao();
    } else {
        video.addEventListener("loadedmetadata", guardarDuracao, { once: true });
    }

    // alguns navegadores só liberam o seek depois de um play; damos play e pausamos na hora
    const prepararVideo = function () {
        liberado = true;

        const playPromise = video.play();

        const parar = function () {
            liberado = false;
            video.pause();
            // volta pro frame que o scroll está pedindo agora
            aplicarTempo();
        };

        if (playPromise && typeof playPromise.then === "function") {
            playPromise.then(parar).catch(function () {
                liberado = false;
            });
        } else {
            parar();
        }
    };

    window.addEventListener("pointerdown", prepararVideo, { once: true });
    window.addEventListener("touchstart", prepararVideo, { once: true });

    // objeto intermediário: o GSAP anima esse tempo com o scrub e a gente repassa pro vídeo
    const estado = { tempo: 0 };

    const aplicarTempo = function () {
        if (!duracao || video.readyState < 1) {
            return;
        }

        if (Math.abs(video.currentTime - estado.tempo) > 0.01) {
            video.currentTime = estado.tempo;
        }
    };

    gsap.timeline({
        scrollTrigger: {
            trigger: capa,
            start: "top top",
            end: "+=" + DISTANCIA_PIN,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
        }
    })
        .to(video, { opacity: 1, duration: 0.15, ease: "none" }, 0)
        .to(".capa-conteudo, .capa-barra, .capa-seta", {
            opacity: 0,
            y: -40,
            scale: 0.6,
            duration: 0.1,
            ease: "none",
        }, 0.02)
        // duração 1 = o vídeo ocupa o pin inteiro e termina exatamente quando o scroll é liberado
        .fromTo(estado, { tempo: 0 }, {
            tempo: function () {
                return Math.max(duracao - MARGEM_FINAL, 0);
            },
            duration: 1,
            ease: "none",
            onUpdate: aplicarTempo,
        }, 0);
}
