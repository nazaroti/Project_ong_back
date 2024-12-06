const bd = require('./db');

const ParticipantModel = bd.sequelize.define('inscrever_evento', {
    id_inscricao: {
        type: bd.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    id_evento: {
        type: bd.Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'eventos', // Tabela referenciada em snake_case
            key: 'id_evento'  // Coluna de referência também em snake_case
        }
    },
    id_usuario: {
        type: bd.Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios', // Tabela referenciada em snake_case
            key: 'id_usuario'  // Coluna de referência também em snake_case
        }
    }
}, {
    tableName: 'inscrever_evento', 
    timestamps: false,   // Não utilizar campos createdAt e updatedAt
    underscored: true    // Garantir que as colunas usem snake_case
});

module.exports = ParticipantModel;
