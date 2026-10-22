
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

// ================================
// BANCO DE DADOS
// ================================

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const dbInicial = {
            usuarios: [],
            pacientes: [],
            triagens: [],
            consultas: [],
            chamadaAtual: null,
            historicoChamadas: []
        };

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(dbInicial, null, 2),
            "utf8"
        );

        return dbInicial;
    }

    const conteudo = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(conteudo);

    // Garante que as listas existam
    db.usuarios ||= [];
    db.pacientes ||= [];
    db.triagens ||= [];
    db.consultas ||= [];
    db.historicoChamadas ||= [];

    if (!("chamadaAtual" in db)) {
        db.chamadaAtual = null;
    }

    return db;
}

function writeDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// ================================
// PÁGINA INICIAL
// ================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// ================================
// CADASTRAR USUÁRIO
// ================================

app.post("/usuarios", (req, res) => {
    try {
        const db = readDB();

        const usuario = String(
            req.body.usuario || ""
        ).trim();

        const senha = String(
            req.body.senha || ""
        );

        const tipo = String(
            req.body.tipo || ""
        ).trim();

        const setoresValidos = [
            "atendimento",
            "triagem",
            "medico"
        ];

        if (!usuario || !senha || !tipo) {
            return res.status(400).json({
                erro: "Preencha todos os campos."
            });
        }

        if (!setoresValidos.includes(tipo)) {
            return res.status(400).json({
                erro: "Selecione um setor válido."
            });
        }

        const usuarioExiste = db.usuarios.some(
            u => u.usuario.toLowerCase() ===
                 usuario.toLowerCase()
        );

        if (usuarioExiste) {
            return res.status(409).json({
                erro: "Esse nome de usuário já está cadastrado."
            });
        }

        const novoUsuario = {
            id: Date.now(),
            usuario,
            senha,
            tipo
        };

        db.usuarios.push(novoUsuario);
        writeDB(db);

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso!",
            usuario: {
                id: novoUsuario.id,
                usuario: novoUsuario.usuario,
                tipo: novoUsuario.tipo
            }
        });

    } catch (erro) {
        console.error("Erro ao cadastrar usuário:", erro);

        res.status(500).json({
            erro: "Erro ao cadastrar usuário."
        });
    }
});

// ================================
// LISTAR USUÁRIOS
// ================================

app.get("/usuarios", (req, res) => {
    try {
        const db = readDB();

        // Não envia as senhas para a página
        const usuarios = db.usuarios.map(
            ({ senha, ...usuario }) => usuario
        );

        res.json(usuarios);

    } catch (erro) {
        console.error("Erro ao listar usuários:", erro);

        res.status(500).json({
            erro: "Erro ao buscar usuários."
        });
    }
});

// ================================
// LOGIN
// ================================

app.post("/login", (req, res) => {
    try {
        const db = readDB();

        const usuario = String(
            req.body.usuario || ""
        ).trim();

        const senha = String(
            req.body.senha || ""
        );

        const encontrado = db.usuarios.find(
            u => u.usuario === usuario &&
                 u.senha === senha
        );

        if (!encontrado) {
            console.log("Tentativa de login inválida.");

            return res.status(401).json({
                erro: "Usuário ou senha incorretos."
            });
        }

        console.log(
            "Login realizado:",
            encontrado.usuario
        );

        // Não devolve a senha ao navegador
        res.json({
            id: encontrado.id,
            usuario: encontrado.usuario,
            tipo: encontrado.tipo
        });

    } catch (erro) {
        console.error("Erro no login:", erro);

        res.status(500).json({
            erro: "Erro interno ao realizar login."
        });
    }
});

// ================================
// CADASTRAR PACIENTE - ATENDIMENTO
// ================================

app.post("/atendimento", (req, res) => {
    try {
        const db = readDB();

        const nome = String(
            req.body.nome || ""
        ).trim();

        const cpf = String(
            req.body.cpf || ""
        ).trim();

        const tipo = String(
            req.body.tipo || ""
        ).trim();

        if (!nome || !cpf || !tipo) {
            return res.status(400).json({
                erro: "Preencha nome, CPF e tipo de atendimento."
            });
        }

        const paciente = {
            id: Date.now(),
            nome,
            cpf,
            tipo,
            status: "triagem",
            createdAt: new Date().toISOString()
        };

        db.pacientes.push(paciente);
        writeDB(db);

        console.log("Paciente cadastrado:", nome);

        res.status(201).json({
            mensagem: "Paciente enviado para triagem!",
            paciente
        });

    } catch (erro) {
        console.error("Erro no atendimento:", erro);

        res.status(500).json({
            erro: "Erro ao cadastrar paciente."
        });
    }
});

// ================================
// LISTAR PACIENTES
// ================================

app.get("/pacientes", (req, res) => {
    try {
        const db = readDB();
        res.json(db.pacientes);

    } catch (erro) {
        console.error("Erro ao listar pacientes:", erro);

        res.status(500).json({
            erro: "Erro ao buscar pacientes."
        });
    }
});

// ================================
// CADASTRAR TRIAGEM
// ================================

app.post("/triagem", (req, res) => {
    try {
        const db = readDB();

        const nome = String(
            req.body.nome || ""
        ).trim();

        const sintoma = String(
            req.body.sintoma || ""
        ).trim();

        const temperaturaInformada =
            req.body.temperatura;

        const temperatura = Number(
            temperaturaInformada
        );

        const alergia = String(
            req.body.alergia || "Nenhuma"
        ).trim();

        const observacao = String(
            req.body.observacao || ""
        ).trim();

        if (
            !nome ||
            !sintoma ||
            temperaturaInformada === "" ||
            temperaturaInformada === null ||
            temperaturaInformada === undefined ||
            !Number.isFinite(temperatura)
        ) {
            return res.status(400).json({
                erro: "Preencha nome, sintoma e temperatura."
            });
        }

        // Regras demonstrativas de classificação
        const riscosVermelhos = [
            "infarto",
            "avc",
            "convulsao",
            "hemorragia",
            "falta_ar_grave"
        ];

        const riscosAmarelos = [
            "febre",
            "vomito",
            "diarreia",
            "falta_ar_moderada"
        ];

        let risco = "verde";

        if (
            temperatura >= 39 ||
            riscosVermelhos.includes(sintoma)
        ) {
            risco = "vermelho";

        } else if (
            temperatura >= 38 ||
            riscosAmarelos.includes(sintoma)
        ) {
            risco = "amarelo";
        }

        const triagem = {
            id: Date.now(),
            nome,
            sintoma,
            temperatura,
            alergia: alergia || "Nenhuma",
            observacao,
            risco,
            status: "aguardando_medico",
            createdAt: new Date().toISOString()
        };

        db.triagens.push(triagem);

        // Atualiza o cadastro do atendimento
        const paciente = db.pacientes.find(
            p => p.nome.toLowerCase() ===
                 nome.toLowerCase() &&
                 p.status === "triagem"
        );

        if (paciente) {
            paciente.status = "aguardando_medico";
        }

        writeDB(db);

        console.log("Triagem cadastrada:", nome);
        console.log("Classificação:", risco);

        res.status(201).json(triagem);

    } catch (erro) {
        console.error("Erro na triagem:", erro);

        res.status(500).json({
            erro: "Erro ao cadastrar triagem."
        });
    }
});

// ================================
// LISTAR TRIAGENS PENDENTES
// ================================

app.get("/triagens", (req, res) => {
    try {
        const db = readDB();

        const pendentes = db.triagens.filter(
            t => t.status !== "atendido"
        );

        res.json(pendentes);

    } catch (erro) {
        console.error("Erro ao listar triagens:", erro);

        res.status(500).json({
            erro: "Erro ao buscar triagens."
        });
    }
});

// ================================
// LISTA DE MEDICAÇÕES
// ================================

app.get("/lista-medicacoes", (req, res) => {
    res.json([
        "Dipirona",
        "Paracetamol",
        "Ibuprofeno",
        "Amoxicilina",
        "Azitromicina",
        "Loratadina",
        "Omeprazol",
        "Buscopan",
        "Dramin",
        "Soro fisiológico"
    ]);
});

// ================================
// SALVAR CONSULTA MÉDICA
// ================================

app.post("/consulta", (req, res) => {
    try {
        const db = readDB();

        const paciente = String(
            req.body.paciente || ""
        ).trim();

        const diagnostico = String(
            req.body.diagnostico || ""
        ).trim();

        const medicacao = String(
            req.body.medicacao || ""
        ).trim();

        const obs = String(
            req.body.obs || ""
        ).trim();

        if (!paciente || !diagnostico || !medicacao) {
            return res.status(400).json({
                erro: "Informe paciente, diagnóstico e medicação."
            });
        }

        const consulta = {
            id: Date.now(),
            paciente,
            diagnostico,
            medicacao,
            obs,
            createdAt: new Date().toISOString()
        };

        db.consultas.push(consulta);

        // Marca a triagem como atendida
        const triagem = db.triagens.find(
            t => t.nome.toLowerCase() ===
                 paciente.toLowerCase() &&
                 t.status !== "atendido"
        );

        if (triagem) {
            triagem.status = "atendido";
        }

        // Atualiza o cadastro do paciente
        const cadastro = db.pacientes.find(
            p => p.nome.toLowerCase() ===
                 paciente.toLowerCase()
        );

        if (cadastro) {
            cadastro.status = "atendido";
        }

        writeDB(db);

        console.log("Consulta salva:", paciente);

        res.status(201).json({
            mensagem: "Consulta salva com sucesso!",
            consulta
        });

    } catch (erro) {
        console.error("Erro na consulta:", erro);

        res.status(500).json({
            erro: "Erro ao salvar consulta."
        });
    }
});

// ================================
// LISTAR MEDICAÇÕES PRESCRITAS
// ================================

app.get("/medicacoes", (req, res) => {
    try {
        const db = readDB();
        res.json(db.consultas);

    } catch (erro) {
        console.error("Erro ao listar medicações:", erro);

        res.status(500).json({
            erro: "Erro ao buscar medicações."
        });
    }
});

// ================================
// CHAMAR PACIENTE NA TV
// ================================

app.post("/tv/chamar", (req, res) => {
    try {
        const db = readDB();

        const localTipo = String(
            req.body.localTipo || "GUICHÊ"
        ).trim();

        const localNumero = String(
            req.body.localNumero || "01"
        ).trim();

        const paciente = String(
            req.body.paciente || ""
        ).trim();

        if (!paciente) {
            return res.status(400).json({
                erro: "Informe o nome do paciente."
            });
        }

        const chamada = {
            id: Date.now(),
            localTipo,
            localNumero,
            paciente,
            createdAt: new Date().toISOString()
        };

        db.chamadaAtual = chamada;

        db.historicoChamadas.unshift(chamada);

        // Mantém apenas as oito últimas chamadas
        db.historicoChamadas =
            db.historicoChamadas.slice(0, 8);

        writeDB(db);

        res.status(201).json({
            mensagem: "Paciente chamado na TV!",
            chamada
        });

    } catch (erro) {
        console.error("Erro ao chamar paciente:", erro);

        res.status(500).json({
            erro: "Erro ao chamar paciente na TV."
        });
    }
});

// ================================
// CONSULTAR CHAMADA E HISTÓRICO DA TV
// ================================

app.get("/tv/chamado", (req, res) => {
    try {
        const db = readDB();

        res.json({
            chamada: db.chamadaAtual,
            historico: db.historicoChamadas
        });

    } catch (erro) {
        console.error("Erro ao consultar TV:", erro);

        res.status(500).json({
            erro: "Erro ao buscar chamadas."
        });
    }
});

// ================================
// INICIAR SERVIDOR
// ================================

app.listen(PORT, () => {
    console.log("================================");
    console.log("SENTINELA iniciado com sucesso!");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("Aguardando atendimentos...");
    console.log("================================");
});
