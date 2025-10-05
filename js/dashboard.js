import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Iniciando dashboard...");
  showLoading();
  
  try {
    await Promise.all([
      carregarDadosDashboard(),
      carregarComprasRecentes()
    ]);
  } catch (error) {
    showError('Erro ao carregar dados do dashboard');
    console.error('Erro geral:', error);
  } finally {
    hideLoading();
  }
});

function showLoading() {
  document.getElementById('loading-message').style.display = 'flex';
  document.querySelectorAll('.card-loading').forEach(el => {
    el.style.display = 'flex';
  });
}

function hideLoading() {
  document.getElementById('loading-message').style.display = 'none';
  document.querySelectorAll('.card-loading').forEach(el => {
    el.style.display = 'none';
  });
}

function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.querySelector('p').innerHTML = `⚠️ ${message}. <a href="#" id="retry-btn">Tentar novamente</a>`;
  errorElement.style.display = 'flex';
  
  document.getElementById('retry-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    errorElement.style.display = 'none';
    showLoading();
    try {
      await Promise.all([
        carregarDadosDashboard(),
        carregarComprasRecentes()
      ]);
    } catch (error) {
      showError('Erro ao recarregar os dados');
    } finally {
      hideLoading();
    }
  });
}

async function carregarDadosDashboard() {
  try {
    console.log("📊 Carregando dados do dashboard...");
    // Calcular saldo total (receitas - despesas)
    const lancamentosSnapshot = await getDocs(collection(db, 'lancamentos'));
    let totalReceitas = 0;
    let totalDespesas = 0;
    let receitasMes = 0;
    let despesasMes = 0;
    
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    lancamentosSnapshot.forEach(doc => {
      const lancamento = doc.data();
      const valor = parseFloat(lancamento.valor) || 0;
      const dataLancamento = new Date(lancamento.data);
      
      if (lancamento.tipo === 'receita') {
        totalReceitas += valor;
        if (dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual) {
          receitasMes += valor;
        }
      } else if (lancamento.tipo === 'despesa') {
        totalDespesas += valor;
        if (dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual) {
          despesasMes += valor;
        }
      }
    });
    
    const saldoTotal = totalReceitas - totalDespesas;
    
    // Calcular limite disponível dos cartões
    const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));
    let limiteTotal = 0;
    let limiteUsado = 0;
    
    for (const docCartao of cartoesSnapshot.docs) {
      const cartao = docCartao.data();
      const cartaoId = docCartao.id;
      
      // Somar limite do cartão
      limiteTotal += parseFloat(cartao.limite) || 0;
      
      // Calcular quanto foi usado neste cartão
      const lancamentosCartaoQuery = query(
        collection(db, 'lancamentos'),
        where('cartao_id', '==', cartaoId)
      );
      const lancamentosCartaoSnapshot = await getDocs(lancamentosCartaoQuery);
      
      lancamentosCartaoSnapshot.forEach(lancDoc => {
        limiteUsado += parseFloat(lancDoc.data().valor) || 0;
      });
    }
    
    const limiteDisponivel = limiteTotal - limiteUsado;
    
    // Atualizar valores na interface
    document.getElementById('saldo-total').textContent = formatarMoeda(saldoTotal);
    document.getElementById('receitas-mes').textContent = formatarMoeda(receitasMes);
    document.getElementById('despesas-mes').textContent = formatarMoeda(despesasMes);
    document.getElementById('limite-disponivel').textContent = formatarMoeda(limiteDisponivel);
    
    // Adicionar classes de cor baseado nos valores
    const saldoElement = document.getElementById('saldo-total');
    saldoElement.className = saldoTotal >= 0 ? 'card-value positive' : 'card-value negative';
    
    console.log("✅ Dashboard carregado com sucesso!");
    
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
    throw error;
  }
}

async function carregarComprasRecentes() {
  try {
    console.log("🛒 Carregando compras recentes...");
    const transacoesContainer = document.getElementById('transacoes-recentes');
    
    // Buscar todas as transações recentes
    const lancamentosQuery = query(
      collection(db, 'lancamentos'),
      orderBy('data', 'desc'),
      limit(50) // Buscamos mais para garantir que pegamos todas as parcelas
    );
    
    const lancamentosSnapshot = await getDocs(lancamentosQuery);
    console.log(`📋 Encontrados ${lancamentosSnapshot.size} lançamentos no total`);
    
    // Mapa para agrupar compras por compra_id
    const comprasMap = new Map();
    
    // Lista para compras não parceladas
    const comprasNaoParceladas = [];
    
    lancamentosSnapshot.forEach(doc => {
      const lancamento = doc.data();
      console.log(`📄 Processando: ${lancamento.descricao} | Valor: ${lancamento.valor} | Parcelado: ${lancamento.parcelado} | ID: ${lancamento.compra_id}`);
      
      // Se não for parcelado, adiciona diretamente à lista de compras não parceladas
      if (!lancamento.parcelado) {
        // Verifica se é uma despesa (compra)
        if (lancamento.tipo === 'despesa') {
          comprasNaoParceladas.push({
            id: doc.id,
            ...lancamento
          });
          console.log(`➕ Adicionado compra não parcelada: ${lancamento.descricao}`);
        }
        return;
      }
      
      // Se for parcelado, agrupa pelo compra_id
      if (lancamento.compra_id) {
        // Se já existe no mapa, adiciona esta parcela ao array de parcelas
        if (comprasMap.has(lancamento.compra_id)) {
          const compra = comprasMap.get(lancamento.compra_id);
          compra.parcelas.push({
            valor: parseFloat(lancamento.valor) || 0,
            data: lancamento.data,
            descricao: lancamento.descricao
          });
          console.log(`➕ Adicionada parcela ao grupo ${lancamento.compra_id}: ${lancamento.descricao}`);
        } else {
          // Se não existe, cria uma nova entrada
          comprasMap.set(lancamento.compra_id, {
            id: doc.id,
            descricao: lancamento.descricao,
            categoria: lancamento.categoria,
            data: lancamento.data,
            parcelado: true,
            parcelas: [{
              valor: parseFloat(lancamento.valor) || 0,
              data: lancamento.data,
              descricao: lancamento.descricao
            }]
          });
          console.log(`🆕 Criado novo grupo de parcelas: ${lancamento.compra_id}`);
        }
      } else {
        console.log(`⚠️ Lançamento parcelado sem compra_id: ${lancamento.descricao}`);
      }
    });
    
    console.log(`🗂️ Grupos de compras parceladas: ${comprasMap.size}`);
    console.log(`📦 Compras não parceladas: ${comprasNaoParceladas.length}`);
    
    // Processar as compras parceladas para calcular o valor total
    const comprasParceladas = [];
    comprasMap.forEach((compra, compraId) => {
      // Calcular o valor total somando todas as parcelas
      const valorTotal = compra.parcelas.reduce((soma, parcela) => soma + parcela.valor, 0);
      
      // Encontrar a data mais antiga (data da compra)
      const dataMaisAntiga = compra.parcelas.reduce((maisAntiga, parcela) => {
        return new Date(parcela.data) < new Date(maisAntiga.data) ? parcela : maisAntiga;
      }).data;
      
      // Limpar a descrição (remover sufixos de parcela)
      const descricaoLimpa = compra.descricao.replace(/ - \d+\/\d+.*$/, '');
      
      comprasParceladas.push({
        id: compra.id,
        descricao: descricaoLimpa,
        categoria: compra.categoria,
        data: dataMaisAntiga,
        valor: valorTotal,
        parcelado: true,
        parcelas: compra.parcelas.length
      });
      
      console.log(`💰 Compra parcelada processada: ${descricaoLimpa} | Total: R$ ${valorTotal} | Parcelas: ${compra.parcelas.length}`);
    });
    
    // Combinar compras parceladas e não parceladas
    const todasCompras = [...comprasNaoParceladas, ...comprasParceladas];
    console.log(`📊 Total de compras processadas: ${todasCompras.length}`);
    
    // Ordenar por data (mais recentes primeiro) e pegar as 5 mais recentes
    const comprasRecentes = todasCompras
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 5);
    
    console.log(`🏆 Top 5 compras recentes selecionadas`);
    
    if (comprasRecentes.length === 0) {
      transacoesContainer.innerHTML = `
        <div class="empty-state">
          <p>📋 Nenhuma compra encontrada</p>
          <small>Adicione seu primeiro lançamento para começar!</small>
        </div>
      `;
      console.log("⚠️ Nenhuma compra encontrada para exibir");
      return;
    }
    
    let transacoesHtml = '';
    
    comprasRecentes.forEach((compra, index) => {
      const valor = parseFloat(compra.valor) || 0;
      const tipoIcon = '📉'; // Só mostramos despesas aqui
      const tipoClass = 'negative';
      const dataFormatada = formatarData(compra.data);
      
      // Informações de parcelamento
      const parcelasInfo = compra.parcelado 
        ? `<span class="parcelas-info">${compra.parcelas}x de ${formatarMoeda(valor / compra.parcelas)}</span>` 
        : '';
      
      transacoesHtml += `
        <div class="transaction-item">
          <div class="transaction-info">
            <div class="transaction-header">
              <span class="transaction-icon">${tipoIcon}</span>
              <span class="transaction-description">${compra.descricao}</span>
            </div>
            <div class="transaction-details">
              <small>${compra.categoria} • ${dataFormatada}</small>
              ${parcelasInfo}
            </div>
          </div>
          <div class="transaction-value ${tipoClass}">
            ${formatarMoeda(valor)}
          </div>
        </div>
      `;
      
      console.log(`${index + 1}. ${compra.descricao} | R$ ${valor} | ${compra.parcelado ? `${compra.parcelas}x` : 'à vista'}`);
    });
    
    transacoesContainer.innerHTML = transacoesHtml;
    console.log("✅ Compras recentes exibidas com sucesso!");
    
  } catch (error) {
    console.error('Erro ao carregar compras recentes:', error);
    document.getElementById('transacoes-recentes').innerHTML = `
      <div class="empty-state">
        <p>❌ Erro ao carregar compras</p>
      </div>
    `;
    throw error;
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarData(data) {
  const dataObj = new Date(data + 'T00:00:00');
  return dataObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}