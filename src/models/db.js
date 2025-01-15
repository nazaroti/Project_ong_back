const { Sequelize } = require('sequelize');

// Configuração do Banco de Dados PostgreSQL com SSL
const sequelize = new Sequelize('project_ong_banco2', 'project_ong_banco2_user', 'SXyckA4le1i08TI9IxEptRAnjeyp3USw', {
  host: 'dpg-cu3sohl6l47c73aa3lsg-a.oregon-postgres.render.com',
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

