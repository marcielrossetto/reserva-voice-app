/**
 * routes/websocket.js
 * Gerenciar WebSocket para atualizações em tempo real
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';

// Map para guardar conexões por empresa
const clientesPorEmpresa = new Map();

/**
 * ✅ INICIALIZAR WEBSOCKET
 */
function inicializarWebSocket(server) {
    console.log("🔌 Inicializando WebSocket...");
    
    const wss = new WebSocket.Server({ server, path: '/api/calendar/ws' });

    wss.on('connection', (ws, req) => {
        console.log("✅ Cliente WebSocket conectado");
        
        let empresaId = null;
        let clientId = null;

        ws.on('message', (mensagem) => {
            try {
                const data = JSON.parse(mensagem);
                
                switch (data.type) {
                    case 'subscribe':
                        // Cliente se inscreve na empresa
                        empresaId = data.empresaId;
                        clientId = `${empresaId}_${Date.now()}_${Math.random()}`;
                        
                        if (!clientesPorEmpresa.has(empresaId)) {
                            clientesPorEmpresa.set(empresaId, []);
                        }
                        clientesPorEmpresa.get(empresaId).push({ ws, clientId });
                        
                        console.log(`📨 Cliente inscrito na empresa ${empresaId}`);
                        console.log(`👥 Total de clientes na empresa: ${clientesPorEmpresa.get(empresaId).length}`);
                        break;
                        
                    case 'ping':
                        // Responder com pong
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                        break;
                        
                    default:
                        console.warn("⚠️ Tipo de mensagem desconhecido:", data.type);
                }
            } catch (error) {
                console.error("❌ Erro ao processar mensagem:", error);
            }
        });

        ws.on('close', () => {
            if (empresaId && clientesPorEmpresa.has(empresaId)) {
                const clientes = clientesPorEmpresa.get(empresaId);
                const index = clientes.findIndex(c => c.clientId === clientId);
                if (index !== -1) {
                    clientes.splice(index, 1);
                }
                
                console.log(`❌ Cliente desconectado da empresa ${empresaId}`);
                console.log(`👥 Total de clientes na empresa: ${clientes.length}`);
                
                if (clientes.length === 0) {
                    clientesPorEmpresa.delete(empresaId);
                }
            }
        });

        ws.on('error', (error) => {
            console.error("❌ Erro WebSocket:", error);
        });
    });

    console.log("✅ WebSocket server inicializado!");
    return wss;
}

/**
 * ✅ NOTIFICAR CLIENTES DE UMA EMPRESA
 */
function notificarEmpresa(empresaId, tipo, dados = {}) {
    const clientes = clientesPorEmpresa.get(empresaId);
    
    if (!clientes || clientes.length === 0) {
        console.log(`⚠️ Nenhum cliente conectado para empresa ${empresaId}`);
        return;
    }

    const mensagem = JSON.stringify({
        type: tipo,
        empresaId,
        dados,
        timestamp: new Date().toISOString()
    });

    clientes.forEach(({ ws, clientId }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(mensagem);
            console.log(`📤 Notificação enviada ao cliente ${clientId}: ${tipo}`);
        }
    });
}

/**
 * ✅ NOTIFICAR TODOS OS CLIENTES (para eventos globais)
 */
function notificarTodos(tipo, dados = {}) {
    clientesPorEmpresa.forEach((clientes, empresaId) => {
        notificarEmpresa(empresaId, tipo, dados);
    });
}

/**
 * ✅ NOTIFICAR QUANDO RESERVA É CRIADA
 */
function notificarReservaCriada(empresaId, reserva) {
    notificarEmpresa(empresaId, 'reserva:criada', {
        id: reserva.id,
        nome: reserva.nome,
        data: reserva.data,
        horario: reserva.horario,
        mensagem: `Nova reserva: ${reserva.nome}`
    });
}

/**
 * ✅ NOTIFICAR QUANDO RESERVA É EDITADA
 */
function notificarReservaEditada(empresaId, reserva) {
    notificarEmpresa(empresaId, 'reserva:editada', {
        id: reserva.id,
        nome: reserva.nome,
        mensagem: `Reserva editada: ${reserva.nome}`
    });
}

/**
 * ✅ NOTIFICAR QUANDO RESERVA É CANCELADA
 */
function notificarReservaCancelada(empresaId, reservaId, nome) {
    notificarEmpresa(empresaId, 'reserva:cancelada', {
        id: reservaId,
        nome: nome,
        mensagem: `Reserva cancelada: ${nome}`
    });
}

/**
 * ✅ NOTIFICAR QUANDO RESERVA É CONFIRMADA
 */
function notificarReservaConfirmada(empresaId, reserva) {
    notificarEmpresa(empresaId, 'reserva:confirmada', {
        id: reserva.id,
        nome: reserva.nome,
        mensagem: `Reserva confirmada: ${reserva.nome}`
    });
}

/**
 * ✅ NOTIFICAR QUANDO FILA É ALTERADA
 */
function notificarFilaAlterada(empresaId, tipo, pessoa) {
    notificarEmpresa(empresaId, 'fila:alterada', {
        tipo: tipo,
        nome: pessoa.nome,
        mensagem: `Fila alterada: ${pessoa.nome} (${tipo})`
    });
}

module.exports = {
    inicializarWebSocket,
    notificarReservaCriada,
    notificarReservaEditada,
    notificarReservaCancelada,
    notificarReservaConfirmada,
    notificarFilaAlterada,
    notificarEmpresa,
    notificarTodos,
    clientesPorEmpresa
};