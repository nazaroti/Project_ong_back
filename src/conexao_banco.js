const { Client } = require('pg');

// Link de conexão com o banco de dados PostgreSQL
const connectionUrl = 'postgresql://project_ong_banco_user:GTYrLBPK6LIvvXH66Y8FRjumnHkAcsCI@dpg-ct76dibtq21c73bjo40g-a.oregon-postgres.render.com/project_ong_banco';

// Configuração do cliente com SSL habilitado
const client = new Client({
    connectionString: connectionUrl,
    ssl: {
        rejectUnauthorized: false, // Aceita certificados autoassinados (não recomendado em produção)
    },
});

// Conectando ao banco de dados
client.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conexão bem-sucedida com o banco de dados');
});

module.exports = client;
