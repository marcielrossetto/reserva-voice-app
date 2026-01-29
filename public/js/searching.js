/**
 * public/js/searching.js
 * Script para gerenciar as ações da página de busca/pesquisa
 */

/**
 * Carrega informações do usuário para exibir no header
 */
async function loadUserInfo() {
  try {
    const response = await fetch('/api/user-info');
    if (!response.ok) {
      console.warn('⚠️ /api/user-info retornou:', response.status);
      // Fallback: pega do localStorage
      const userName = localStorage.getItem('user_name') || 'Usuário';
      const userNameSpan = document.getElementById('userName');
      if (userNameSpan) {
        userNameSpan.textContent = userName;
      }
      return;
    }
    
    const data = await response.json();
    const userNameSpan = document.getElementById('userName');
    
    if (userNameSpan && data.nome) {
      userNameSpan.textContent = data.nome;
      // Salva no localStorage para fallback
      localStorage.setItem('user_name', data.nome);
    }
  } catch (error) {
    console.error('Erro ao carregar user-info:', error);
    // Fallback silencioso
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
      userNameSpan.textContent = localStorage.getItem('user_name') || 'Usuário';
    }
  }
}

/**
 * Trata ações dos dropdowns (select) da tabela
 */
function handleAction(selectElement) {
  const valor = selectElement.value;
  if (!valor) return;

  const [acao, id] = valor.split(':');

  switch (acao) {
    case 'whatsapp':
      handleWhatsApp(id);
      break;
    case 'obs':
      abrirModalObsCliente(id);
      break;
    case 'editar':
      abrirModalEditar(id);
      break;
    case 'cancelar':
      abrirModalCancelar(id);
      break;
    case 'reativar':
      reativarReserva(id);
      break;
    default:
      console.warn('Ação desconhecida:', acao);
  }

  // Reset select
  selectElement.value = '';
}

/**
 * Trata WhatsApp - formata os parâmetros
 */
function handleWhatsApp(params) {
  const [tel, nome, data, hora, pax] = params.split('|');
  const mensagem = encodeURIComponent(
    `Olá ${nome}, confirme sua reserva para ${data} às ${hora} para ${pax} pessoas.`
  );
  const link = `https://wa.me/${tel}?text=${mensagem}`;
  window.open(link, '_blank');
}

/**
 * Abre modal para editar observação do cliente
 */
function abrirModalObsCliente(id) {
  const modal = document.getElementById('modalObsCliente');
  if (!modal) {
    console.error('Modal não encontrado: modalObsCliente');
    return;
  }

  // Carrega dados da reserva
  fetch(`/api/reservas/${id}`)
    .then((res) => res.json())
    .then((reserva) => {
      document.getElementById('obs_id').value = id;
      document.getElementById('edit_obsCliente_modal').value = reserva.obsCliente || '';
      modal.style.display = 'block';
      fecharModalClick(modal);
    })
    .catch((err) => {
      console.error('Erro ao carregar reserva:', err);
      alert('Erro ao carregar dados da reserva');
    });
}

/**
 * Abre modal para editar reserva
 */
function abrirModalEditar(id) {
  const modal = document.getElementById('modalEditar');
  if (!modal) {
    console.error('Modal não encontrado: modalEditar');
    return;
  }

  // Carrega dados da reserva
  fetch(`/api/reservas/${id}`)
    .then((res) => res.json())
    .then((reserva) => {
      document.getElementById('edit_id').value = id;
      document.getElementById('edit_nome').value = reserva.nome || '';
      document.getElementById('edit_telefone').value = reserva.telefone || '';
      document.getElementById('edit_data').value = formatarDataParaInput(reserva.data);
      document.getElementById('edit_horario').value = reserva.horario || '';
      document.getElementById('edit_numPessoas').value = reserva.numPessoas || '';
      document.getElementById('edit_numMesa').value = reserva.numMesa || '';
      document.getElementById('edit_obsCliente').value = reserva.obsCliente || '';
      document.getElementById('edit_observacoes').value = reserva.observacoes || '';
      modal.style.display = 'block';
      fecharModalClick(modal);
    })
    .catch((err) => {
      console.error('Erro ao carregar reserva:', err);
      alert('Erro ao carregar dados da reserva');
    });
}

/**
 * Abre modal para cancelar reserva
 */
function abrirModalCancelar(id) {
  const modal = document.getElementById('modalCancelar');
  if (!modal) {
    console.error('Modal não encontrado: modalCancelar');
    return;
  }

  document.getElementById('cancelar_id_input').value = id;
  modal.style.display = 'block';
  fecharModalClick(modal);
}

/**
 * Formata data ISO para input type="date"
 */
function formatarDataParaInput(dataISO) {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Salva edição de observação do cliente
 */
function salvarObsCliente() {
  const id = document.getElementById('obs_id').value;
  const obsCliente = document.getElementById('edit_obsCliente_modal').value;

  if (!id) {
    alert('ID não encontrado');
    return;
  }

  fetch(`/api/reservas/${id}/obs`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ obsCliente }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        alert('Observação salva com sucesso!');
        document.getElementById('modalObsCliente').style.display = 'none';
        location.reload();
      } else {
        alert('Erro ao salvar: ' + data.erro);
      }
    })
    .catch((err) => {
      console.error('Erro:', err);
      alert('Erro ao salvar observação');
    });
}

/**
 * Salva edição de reserva
 */
function salvarEdicao() {
  const id = document.getElementById('edit_id').value;
  const formData = {
    nome: document.getElementById('edit_nome').value,
    data: document.getElementById('edit_data').value,
    horario: document.getElementById('edit_horario').value,
    telefone: document.getElementById('edit_telefone').value,
    numPessoas: document.getElementById('edit_numPessoas').value,
    numMesa: document.getElementById('edit_numMesa').value,
    obsCliente: document.getElementById('edit_obsCliente').value,
    observacoes: document.getElementById('edit_observacoes').value,
  };

  if (!id || !formData.nome || !formData.data) {
    alert('Preencha os campos obrigatórios');
    return;
  }

  fetch(`/api/reservas/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        alert('Reserva atualizada com sucesso!');
        document.getElementById('modalEditar').style.display = 'none';
        location.reload();
      } else {
        alert('Erro ao atualizar: ' + data.erro);
      }
    })
    .catch((err) => {
      console.error('Erro:', err);
      alert('Erro ao atualizar reserva');
    });
}

/**
 * Confirma cancelamento de reserva
 */
function confirmarCancelamento() {
  const id = document.getElementById('cancelar_id_input').value;
  const select = document.getElementById('motivo_cancel_select');
  const opcoesSelecionadas = Array.from(select.selectedOptions).map((opt) => opt.value);

  if (!id) {
    alert('ID não encontrado');
    return;
  }

  if (opcoesSelecionadas.length === 0) {
    alert('Selecione pelo menos um motivo');
    return;
  }

  const motivoCancelamento = opcoesSelecionadas.join('; ');

  fetch(`/api/reservas/${id}/cancelar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ motivoCancelamento }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        alert('Reserva cancelada com sucesso!');
        document.getElementById('modalCancelar').style.display = 'none';
        location.reload();
      } else {
        alert('Erro ao cancelar: ' + data.erro);
      }
    })
    .catch((err) => {
      console.error('Erro:', err);
      alert('Erro ao cancelar reserva');
    });
}

/**
 * Reativa uma reserva
 */
function reativarReserva(id) {
  if (!confirm('Tem certeza que deseja reativar esta reserva?')) {
    return;
  }

  fetch(`/api/reservas/${id}/reativar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        alert('Reserva reativada com sucesso!');
        location.reload();
      } else {
        alert('Erro ao reativar: ' + data.erro);
      }
    })
    .catch((err) => {
      console.error('Erro:', err);
      alert('Erro ao reativar reserva');
    });
}

/**
 * Fecha modal ao clicar no X ou fora da modal
 */
function fecharModalClick(modal) {
  const closeBtn = modal.querySelector('.btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Inicializa ao carregar a página
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ searching.js carregado');
  // loadUserInfo será chamado pelo header.js
});