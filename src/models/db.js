const { Sequelize } = require('sequelize');

// Configuração do Banco de Dados PostgreSQL com SSL
const sequelize = new Sequelize('project_ong_banco', 'project_ong_banco_user', 'GTYrLBPK6LIvvXH66Y8FRjumnHkAcsCI', {
  host: 'dpg-ct76dibtq21c73bjo40g-a.oregon-postgres.render.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: {
      require: true, // Exige SSL para a conexão
      rejectUnauthorized: false, // Ignora erros de certificados autoassinados
    }
  },
  logging: false, // Desativa logs do Sequelize (opcional, para menos ruído)
});

// Testar a conexão com o banco de dados
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados foi bem-sucedida!');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error.message);
  }
})();

module.exports = {
  Sequelize,
  sequelize,
};

