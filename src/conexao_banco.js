const { Pool } = require('pg');

// Link de conexão com o banco de dados PostgreSQL
const connectionUrl = 'postgresql://project_ong_banco2_user:SXyckA4le1i08TI9IxEptRAnjeyp3USw@dpg-cu3sohl6l47c73aa3lsg-a.oregon-postgres.render.com/project_ong_banco2';

// Configuração do pool com SSL habilitado
const pool = new Pool({
    connectionString: connectionUrl,
    ssl: {
        rejectUnauthorized: false, // Aceita certificados autoassinados (não recomendado em produção)
    },
});

// Conectando ao banco de dados para teste
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conexão bem-sucedida com o banco de dados');
    release(); // Libera o cliente de volta para o pool
});

module.exports = pool;
