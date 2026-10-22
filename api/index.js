
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Arquivos do projeto
const FRONTEND_DIR = path.join(__dirname, "../frontend");
const DB_FILE = path.join(__dirname, "../backend/db.json");

app.use(express.static(FRONTEND_DIR));

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

    const db = JSON.parse(
        fs.readFileSync(DB_FILE, "utf8")
    );

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

function writeDB(db) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2),
        "utf8"
    );
}

// ================================
// PÁGINA INICIAL
// ================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(FRONTEND_DIR, "index.html")
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
                erro: "Setor inválido."
            });
        }

        const existe = db.usuarios.some(
            u => u.usuario.toLowerCase() ===
                 usuario.toLowerCase()
        );

        if (existe) {
            return res.status(409).json({
                erro: "Esse usuário já existe."
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
            mensagem: "Usuário cadastrado!",
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

        res.json(
            db.usuarios.map(
                ({ senha, ...usuario }) => usuario
            )
        );

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

        const user = db.usuarios.find(
            u => u.usuario === usuario &&
                 u.senha === senha
        );

        if (!user) {
            return res.status(401).json({
                erro: "Usuário ou senha incorretos."
            });
        }

        res.json({
            id: user.id,
            usuario: user.usuario,
            tipo: user.tipo
        });

    } catch (erro) {
        console.error("Erro no login:", erro);

        res.status(500).json({
            erro: "Erro interno no login."
        });
    }
});

// ================================
// ATENDIMENTO
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
// TRIAGEM
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

        const sintomasVermelhos = [
            "infarto",
            "avc",
            "convulsao",
            "hemorragia",
            "falta_ar_grave"
        ];

        const sintomasAmarelos = [
            "febre",
            "vomito",
            "diarreia",
            "falta_ar_moderada"
        ];

        let risco = "verde";

        if (
            temperatura >= 39 ||
            sintomasVermelhos.includes(sintoma)
        ) {
            risco = "vermelho";

        } else if (
            temperatura >= 38 ||
            sintomasAmarelos.includes(sintoma)
        ) {
            risco = "amarelo";
        }

        const triagem = {
            id: Date.now(),
            nome,
            sintoma,
            temperatura,
            alergia: req.body.alergia || "Nenhuma",
            observacao: req.body.observacao || "",
            risco,
            status: "aguardando_medico",
            createdAt: new Date().toISOString()
        };

        db.triagens.push(triagem);

        const paciente = db.pacientes.find(
            p => p.nome.toLowerCase() ===
                 nome.toLowerCase() &&
                 p.status === "triagem"
        );

        if (paciente) {
            paciente.status = "aguardando_medico";
        }

        writeDB(db);

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

        res.json(
            db.triagens.filter(
                t => t.status !== "atendido"
            )
        );

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
// CONSULTA MÉDICA
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
                erro: "Preencha paciente, diagnóstico e medicação."
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

        const triagem = db.triagens.find(
            t => t.nome.toLowerCase() ===
                 paciente.toLowerCase() &&
                 t.status !== "atendido"
        );

        if (triagem) {
            triagem.status = "atendido";
        }

        const cadastro = db.pacientes.find(
            p => p.nome.toLowerCase() ===
                 paciente.toLowerCase()
        );

        if (cadastro) {
            cadastro.status = "atendido";
        }

        writeDB(db);

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
// MEDICAÇÕES PRESCRITAS
// ================================

app.get("/medicacoes", (req, res) => {
    try {
        const db = readDB();
        res.json(db.consultas);

    } catch (erro) {
        console.error("Erro ao buscar medicações:", erro);

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

        const paciente = String(
            req.body.paciente || ""
        ).trim();

        const localTipo = String(
            req.body.localTipo || "GUICHÊ"
        ).trim();

        const localNumero = String(
            req.body.localNumero || "01"
        ).trim();

        if (!paciente) {
            return res.status(400).json({
                erro: "Informe o nome do paciente."
            });
        }

        const chamada = {
            id: Date.now(),
            paciente,
            localTipo,
            localNumero,
            createdAt: new Date().toISOString()
        };

        db.chamadaAtual = chamada;
        db.historicoChamadas.unshift(chamada);

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
// CONSULTAR CHAMADA DA TV
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

// VERCEL
module.exports = app;
