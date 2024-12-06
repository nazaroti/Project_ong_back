// #region Declarações de variáveis de controle
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require("./conexao_banco");
const database = require("./models/db");
const axios = require('axios');
const cron = require('node-cron');

const { Op } = require("sequelize");
const path = require("path");
const methodOverride = require('method-override');
const flash = require('connect-flash');

// Instância do Express
const app = express();

// Middleware para flash messages
app.use(flash());

// Defina o mecanismo de visualização (exemplo: EJS)
app.set('view engine', 'ejs');

// Middleware para permitir métodos PUT e DELETE em formulários HTML
app.use(methodOverride('_method'));

// Modelos
const EventModel = require("./models/Event");
const ParticipantModel = require("./models/Participant");
const UserModel = require("./models/User");

// Definindo a associação entre os modelos
UserModel.hasMany(ParticipantModel, {
    foreignKey: 'id_usuario',
    as: 'participants',
});

ParticipantModel.belongsTo(UserModel, {
    foreignKey: 'id_usuario',
    as: 'user',
});


app.set('views', path.join(__dirname, 'views'));
// #endregion

// #region Configuração Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// #endregion
// Configuração para utilizar elementos estáticos
app.use(express.static(path.join(__dirname, "public")));

// #region Configuração Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware para JSON
app.use(express.json());

// #endregion

// #region Autentificador de conexão do Banco de Dados
database.sequelize.authenticate().then(function () {
    console.log("Banco de Dados Conectado com Sucesso!");
}).catch(function () {
    console.log("Erro ao conectar.");
});
// #endregion

app.use(express.json());


const port = process.env.PORT || 3000;
const SECRET_KEY = 'sua_chave_secreta';

const allowedOrigins = ['https://ong-solidariedade.vercel.app']; 

app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Verifica se a origem está na lista de permitidas
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    // Métodos e cabeçalhos permitidos
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Tratamento para preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});



// Função para gerar o token JWT
function gerarToken(id) {
    return jwt.sign({ id }, SECRET_KEY, { expiresIn: '1h' });
}

// Middleware para verificar o token JWT
function verificarToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];  // Pega o token do cabeçalho Authorization

    console.log('Cabeçalho Authorization recebido:', req.headers['authorization']);  // Para depurar

    if (!token) {
        console.log("Token não fornecido na requisição.");
        return res.status(401).send({ message: 'Token não fornecido.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log("Token inválido ou expirado:", err);
            return res.status(401).send({ message: 'Token inválido ou expirado.' });
        }

        req.userId = decoded.id; // Adiciona o ID do usuário à requisição
        next(); // Passa o controle para a próxima função ou rota
    });
}

app.get('/teste', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM evento'); // Busca todos os campos
        const nomes = result.rows.map(evento => ({ nome: evento.nome })); // Filtra apenas o nome
        res.json(nomes); // Envia somente os nomes como resposta
    } catch (error) {
        console.error('Erro ao buscar eventos:', error.message);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

app.get('/teste2', async (req, res) => {
    const query = `
        SELECT * 
        FROM Evento 
        WHERE Status = 'ativo' 
    `;
    try {
        const result = await pool.query(query); // Executa a consulta com async/await
        res.json(result.rows); // Retorna apenas os resultados (linhas)
    } catch (err) {
        console.error('Erro ao buscar eventos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});





// #region Rotas Principais//

// Rota POST para o cadastro de usuários
// Rota POST para o cadastro de usuários
app.post('/cadastro', async (req, res) => {
    const { nome, sobrenome, telefone, email, password } = req.body;

    if (!nome || !sobrenome || !telefone || !email || !password) {
        return res.status(400).send({ message: 'Por favor, preencha todos os campos.' });
    }

    try {
        // Verificar se o e-mail já existe
        const checkEmailQuery = 'SELECT * FROM usuarios WHERE email = $1';
        const emailResult = await pool.query(checkEmailQuery, [email]);

        if (emailResult.rows.length > 0) {
            return res.status(409).send({ message: 'E-mail já cadastrado' });
        }

        // Criar senha hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir novo usuário
        const insertQuery = `
            INSERT INTO usuarios (nome, sobrenome, telefone, email, senha)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(insertQuery, [nome, sobrenome, telefone, email, hashedPassword]);

        res.status(200).send({ message: 'Usuário cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        res.status(500).send({ message: 'Erro ao cadastrar usuário.' });
    }
});

// Rota POST para login de usuário
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Verificação de campos obrigatórios
    if (!email || !password) {
        return res.status(400).send({ message: 'Email e senha são obrigatórios.' });
    }

    // Consulta ao banco de dados
    const query = 'SELECT * FROM usuarios WHERE email = $1'; // $1 é o placeholder do PostgreSQL
    pool.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Erro ao verificar login no banco de dados:', err);
            return res.status(500).send({ message: 'Erro no servidor' });
        }

        if (results.rows.length > 0) { // 'rows' contém os resultados no PostgreSQL
            const user = results.rows[0];

            if (!user.senha) {
                console.error('Senha não encontrada no banco de dados para o usuário:', email);
                return res.status(500).send({ message: 'Senha não encontrada no banco de dados.' });
            }

            try {
                // Comparação da senha
                const match = await bcrypt.compare(password, user.senha);

                if (match) {
                    // Geração do token JWT
                    const token = gerarToken(user.id);
                    return res.status(200).send({ message: 'Login bem-sucedido', token });
                } else {
                    return res.status(401).send({ message: 'Usuário ou senha incorretos' });
                }
            } catch (error) {
                console.error('Erro ao comparar a senha:', error);
                return res.status(500).send({ message: 'Erro ao processar a comparação da senha.' });
            }
        } else {
            return res.status(401).send({ message: 'Usuário ou senha incorretos' });
        }
    });
});

// Rota GET para obter o perfil do usuário (uso do middleware de verificação de token)
app.get('/perfil', verificarToken, (req, res) => {
    const userId = req.userId; // ID do usuário extraído do token

    // Consulta SQL ajustada para PostgreSQL
    const query = 'SELECT * FROM usuarios WHERE id = $1'; // Utiliza $1 para evitar SQL Injection
    pool.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Erro ao buscar o perfil do usuário:', err);
            return res.status(500).json({ message: 'Erro ao buscar o perfil do usuário.' });
        }

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.status(200).json({ user });
        } else {
            console.log('Usuário não encontrado no banco de dados para o ID:', userId);
            res.status(404).json({ message: 'Usuário não encontrado.' });
        }
    });
});

// Rota PUT para atualizar o perfil do usuário autenticado
app.put('/editar-perfil', verificarToken, (req, res) => {
    const userId = req.userId;
    const { nome, sobrenome, telefone } = req.body;

    // Validação dos dados recebidos
    if (!nome || !sobrenome || !telefone) {
        return res.status(400).send({ message: 'Todos os campos são obrigatórios.' });
    }

    // Consulta para atualizar os dados do usuário
    const updateQuery = `
    UPDATE usuarios
    SET nome = $1, sobrenome = $2, telefone = $3
    WHERE id = $4
`;
    pool.query(updateQuery, [nome, sobrenome, telefone, userId], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar o perfil do usuário:', err);
            return res.status(500).send({ message: 'Erro ao atualizar o perfil do usuário.' });
        }

        if (results.rowCount === 0) {
            return res.status(404).send({ message: 'Usuário não encontrado.' });
        }

        res.status(200).send({ message: 'Perfil atualizado com sucesso.' });
    });
});


app.post('/adminLogin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: 'Email e senha são obrigatórios.' });
    }

    // Atualizar a consulta para usar PostgreSQL (com parâmetros $1)
    const query = 'SELECT * FROM adm WHERE email = $1';

    try {
        const { rows } = await pool.query(query, [email]);

        if (rows.length > 0) {
            const admin = rows[0];

            // Imprimir o JSON do administrador no terminal
            console.log('Administrador encontrado:', JSON.stringify(admin, null, 2));
            
            try {
                // Comparação da senha
                const match = await bcrypt.compare(password, admin.senha);

                if (match) {
                    // Geração do token JWT
                    const token = gerarToken(admin.id_adm); 
                    return res.status(200).send({ message: 'Login bem-sucedido', token });
                } else {
                    return res.status(401).send({ message: 'Usuário ou senha incorretos' });
                }
            } catch (error) {
                console.error('Erro ao comparar a senha:', error);
                return res.status(500).send({ message: 'Erro ao processar a comparação da senha.' });
            }

        } else {
            return res.status(401).send({ message: 'Usuário ou senha de administrador incorretos' });
        }
    } catch (err) {
        console.error('Erro ao verificar login do administrador:', err);
        return res.status(500).send({ message: 'Erro no servidor' });
    }
});

// Rota POST para solicitar um evento
app.post('/solicitarEvento', verificarToken, (req, res) => {
    const { Nome, Descricao, Status, Data, Horario, Num_Vagas, Local, Duracao, Nome_Responsavel } = req.body;
    const userId = req.userId; // ID do usuário extraído do token

    // Verifique os campos recebidos
    console.log('Dados recebidos:', req.body);

    // Validação dos campos obrigatórios
    if (!Nome || !Descricao || !Status || !Data || !Horario || !Num_Vagas || !Local || !Duracao || !Nome_Responsavel) {
        return res.status(400).send({ message: 'Por favor, preencha todos os campos.' });
    }

    // Consulta para inserir o evento no banco de dados
    const insertQuery = `
        INSERT INTO evento (id_usuario, nome, descricao, status, data, horario, num_vagas, local, duracao, nome_responsavel)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    pool.query(insertQuery, [userId, Nome, Descricao, Status, Data, Horario, Num_Vagas, Local, Duracao, Nome_Responsavel])
        .then(() => {
            res.status(200).send({ message: 'Evento solicitado com sucesso!' });
        })
        .catch((err) => {
            console.error('Erro ao solicitar evento:', err);
            res.status(500).send({ message: 'Erro ao solicitar evento.' });
        });
});


// Rota para obter eventos
app.get('/api/eventos', async (req, res) => {
    const query = `
        SELECT * 
        FROM evento 
        WHERE status = 'aprovado' 
        AND data > CURRENT_DATE;
    `;
    try {
        const result = await pool.query(query); // Executa a consulta com async/await
        res.json(result.rows); // Retorna apenas os resultados (linhas)
    } catch (err) {
        console.error('Erro ao buscar eventos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// Rota GET para retornar todos os eventos de um usuário
app.get('/api/eventos2', verificarToken, (req, res) => {
    const userId = req.query.userId;
    console.log("ID do usuário extraído do token:", userId); // Log para verificar o userId

    if (!userId) {
        return res.status(400).send({ message: 'Parâmetro userId não fornecido.' });
    }

    // Consulta SQL para buscar todos os eventos do usuário
    const query = 'SELECT * FROM evento WHERE id_usuario = $1';

    pool.query(query, [userId])
        .then((result) => {
            if (result.rows.length === 0) {
                return res.status(404).send({ message: 'Nenhum evento encontrado para o usuário.' });
            }

            console.log('Eventos encontrados:', result.rows); // Log dos eventos retornados

            // Retorna os eventos encontrados
            res.status(200).json(result.rows);
        })
        .catch((err) => {
            console.error('Erro ao buscar eventos:', err);
            res.status(500).send({ message: 'Erro ao buscar eventos.' });
        });
});


app.post('/api/eventos/:eventoID/inscrever', async (req, res) => {
    const eventoID = req.params.eventoID;
    const { ID_Usuario } = req.body;

    if (!eventoID || !ID_Usuario) {
        return res.status(400).json({ error: 'Dados insuficientes para inscrição.' });
    }

    try {
        // Verificar número de vagas disponíveis
        const vagasQuery = `
            SELECT 
                e.Num_Vagas - COUNT(ie.ID_Inscricao) AS Vagas_Disponiveis
            FROM evento e
            LEFT JOIN inscrever_evento ie ON e.ID_Evento = ie.ID_Evento
            WHERE e.ID_Evento = $1
            GROUP BY e.Num_Vagas
        `;
        const resultVagas = await pool.query(vagasQuery, [eventoID]);

        if (resultVagas.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado.' });
        }

        const vagasDisponiveis = resultVagas.rows[0].vagas_disponiveis;

        if (vagasDisponiveis <= 0) {
            return res.status(400).json({ error: 'Não há vagas disponíveis para este evento.' });
        }

        // Verificar duplicação de inscrições
        const checkQuery = `
            SELECT * FROM inscrever_evento 
            WHERE ID_Evento = $1 AND ID_Usuario = $2
        `;
        const resultCheck = await pool.query(checkQuery, [eventoID, ID_Usuario]);

        if (resultCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Usuário já inscrito neste evento.' });
        }

        // Inserir inscrição
        const insertQuery = `
            INSERT INTO inscrever_evento (ID_Evento, ID_Usuario)
            VALUES ($1, $2)
        `;
        await pool.query(insertQuery, [eventoID, ID_Usuario]);

        res.json({ success: true, message: 'Inscrição realizada com sucesso!' });

    } catch (err) {
        console.error("Erro ao processar inscrição:", err);
        return res.status(500).json({ error: 'Erro no servidor.' });
    }
});


// Rota DELETE para excluir evento
app.delete('/api/eventos', verificarToken, async (req, res) => {
    const eventId = req.query.eventId; // Extrai o `eventId` da query string
    const userId = req.userId; // ID do usuário extraído pelo middleware `verificarToken`

    if (!eventId || isNaN(eventId)) {
        return res.status(400).send({ message: 'ID do evento inválido ou não fornecido.' });
    }

    try {
        // Verificar se o evento existe e pertence ao usuário autenticado
        const checkEventQuery = `
            SELECT * 
            FROM evento 
            WHERE "id_evento" = $1 AND "id_usuario" = $2`;

        const checkEventResult = await pool.query(checkEventQuery, [eventId, userId]);

        if (checkEventResult.rows.length === 0) {
            return res.status(404).send({ message: 'Evento não encontrado ou não pertence ao usuário.' });
        }

        // Excluir o evento
        const deleteEventQuery = `
            DELETE FROM evento 
            WHERE "id_evento" = $1`;

        await pool.query(deleteEventQuery, [eventId]);

        res.status(200).send({ message: 'Evento excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir evento:', err);
        res.status(500).send({ message: 'Erro ao excluir o evento.' });
    }
});



// #endregion //


// #region Rotas ADMIN

// #region Rotas GET

// Rota para buscar eventos "em análise"
app.get('/api/eventos/em-analise', async (req, res) => {
    try {
        const dataAtual = new Date();
        const data = dataAtual.toLocaleDateString('en-CA');
        const horario = dataAtual.toTimeString().slice(0, 8);

        const eventsInReview = await EventModel.findAll({
            where: {
                status: 'em analise',
                [Op.or]: [
                    { data: { [Op.gt]: data } },
                    {
                        data: data,
                        horario: { [Op.gt]: horario }
                    }
                ]
            },
            order: [['data', 'ASC']]
        });

        res.json(eventsInReview);
    } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        res.status(500).json({ error: 'Erro interno no servidor ao buscar eventos.' });
    }
});


app.get("/api/eventos/eventos-futuros", verificarToken, async function (req, res) {
    try {
        const dataAtual = new Date();
        const data = dataAtual.toLocaleDateString('en-CA');
        const horario = dataAtual.toTimeString().slice(0, 8);

        const upcomingEvents = await EventModel.findAll({
            where: {
                status: "aprovado",
                [Op.or]: [
                    { data: { [Op.gt]: data } },

                    {
                        data: data,
                        horario: { [Op.gt]: horario }
                    }
                ]
            },
            order: [['data', 'ASC']]
        });
        console.log(upcomingEvents);
        res.json(upcomingEvents);
    } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        res.status(500).send("Erro ao carregar eventos.");
    }
});


app.get("/api/eventos/relatorio-eventos", verificarToken, async function (req, res) {

    try {
        const dataAtual = new Date();
        const dataLimite = new Date(dataAtual);
        dataLimite.setDate(dataAtual.getDate() - 30);
        const data = dataAtual.toLocaleDateString('en-CA');
        const horario = dataAtual.toTimeString().slice(0, 8);
        const dataLimiteFormatada = dataLimite.toLocaleDateString('en-CA');

        const eventReports = await EventModel.findAll({
            where: {
                data: { [Op.gte]: dataLimiteFormatada }
            },
            order: [['data', 'ASC']]
        });

        res.json(eventReports);
    } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        res.status(500).send("Erro ao carregar eventos.");
    }
})

// #endregion

// #region Rotas POST
app.post("/api/getParticipants", verificarToken, async (req, res) => {
    try {
        const { id_event } = req.body;

        if (!id_event) {
            return res.status(400).json({ error: "ID do evento não fornecido" });
        }

        console.log("ID Evento: " + id_event);

        // Verifica se o evento existe
        const participants = await ParticipantModel.findAll({
            where: { id_evento: id_event },
            include: [
                {
                    model: UserModel,
                    as: 'user', 
                    attributes: ['nome', 'sobrenome'], // Inclua sobrenome aqui
                }
            ],
        });
        
        if (participants && participants.length > 0) {
            // Extrai os nomes e sobrenomes dos participantes e concatena
            const userNames = participants
                .map(participant => {
                    const nome = participant.user ? participant.user.nome : null;
                    const sobrenome = participant.user ? participant.user.sobrenome : null;
                    // Verifica se ambos existem e concatena
                    if (nome && sobrenome) {
                        return `${nome} ${sobrenome}`;
                    }
                    return nome || sobrenome || null; // Retorna o nome ou sobrenome se algum estiver ausente
                })
                .filter(nomeCompleto => nomeCompleto !== null);
        
            console.log(userNames); // Verifica os nomes no console
            return res.json({ participants: userNames });
        
        
        } else {
            return res.json({ participants: [] });
        }
    } catch (error) {
        console.error('Erro ao buscar participantes: ', error);
        return res.status(500).json({ error: 'Erro ao buscar participantes.' });
    }
});

app.delete("/api/eventos/deletOld", verificarToken, async (req, res) => {
    try {
        const dataAtual = new Date();
        const dataLimite = new Date(dataAtual);
        dataLimite.setDate(dataAtual.getDate() - 30); // Data limite: 30 dias atrás
        const dataLimiteFormatada = dataLimite.toLocaleDateString('en-CA'); // Formata para 'YYYY-MM-DD'

        // Exclui eventos mais antigos que a data limite
        const deletedRows = await EventModel.destroy({
            where: {
                data: { [Op.lt]: dataLimiteFormatada } 
            }
        });

        if (deletedRows > 0) {
            res.status(200).json({ message: `${deletedRows} eventos antigos excluídos com sucesso!` });
        } else {
            res.status(200).json({ message: 'Nenhum evento antigo para excluir.' });
        }
    } catch (error) {
        console.error("Erro ao excluir eventos antigos:", error);
        res.status(500).send("Erro ao processar a exclusão.");
    }
});



app.delete("/api/deleteEvent", verificarToken, async (req, res) => {
    try {
        const { event_id } = req.body;

        console.log("ID Evento: " + event_id);

        // Deleta o evento com o ID fornecido
        const deletedRows = await EventModel.destroy({
            where: { id_evento: event_id }
        });

        if (deletedRows > 0) {
            res.status(200).json({ message: 'Evento excluido com sucesso!' });
        } else {
            console.log("Evento não encontrado.");
            res.status(404).send("Evento não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao deletar o evento:", error);
        res.status(500).send("Erro ao processar a solicitação.");
    }
});


app.put("/api/updateEventStatus", verificarToken, async (req, res) => {
    try {
        const { event_id, confirm } = req.body;

        console.log("ID Evento: " + event_id);
        console.log("Novo Status: " + confirm);

        // Atualiza o status do evento com o ID fornecido
        const [updatedRows] = await EventModel.update(
            { status: confirm }, // Atualiza o campo `Status`
            { where: { id_evento: event_id } }
        );

        if (updatedRows > 0) {
            console.log(`Registros atualizados: ${updatedRows}`);
            res.status(200).json({ message: 'Status do evento atualizado com sucesso!' });
        } else {
            console.log("Evento não encontrado.");
            res.status(404).send("Evento não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao atualizar o status do evento:", error);
        res.status(500).send("Erro ao processar a solicitação.");
    }
});

app.post("/api/createEvent", verificarToken, async (req, res) => {
    try {
        const {
            event_ID,
            event_name,
            event_description,
            event_date,
            event_time,
            event_slots,
            event_location,
            event_duration,
            event_responsible
        } = req.body;

        const createEvents = await EventModel.create(
            {
                nome: event_name,
                descricao: event_description,
                status: 'aprovado',
                data: event_date,
                horario: event_time,
                num__vagas: event_slots,
                local: event_location,
                duracao: event_duration,
                nome_responsavel: event_responsible
            });
        console.log(`Registros criados:` + createEvents);
        res.status(200).json({ message: 'O evento foi criado com sucesso!' });
    } catch (error) {
        console.error("Erro ao processar os dados:", error);
        res.status(500).send("Erro ao processar a solicitação.");
    }
});

app.put("/api/editData", verificarToken, async (req, res) => {
    try {
        const {
            event_ID,
            event_name,
            event_description,
            event_status,
            event_date,
            event_time,
            event_slots,
            event_location,
            event_duration,
            event_responsible
        } = req.body;

        const [updatedRows] = await EventModel.update(
            {
                nome: event_name,
                descricao: event_description,
                status: event_status,
                data: event_date,
                horario: event_time,
                num__vagas: event_slots,
                local: event_location,
                duracao: event_duration,
                nome_responsavel: event_responsible
            },
            {
                where: { id_evento: event_ID }
            });
        console.log(`Registros atualizados: ${updatedRows}`);
        res.status(200).json({ message: 'O evento foi atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao processar os dados:", error);
        res.status(500).send("Erro ao processar a solicitação.");
    }
});


app.post("/api/procurar-evento", verificarToken, function (req, res) {

    let whereCondition = {};

    if (req.body.opcao) {
        whereCondition.status = req.body.opcao;
    }

    if (req.body.dataOpcao) {
        whereCondition.data = {
            [Op.gte]: req.body.dataOpcao
        };
    }
    EventModel.findAll({
        where: whereCondition,
        order: [['data', 'ASC']]
    }).then(function (eventReports) {
        res.json(eventReports)
    });
});

app.post("/api/verificar-token", verificarToken, function (req, res) {

    res.status(200).json();
})

cron.schedule('0 0 * * *', async () => {
    try {
        const dataAtual = new Date();
        const dataLimite = new Date(dataAtual);
        dataLimite.setDate(dataAtual.getDate() - 30);
        const dataLimiteFormatada = dataLimite.toLocaleDateString('en-CA');

        const deletedRows = await EventModel.destroy({
            where: {
                data: { [Op.lt]: dataLimiteFormatada }
            }
        });

        console.log(`${deletedRows} eventos antigos excluídos automaticamente.`);
    } catch (error) {
        console.error("Erro ao excluir eventos antigos automaticamente:", error);
    }
});

/*app.get('/', async (req, res) => {
    
    const nome = 'Admin'
    const email = 'rosa.6579100@pucminas.br'
    const password = '6579100puc'
    try {
        // Verificar se o e-mail já existe

        // Criar senha hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir novo usuário
        const insertQuery = `
            INSERT INTO adm (nome, email, senha)
            VALUES ($1, $2, $3)
        `;
        await pool.query(insertQuery, [nome, email, hashedPassword]);

        res.status(200).send({ message: 'Usuário cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        res.status(500).send({ message: 'Erro ao cadastrar usuário.' });
    }
});
*/
// #endregion

// #endregion //

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});