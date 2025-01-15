const bd = require('./db');

const Evento = bd.sequelize.define('evento', {
    id_evento: {
        type: bd.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: bd.Sequelize.INTEGER,
        allowNull: true
    },
    nome: {
        type: bd.Sequelize.STRING(100),
        allowNull: true
    },
    descricao: {
        type: bd.Sequelize.STRING(300),
        allowNull: true
    },
    status: {
        type: bd.Sequelize.STRING(30),
        allowNull: true
    },
    data: {
        type: bd.Sequelize.DATEONLY,
        allowNull: false
    },
    horario: {
        type: bd.Sequelize.TIME,
        allowNull: true
    },
    num_vagas: {
        type: bd.Sequelize.INTEGER,
        allowNull: true
    },
    local: {
        type: bd.Sequelize.STRING(150),
        allowNull: true
    },
    duracao: {
        type: bd.Sequelize.TIME,
        allowNull: true
    },
    nome_responsavel: {
        type: bd.Sequelize.STRING(100),
        allowNull: true
    },
    created_at: {
        type: bd.Sequelize.DATE,
        allowNull: true
    },
    updated_at: {
        type: bd.Sequelize.DATE,
        allowNull: true
    },
}, {
    tableName: 'evento',
    freezeTableName: true,
    underscored: true, // Converte camelCase para snake_case automaticamente
    timestamps: false, // Habilita o gerenciamento automático dos campos createdAt e updatedAt
});

module.exports = Evento;
