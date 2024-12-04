const { Sequelize } = require('sequelize');

// Configuração do Banco de Dados PostgreSQL com SSL
const sequelize = new Sequelize('project_ong_banco', 'project_ong_banco_user', 'GTYrLBPK6LIvvXH66Y8FRjumnHkAcsCI', {
  host: 'dpg-ct76dibtq21c73bjo40g-a.oregon-postgres.render.com',
  dialect: 'postgres',
  port: 5432,
  ssl: {
    require: true, // Exige SSL
    rejectUnauthorized: false, // Desabilita a verificação do certificado
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Ignora erro de certificado não verificado
    }
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados foi bem-sucedida!');
  })
  .catch((err) => {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  });

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
};
