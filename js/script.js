   import { db } from "./js/firebase-config";
   import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
   
   // Esperar o Firebase carregar
window.addEventListener('load', function () {
    // Verificar se o Firebase foi carregado
    if (typeof firebase === 'undefined') {
        console.error('Firebase não foi carregado. Verifique a conexão com a internet.');
        showNotification('Erro ao carregar o Firebase. Verifique sua conexão.', 'error');
        return;
    }

    // Verificar se a configuração do Firebase está disponível
    if (typeof firebaseConfig === 'undefined') {
        console.error('Configuração do Firebase não encontrada. Verifique se o firebase-config.js foi carregado.');
        showNotification('Erro ao carregar configuração do Firebase.', 'error');
        return;
    }

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    // Dados iniciais (vazio, será preenchido pelo Firebase)
    let currentUser = 'cardUserId';
    let transactions = [];
    let cards = [];
    let users = []; // Inicialmente vazio

    // Variável para armazenar o ID do item sendo editado
    let editingTransactionId = null;
    let editingCardId = null;
    let editingUserId = null;

    // Inicializar aplicativo
    initApp();

    function initApp() {
        // Definir data atual como padrão
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Carregar dados do Firebase
        loadFromFirebase();

        // Adicionar eventos
        setupEventListeners();
    }

    function setupEventListeners() {
        // Elementos do DOM
        const userSelector = document.getElementById('userSelector');
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        const closeTransactionModal = document.getElementById('closeTransactionModal');
        const cancelTransaction = document.getElementById('cancelTransaction');
        const transactionForm = document.getElementById('transactionForm');
        const addCardBtn = document.getElementById('addCardBtn');
        const closeCardModal = document.getElementById('closeCardModal');
        const cancelCard = document.getElementById('cancelCard');
        const cardForm = document.getElementById('cardForm');
        const addUserBtn = document.getElementById('addUserBtn');
        const closeUserModal = document.getElementById('closeUserModal');
        const cancelUser = document.getElementById('cancelUser');
        const userForm = document.getElementById('userForm');
        const generateInvoiceBtn = document.getElementById('generateInvoiceBtn');
        const closeInvoiceReportModal = document.getElementById('closeInvoiceReportModal');
        const cancelInvoiceReport = document.getElementById('cancelInvoiceReport');
        const generateInvoiceReport = document.getElementById('generateInvoiceReport');
        const tabs = document.querySelectorAll('.tab');

        // Eventos relacionados a transações
        if (userSelector) userSelector.addEventListener('change', changeUser);
        if (addTransactionBtn) addTransactionBtn.addEventListener('click', openTransactionModal);
        if (closeTransactionModal) closeTransactionModal.addEventListener('click', closeTransactionModalFunc);
        if (cancelTransaction) cancelTransaction.addEventListener('click', closeTransactionModalFunc);
        if (transactionForm) transactionForm.addEventListener('submit', saveTransaction);

        // Eventos relacionados a cartões
        if (addCardBtn) addCardBtn.addEventListener('click', openCardModal);
        if (closeCardModal) closeCardModal.addEventListener('click', closeCardModalFunc);
        if (cancelCard) cancelCard.addEventListener('click', closeCardModalFunc);
        if (cardForm) cardForm.addEventListener('submit', saveCard);

        // Eventos relacionados a usuários
        if (addUserBtn) addUserBtn.addEventListener('click', openUserModal);
        if (closeUserModal) closeUserModal.addEventListener('click', closeUserModalFunc);
        if (cancelUser) cancelUser.addEventListener('click', closeUserModalFunc);
        if (userForm) userForm.addEventListener('submit', saveUser);

        // Eventos relacionados a relatório de fatura
        if (generateInvoiceBtn) generateInvoiceBtn.addEventListener('click', openInvoiceReportModal);
        if (closeInvoiceReportModal) closeInvoiceReportModal.addEventListener('click', closeInvoiceReportModalFunc);
        if (cancelInvoiceReport) cancelInvoiceReport.addEventListener('click', closeInvoiceReportModalFunc);
        if (generateInvoiceReport) generateInvoiceReport.addEventListener('click', generateInvoiceReportFunc);

        // Eventos relacionados a abas
        if (tabs) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.getAttribute('data-tab');
                    openTab(tabId);
                });
            });
        }

        // Eventos relacionados a método de pagamento
        const paymentMethod = document.getElementById('transactionPaymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', handlePaymentMethodChange);
        }

        // Eventos relacionados a tipo de parcelamento
        const installmentTypeRadios = document.querySelectorAll('input[name="installmentType"]');
        if (installmentTypeRadios) {
            installmentTypeRadios.forEach(radio => {
                radio.addEventListener('change', handleInstallmentTypeChange);
            });
        }
    }

    // Funções de usuário
    function changeUser() {
        const userSelector = document.getElementById('userSelector');
        const userAvatar = document.getElementById('userAvatar');

        if (userSelector && userAvatar) {
            currentUser = userSelector.value;
            userAvatar.textContent = getUserAvatar(currentUser);
            updateDashboard();
            updateTransactionsTable();
        }
    }

    function getUserAvatar(userId) {
        const user = users.find(u => u.id === userId);
        return user ? user.avatar : 'U';
    }

    function getUserName(userId) {
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Usuário';
    }

    // Funções do dashboard
    function updateDashboard() {
        const incomeValue = document.getElementById('incomeValue');
        const expenseValue = document.getElementById('expenseValue');
        const balanceValue = document.getElementById('balanceValue');
        const user1Expense = document.getElementById('user1Expense');
        const user2Expense = document.getElementById('user2Expense');

        if (!incomeValue || !expenseValue || !balanceValue || !user1Expense || !user2Expense) {
            return;
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const income = transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'income' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        const expense = transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        const balance = income - expense;

        incomeValue.textContent = formatCurrency(income);
        expenseValue.textContent = formatCurrency(expense);
        balanceValue.textContent = formatCurrency(balance);

        // Atualizar cor do saldo
        if (balance >= 0) {
            balanceValue.style.color = 'var(--success)';
        } else {
            balanceValue.style.color = 'var(--danger)';
        }

        // Atualizar comparação de usuários
        const user1Expenses = transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' &&
                    t.user === 'user1' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        const user2Expenses = transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' &&
                    t.user === 'user2' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        user1Expense.textContent = formatCurrency(user1Expenses);
        user2Expense.textContent = formatCurrency(user2Expenses);
    }

    // Funções de transações
    function openTransactionModal(transactionId = null) {
        const transactionModal = document.getElementById('transactionModal');
        if (transactionModal) {
            transactionModal.style.display = 'flex';

            // Preencher o select de cartões
            populateCardSelect();

            // Preencher o select de usuários
            populateCardUserSelect();

            // Se for uma edição, preencher o formulário com os dados da transação
            if (transactionId) {
                const transaction = transactions.find(t => t.id === transactionId);
                if (transaction) {
                    editingTransactionId = transactionId;

                    // Preencher campos do formulário
                    document.getElementById('transactionType').value = transaction.type;
                    document.getElementById('transactionDescription').value = transaction.description;
                    document.getElementById('transactionCategory').value = transaction.category;
                    document.getElementById('transactionPaymentMethod').value = transaction.paymentMethod;
                    document.getElementById('transactionValue').value = transaction.value;
                    document.getElementById('transactionDate').value = transaction.date;
                    document.getElementById('transactionUser').value = transaction.user;

                    // Se for pagamento com cartão, preencher campos relacionados
                    if (transaction.paymentMethod === 'credit-card' && transaction.cardId) {
                        document.getElementById('transactionCard').value = transaction.cardId;
                        document.getElementById('transactionCardUser').value = transaction.cardUserId || transaction.user;

                        // Mostrar campos relacionados a cartão
                        document.getElementById('cardSelectionGroup').style.display = 'block';
                        document.getElementById('cardUserGroup').style.display = 'block';
                        document.getElementById('installmentTypeGroup').style.display = 'block';

                        // Se for parcelado, preencher campos de parcelamento
                        if (transaction.installment) {
                            document.querySelector('input[name="installmentType"][value="installment"]').checked = true;
                            document.getElementById('installmentsGroup').style.display = 'block';
                            document.getElementById('transactionInstallments').value = transaction.installment.total;
                        } else {
                            document.querySelector('input[name="installmentType"][value="full"]').checked = true;
                            document.getElementById('installmentsGroup').style.display = 'none';
                        }
                    } else {
                        // Esconder campos relacionados a cartão
                        document.getElementById('cardSelectionGroup').style.display = 'none';
                        document.getElementById('cardUserGroup').style.display = 'none';
                        document.getElementById('installmentTypeGroup').style.display = 'none';
                        document.getElementById('installmentsGroup').style.display = 'none';
                    }

                    // Alterar título do modal
                    document.querySelector('#transactionModal .modal-header h3').textContent = 'Editar Transação';
                }
            } else {
                editingTransactionId = null;
                // Resetar formulário
                document.getElementById('transactionForm').reset();
                document.getElementById('transactionDate').valueAsDate = new Date();

                // Esconder campos relacionados a cartão
                document.getElementById('cardSelectionGroup').style.display = 'none';
                document.getElementById('cardUserGroup').style.display = 'none';
                document.getElementById('installmentTypeGroup').style.display = 'none';
                document.getElementById('installmentsGroup').style.display = 'none';

                // Alterar título do modal
                document.querySelector('#transactionModal .modal-header h3').textContent = 'Adicionar Transação';
            }
        }
    }

    function closeTransactionModalFunc() {
        const transactionModal = document.getElementById('transactionModal');
        const transactionForm = document.getElementById('transactionForm');
        const dateInput = document.getElementById('transactionDate');

        if (transactionModal) {
            transactionModal.style.display = 'none';
        }

        if (transactionForm) {
            transactionForm.reset();

            // Resetar campos dependentes
            const cardSelectionGroup = document.getElementById('cardSelectionGroup');
            const cardUserGroup = document.getElementById('cardUserGroup');
            const installmentTypeGroup = document.getElementById('installmentTypeGroup');
            const installmentsGroup = document.getElementById('installmentsGroup');

            if (cardSelectionGroup) cardSelectionGroup.style.display = 'none';
            if (cardUserGroup) cardUserGroup.style.display = 'none';
            if (installmentTypeGroup) installmentTypeGroup.style.display = 'none';
            if (installmentsGroup) installmentsGroup.style.display = 'none';
        }

        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Resetar ID de edição
        editingTransactionId = null;
    }

    function handlePaymentMethodChange() {
        const paymentMethod = document.getElementById('transactionPaymentMethod');
        const cardSelectionGroup = document.getElementById('cardSelectionGroup');
        const cardUserGroup = document.getElementById('cardUserGroup');
        const installmentTypeGroup = document.getElementById('installmentTypeGroup');

        if (!paymentMethod) return;

        if (paymentMethod.value === 'credit-card') {
            if (cardSelectionGroup) cardSelectionGroup.style.display = 'block';
            if (cardUserGroup) cardUserGroup.style.display = 'block';
            if (installmentTypeGroup) installmentTypeGroup.style.display = 'block';
        } else {
            if (cardSelectionGroup) cardSelectionGroup.style.display = 'none';
            if (cardUserGroup) cardUserGroup.style.display = 'none';
            if (installmentTypeGroup) installmentTypeGroup.style.display = 'none';

            const installmentsGroup = document.getElementById('installmentsGroup');
            if (installmentsGroup) installmentsGroup.style.display = 'none';
        }
    }

    function handleInstallmentTypeChange() {
        const installmentType = document.querySelector('input[name="installmentType"]:checked');
        const installmentsGroup = document.getElementById('installmentsGroup');

        if (!installmentType || !installmentsGroup) return;

        if (installmentType.value === 'installment') {
            installmentsGroup.style.display = 'block';
        } else {
            installmentsGroup.style.display = 'none';
        }
    }

    function populateCardSelect() {
        const cardSelect = document.getElementById('transactionCard');

        if (!cardSelect) return;

        // Limpar opções existentes
        cardSelect.innerHTML = '<option value="">Selecione um cartão</option>';

        // Adicionar cartões
        if (cards && cards.length > 0) {
            cards.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = card.name;
                cardSelect.appendChild(option);
            });
        }
    }

    function populateCardUserSelect() {
        const userSelect = document.getElementById('transactionCardUser');

        if (!userSelect) return;

        // Limpar opções existentes
        userSelect.innerHTML = '<option value="">Selecione um usuário</option>';

        // Adicionar usuários
        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                userSelect.appendChild(option);
            });
        }
    }

    function saveTransaction(e) {
        e.preventDefault();

        // Obter elementos do formulário
        const transactionType = document.getElementById('transactionType');
        const transactionDescription = document.getElementById('transactionDescription');
        const transactionCategory = document.getElementById('transactionCategory');
        const transactionPaymentMethod = document.getElementById('transactionPaymentMethod');
        const transactionCard = document.getElementById('transactionCard');
        const transactionCardUser = document.getElementById('transactionCardUser');
        const transactionValue = document.getElementById('transactionValue');
        const transactionDate = document.getElementById('transactionDate');
        const transactionUser = document.getElementById('transactionUser');
        const installmentType = document.querySelector('input[name="installmentType"]:checked');
        const transactionInstallments = document.getElementById('transactionInstallments');

        // Validação de campos obrigatórios
        if (!transactionType || !transactionType.value) {
            showNotification('Selecione o tipo da transação.', 'error');
            return;
        }

        if (!transactionDescription || !transactionDescription.value) {
            showNotification('Informe a descrição da transação.', 'error');
            return;
        }

        if (!transactionCategory || !transactionCategory.value) {
            showNotification('Selecione a categoria da transação.', 'error');
            return;
        }

        if (!transactionPaymentMethod || !transactionPaymentMethod.value) {
            showNotification('Selecione o método de pagamento.', 'error');
            return;
        }

        if (!transactionValue || !transactionValue.value) {
            showNotification('Informe o valor da transação.', 'error');
            return;
        }

        if (!transactionDate || !transactionDate.value) {
            showNotification('Informe a data da transação.', 'error');
            return;
        }

        if (!transactionUser || !transactionUser.value) {
            showNotification('Selecione o usuário da transação.', 'error');
            return;
        }

        // Validação adicional para cartão de crédito
        if (transactionPaymentMethod.value === 'credit-card') {
            if (!transactionCard || !transactionCard.value) {
                showNotification('Selecione o cartão de crédito.', 'error');
                return;
            }
        }

        // Validação adicional para parcelamento
        if (transactionPaymentMethod.value === 'credit-card' &&
            installmentType && installmentType.value === 'installment') {
            if (!transactionInstallments || !transactionInstallments.value || transactionInstallments.value < 2) {
                showNotification('Informe a quantidade de parcelas (mínimo 2).', 'error');
                return;
            }
        }

        const baseTransaction = {
            type: transactionType.value,
            description: transactionDescription.value,
            category: transactionCategory.value,
            paymentMethod: transactionPaymentMethod.value,
            value: parseFloat(transactionValue.value),
            date: transactionDate.value,
            user: transactionUser.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Se for pagamento com cartão de crédito, adicionar informações do cartão
        if (transactionPaymentMethod.value === 'credit-card' && transactionCard && transactionCard.value) {
            baseTransaction.cardId = transactionCard.value;
            baseTransaction.cardUserId = transactionCardUser && transactionCardUser.value ? transactionCardUser.value : transactionUser.value;

            const card = cards.find(c => c.id === transactionCard.value);
            if (card) {
                baseTransaction.cardName = card.name;
            }
        }

        // Se for pagamento parcelado, criar as parcelas
        if (transactionPaymentMethod.value === 'credit-card' &&
            installmentType && installmentType.value === 'installment' &&
            transactionInstallments && transactionInstallments.value > 1) {

            const installmentsCount = parseInt(transactionInstallments.value);
            const installmentValue = baseTransaction.value / installmentsCount;

            // Encontrar o cartão para obter a data de fechamento
            const card = cards.find(c => c.id === transactionCard.value);

            if (card) {
                // Calcular as datas das parcelas com base na data de fechamento
                const transactionsToSave = [];

                for (let i = 1; i <= installmentsCount; i++) {
                    const installmentTransaction = { ...baseTransaction };
                    installmentTransaction.value = installmentValue;
                    installmentTransaction.installment = {
                        total: installmentsCount,
                        current: i,
                        description: `${i}/${installmentsCount}`
                    };
                    installmentTransaction.parentTransactionId = null; // Será atualizado depois

                    // Calcular a data da parcela
                    const transactionDateValue = document.getElementById('transactionDate').value;
                    const transactionDate = new Date(transactionDateValue);
                    const closingDay = card.closingDay || 10;

                    // Se a data da transação for após o dia de fechamento, a primeira parcela será no mês seguinte
                    if (transactionDate.getDate() > closingDay) {
                        transactionDate.setMonth(transactionDate.getMonth() + i);
                    } else {
                        transactionDate.setMonth(transactionDate.getMonth() + i - 1);
                    }

                    // Formatar a data como YYYY-MM-DD
                    installmentTransaction.date = transactionDate.toISOString().split('T')[0];

                    transactionsToSave.push(installmentTransaction);
                }

                // Se for uma edição, excluir as parcelas existentes primeiro
                if (editingTransactionId) {
                    // Encontrar todas as parcelas relacionadas
                    const parentTransaction = transactions.find(t => t.id === editingTransactionId);
                    const parentTransactionId = parentTransaction.parentTransactionId || editingTransactionId;

                    const relatedTransactions = transactions.filter(t =>
                        t.id === parentTransactionId || t.parentTransactionId === parentTransactionId
                    );

                    // Excluir todas as parcelas
                    const deletePromises = relatedTransactions.map(t =>
                        db.collection("transactions").doc(t.id).delete()
                    );

                    Promise.all(deletePromises)
                        .then(() => {
                            // Remover do array local
                            transactions = transactions.filter(t =>
                                !relatedTransactions.some(rt => rt.id === t.id)
                            );

                            // Salvar as novas parcelas
                            saveInstallments(transactionsToSave);
                        })
                        .catch(error => {
                            console.error("Erro ao excluir transações parceladas: ", error);
                            showNotification('Erro ao editar transação. Tente novamente.', 'error');
                        });
                } else {
                    // Salvar todas as parcelas
                    saveInstallments(transactionsToSave);
                }
            } else {
                showNotification('Cartão não encontrado. Tente novamente.', 'error');
            }
        } else {
            // Se for uma edição, atualizar a transação existente
            if (editingTransactionId) {
                db.collection("transactions").doc(editingTransactionId).update(baseTransaction)
                    .then(() => {
                        // Atualizar no array local
                        const index = transactions.findIndex(t => t.id === editingTransactionId);
                        if (index !== -1) {
                            transactions[index] = { ...transactions[index], ...baseTransaction };
                        }

                        updateDashboard();
                        updateTransactionsTable();
                        updateCards();
                        closeTransactionModalFunc();
                        showNotification('Transação atualizada com sucesso!', 'success');
                    })
                    .catch((error) => {
                        console.error("Erro ao atualizar transação: ", error);
                        showNotification('Erro ao atualizar transação. Tente novamente.', 'error');
                    });
            } else {
                // Salvar transação única
                saveSingleTransaction(baseTransaction);
            }
        }
    }

    function saveSingleTransaction(transaction) {
        db.collection("transactions").add(transaction)
            .then((docRef) => {
                // Adicionar ID gerado pelo Firestore
                transaction.id = docRef.id;

                // Adicionar ao array local
                transactions.push(transaction);

                updateDashboard();
                updateTransactionsTable();
                updateCards();
                closeTransactionModalFunc();
                showNotification('Transação adicionada com sucesso!', 'success');
            })
            .catch((error) => {
                console.error("Erro ao adicionar transação: ", error);
                showNotification('Erro ao adicionar transação. Tente novamente.', 'error');
            });
    }

    function saveInstallments(transactionsToSave) {
        // Salvar a primeira transação para obter o ID pai
        db.collection("transactions").add(transactionsToSave[0])
            .then((docRef) => {
                const parentTransactionId = docRef.id;
                transactionsToSave[0].id = parentTransactionId;

                // Atualizar as demais transações com o ID pai
                const promises = [];

                for (let i = 1; i < transactionsToSave.length; i++) {
                    transactionsToSave[i].parentTransactionId = parentTransactionId;

                    const promise = db.collection("transactions").add(transactionsToSave[i])
                        .then((childDocRef) => {
                            transactionsToSave[i].id = childDocRef.id;
                            return childDocRef;
                        });

                    promises.push(promise);
                }

                // Adicionar todas as transações ao array local
                transactions.push(...transactionsToSave);

                // Esperar todas as transações serem salvas
                return Promise.all(promises);
            })
            .then(() => {
                updateDashboard();
                updateTransactionsTable();
                updateCards();
                closeTransactionModalFunc();
                showNotification(`Transação parcelada em ${transactionsToSave.length}x adicionada com sucesso!`, 'success');
            })
            .catch((error) => {
                console.error("Erro ao adicionar transações parceladas: ", error);
                showNotification('Erro ao adicionar transações parceladas. Tente novamente.', 'error');
            });
    }

    function updateTransactionsTable() {
        const allTableBody = document.getElementById('transactionsTableBody');
        const incomeTableBody = document.getElementById('incomeTableBody');
        const expenseTableBody = document.getElementById('expenseTableBody');
        const allLoading = document.getElementById('allLoading');
        const incomeLoading = document.getElementById('incomeLoading');
        const expenseLoading = document.getElementById('expenseLoading');
        const allTable = document.getElementById('allTable');
        const incomeTable = document.getElementById('incomeTable');
        const expenseTable = document.getElementById('expenseTable');

        if (!allTableBody || !incomeTableBody || !expenseTableBody ||
            !allLoading || !incomeLoading || !expenseLoading ||
            !allTable || !incomeTable || !expenseTable) {
            return;
        }

        // Limpar tabelas
        allTableBody.innerHTML = '';
        incomeTableBody.innerHTML = '';
        expenseTableBody.innerHTML = '';

        // Ordenar transações por data (mais recentes primeiro)
        const sortedTransactions = [...transactions].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        // Verificar se há transações
        if (sortedTransactions.length === 0) {
            allTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhuma transação encontrada</td></tr>';
            incomeTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhuma receita encontrada</td></tr>';
            expenseTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhuma despesa encontrada</td></tr>';

            // Esconder loading e mostrar tabelas
            if (allLoading) allLoading.style.display = 'none';
            if (incomeLoading) incomeLoading.style.display = 'none';
            if (expenseLoading) expenseLoading.style.display = 'none';
            if (allTable) allTable.style.display = 'table';
            if (incomeTable) incomeTable.style.display = 'table';
            if (expenseTable) expenseTable.style.display = 'table';

            return;
        }

        // Preencher tabelas
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');

            const typeClass = transaction.type === 'income' ? 'type-income' : 'type-expense';
            const userText = getUserName(transaction.user);

            // Informações do cartão
            let cardText = '-';
            if (transaction.cardName) {
                cardText = transaction.cardName;
            }

            // Informações das parcelas
            let installmentText = '-';
            if (transaction.installment) {
                installmentText = `Parcela ${transaction.installment.description}`;
            }

            row.innerHTML = `
                <td>${transaction.description}</td>
                <td>${getCategoryName(transaction.category)}</td>
                <td>${formatDate(transaction.date)}</td>
                <td class="${typeClass}">${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.value)}</td>
                <td>${userText}</td>
                <td>${cardText}</td>
                <td>${installmentText}</td>
                <td>
                    <button class="btn-icon btn-editTrans" onclick="editTransaction('${transaction.id}')">
                       <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-deleteTrans" onclick="deleteTransaction('${transaction.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            // Adicionar à tabela "Todas"
            allTableBody.appendChild(row.cloneNode(true));

            // Adicionar à tabela específica
            if (transaction.type === 'income') {
                incomeTableBody.appendChild(row.cloneNode(true));
            } else {
                expenseTableBody.appendChild(row.cloneNode(true));
            }
        });

        // Esconder loading e mostrar tabelas
        if (allLoading) allLoading.style.display = 'none';
        if (incomeLoading) incomeLoading.style.display = 'none';
        if (expenseLoading) expenseLoading.style.display = 'none';
        if (allTable) allTable.style.display = 'table';
        if (incomeTable) incomeTable.style.display = 'table';
        if (expenseTable) expenseTable.style.display = 'table';
    }

    // Funções de cartões
    function openCardModal(cardId = null) {
        const cardModal = document.getElementById('cardModal');
        if (cardModal) {
            cardModal.style.display = 'flex';

            // Se for uma edição, preencher o formulário com os dados do cartão
            if (cardId) {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    editingCardId = cardId;

                    // Preencher campos do formulário
                    document.getElementById('cardName').value = card.name;
                    document.getElementById('cardLimit').value = card.limit;
                    document.getElementById('cardClosingDay').value = card.closingDay;
                    document.getElementById('cardDueDate').value = card.dueDate;

                    // Alterar título do modal
                    document.querySelector('#cardModal .modal-header h3').textContent = 'Editar Cartão';
                }
            } else {
                editingCardId = null;
                // Resetar formulário
                document.getElementById('cardForm').reset();

                // Alterar título do modal
                document.querySelector('#cardModal .modal-header h3').textContent = 'Adicionar Cartão';
            }
        }
    }

    function closeCardModalFunc() {
        const cardModal = document.getElementById('cardModal');
        const cardForm = document.getElementById('cardForm');

        if (cardModal) {
            cardModal.style.display = 'none';
        }

        if (cardForm) {
            cardForm.reset();
        }

        // Resetar ID de edição
        editingCardId = null;
    }

    function saveCard(e) {
        e.preventDefault();

        const cardName = document.getElementById('cardName');
        const cardLimit = document.getElementById('cardLimit');
        const cardClosingDay = document.getElementById('cardClosingDay');
        const cardDueDate = document.getElementById('cardDueDate');

        if (!cardName || !cardName.value) {
            showNotification('Informe o nome do cartão.', 'error');
            return;
        }

        if (!cardLimit || !cardLimit.value) {
            showNotification('Informe o limite do cartão.', 'error');
            return;
        }

        if (!cardClosingDay || !cardClosingDay.value) {
            showNotification('Informe o dia de fechamento.', 'error');
            return;
        }

        if (!cardDueDate || !cardDueDate.value) {
            showNotification('Informe o dia de vencimento.', 'error');
            return;
        }

        const card = {
            name: cardName.value,
            limit: parseFloat(cardLimit.value),
            closingDay: parseInt(cardClosingDay.value),
            dueDate: parseInt(cardDueDate.value),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Se for uma edição, atualizar o cartão existente
        if (editingCardId) {
            db.collection("cards").doc(editingCardId).update(card)
                .then(() => {
                    // Atualizar no array local
                    const index = cards.findIndex(c => c.id === editingCardId);
                    if (index !== -1) {
                        cards[index] = { ...cards[index], ...card };
                    }

                    updateCards();
                    closeCardModalFunc();
                    showNotification('Cartão atualizado com sucesso!', 'success');
                })
                .catch((error) => {
                    console.error("Erro ao atualizar cartão: ", error);
                    showNotification('Erro ao atualizar cartão. Tente novamente.', 'error');
                });
        } else {
            // Adicionar cartão ao Firestore
            db.collection("cards").add(card)
                .then((docRef) => {
                    // Adicionar ID gerado pelo Firestore
                    card.id = docRef.id;

                    // Adicionar ao array local
                    cards.push(card);

                    updateCards();
                    closeCardModalFunc();
                    showNotification('Cartão adicionado com sucesso!', 'success');
                })
                .catch((error) => {
                    console.error("Erro ao adicionar cartão: ", error);
                    showNotification('Erro ao adicionar cartão. Tente novamente.', 'error');
                });
        }
    }

    function updateCards() {
        const cardsGrid = document.getElementById('cardsGrid');
        const cardsLoading = document.getElementById('cardsLoading');

        if (!cardsGrid || !cardsLoading) {
            return;
        }

        cardsGrid.innerHTML = '';

        if (cards.length === 0) {
            cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhum cartão cadastrado</p>';

            // Esconder loading e mostrar grid
            cardsLoading.style.display = 'none';
            cardsGrid.style.display = 'grid';

            return;
        }

        // Calcular o valor total das transações no cartão para o mês atual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        cards.forEach(card => {
            // Calcular o valor das transações no cartão para o mês atual
            const cardTransactions = transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return t.cardId === card.id &&
                    t.type === 'expense' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            });

            const cardSpent = cardTransactions.reduce((sum, t) => sum + t.value, 0);
            const availableLimit = card.limit - cardSpent;
            const usagePercentage = cardSpent > 0 ? (cardSpent / card.limit) * 100 : 0;
            const cardElement = document.createElement('div');
            cardElement.className = 'credit-card';
            cardElement.innerHTML = `
                <div class="card-header">
                <div class="card-name">${card.name}</div>
                <div class="card-actions">
                    <button class="btn-icon btn-editcard" onclick="editCard('${card.id}')">
                    <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-deletecard" onclick="deleteCard('${card.id}')">
                    <i class="fas fa-trash"></i>
                    </button>
                </div>
                </div>
                <div class="card-details">
                <div>
                     <div class="card-limit">Limite disponível</div>
                        <div class="card-limit-value">${formatCurrency(availableLimit)}</div>
                    </div>
                    <div>
                        <div class="card-limit">Fatura atual</div>
                        <div class="card-limit-value">${formatCurrency(cardSpent)}</div>
                    </div>
                </div>
                <div class="progress-bar">
                <div class="progress" style="width: ${usagePercentage}%"></div>
                </div>
                <div class="card-limit">Limite: ${formatCurrency(card.limit)} <br> Melhor dia: ${card.closingDay} <br> Vencimento: ${card.dueDate}</div> `;

            cardsGrid.appendChild(cardElement);
        });

        // Esconder loading e mostrar grid
        cardsLoading.style.display = 'none';
        cardsGrid.style.display = 'grid';
    }

    // Funções de usuários
    function openUserModal(userId = null) {
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.style.display = 'flex';

            // Se for uma edição, preencher o formulário com os dados do usuário
            if (userId) {
                const user = users.find(u => u.id === userId);
                if (user) {
                    editingUserId = userId;

                    // Preencher campos do formulário
                    document.getElementById('userName').value = user.name;
                    document.getElementById('userEmail').value = user.email || '';
                    document.getElementById('userAvatar').value = user.avatar;

                    // Alterar título do modal
                    document.querySelector('#userModal .modal-header h3').textContent = 'Editar Usuário';
                }
            } else {
                editingUserId = null;
                // Resetar formulário
                document.getElementById('userForm').reset();

                // Alterar título do modal
                document.querySelector('#userModal .modal-header h3').textContent = 'Adicionar Usuário';
            }
        }
    }

    function closeUserModalFunc() {
        const userModal = document.getElementById('userModal');
        const userForm = document.getElementById('userForm');

        if (userModal) {
            userModal.style.display = 'none';
        }

        if (userForm) {
            userForm.reset();
        }

        // Resetar ID de edição
        editingUserId = null;
    }

    function saveUser(e) {
        e.preventDefault();

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (!userName || !userName.value) {
            showNotification('Informe o nome do usuário.', 'error');
            return;
        }

        if (!userAvatar || !userAvatar.value) {
            showNotification('Informe as iniciais do nome.', 'error');
            return;
        }

        const user = {
            name: userName.value,
            email: userEmail && userEmail.value ? userEmail.value : '',
            avatar: userAvatar.value.toUpperCase(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Se for uma edição, atualizar o usuário existente
        if (editingUserId) {
            db.collection("users").doc(editingUserId).update(user)
                .then(() => {
                    // Atualizar no array local
                    const index = users.findIndex(u => u.id === editingUserId);
                    if (index !== -1) {
                        users[index] = { ...users[index], ...user };
                    }

                    // Atualizar o seletor de usuário no cabeçalho
                    updateUserSelector();

                    updateUsers();
                    closeUserModalFunc();
                    showNotification('Usuário atualizado com sucesso!', 'success');
                })
                .catch((error) => {
                    console.error("Erro ao atualizar usuário: ", error);
                    showNotification('Erro ao atualizar usuário. Tente novamente.', 'error');
                });
        } else {
            // Adicionar usuário ao Firestore
            db.collection("users").add(user)
                .then((docRef) => {
                    // Adicionar ID gerado pelo Firestore
                    user.id = docRef.id;

                    // Adicionar ao array local
                    users.push(user);

                    // Atualizar o seletor de usuário no cabeçalho
                    updateUserSelector();

                    updateUsers();
                    closeUserModalFunc();
                    showNotification('Usuário adicionado com sucesso!', 'success');
                })
                .catch((error) => {
                    console.error("Erro ao adicionar usuário: ", error);
                    showNotification('Erro ao adicionar usuário. Tente novamente.', 'error');
                });
        }
    }

    function updateUserSelector() {
        const userSelector = document.getElementById('userSelector');

        if (!userSelector) return;

        // Limpar opções existentes
        userSelector.innerHTML = '';

        // Adicionar usuários
        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                userSelector.appendChild(option);
            });
        }
    }

    function updateUsers() {
        const usersGrid = document.getElementById('usersGrid');
        const usersLoading = document.getElementById('usersLoading');

        if (!usersGrid || !usersLoading) {
            return;
        }

        usersGrid.innerHTML = '';

        if (users.length === 0) {
            usersGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhum usuário cadastrado</p>';

            // Esconder loading e mostrar grid
            usersLoading.style.display = 'none';
            usersGrid.style.display = 'grid';

            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-card';
            userElement.innerHTML = `
                <div class="user-card-header">
                    <div class="user-avatar">${user.avatar}</div>
                    <div class="user-card-name">${user.name}</div>
                </div>
                <div class="card-description">${user.email || 'E-mail não informado'}</div>
                <div class="card-actions">
                    <button class="btn-icon btn-edituser" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-deleteuser" onclick="deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            usersGrid.appendChild(userElement);
        });

        // Esconder loading e mostrar grid
        usersLoading.style.display = 'none';
        usersGrid.style.display = 'grid';
    }

    // Funções de relatório de fatura
    function openInvoiceReportModal() {
        const invoiceReportModal = document.getElementById('invoiceReportModal');
        const reportCard = document.getElementById('reportCard');
        const reportYear = document.getElementById('reportYear');

        if (!invoiceReportModal || !reportCard || !reportYear) {
            return;
        }

        // Preencher o select de cartões
        reportCard.innerHTML = '<option value="">Selecione um cartão</option>';
        if (cards && cards.length > 0) {
            cards.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = card.name;
                reportCard.appendChild(option);
            });
        }

        // Preencher o select de anos
        const currentYear = new Date().getFullYear();
        reportYear.innerHTML = '';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            reportYear.appendChild(option);
        }

        // Definir o mês atual
        const reportMonth = document.getElementById('reportMonth');
        if (reportMonth) {
            reportMonth.value = new Date().getMonth();
        }

        invoiceReportModal.style.display = 'flex';
    }

    function closeInvoiceReportModalFunc() {
        const invoiceReportModal = document.getElementById('invoiceReportModal');
        const invoiceReportContent = document.getElementById('invoiceReportContent');

        if (invoiceReportModal) {
            invoiceReportModal.style.display = 'none';
        }

        if (invoiceReportContent) {
            invoiceReportContent.style.display = 'none';
            invoiceReportContent.innerHTML = '';
        }
    }

    function generateInvoiceReportFunc() {
        const reportCard = document.getElementById('reportCard');
        const reportMonth = document.getElementById('reportMonth');
        const reportYear = document.getElementById('reportYear');
        const invoiceReportContent = document.getElementById('invoiceReportContent');

        if (!reportCard || !reportMonth || !reportYear || !invoiceReportContent) {
            return;
        }

        const cardId = reportCard.value;
        const month = parseInt(reportMonth.value);
        const year = parseInt(reportYear.value);

        if (!cardId) {
            showNotification('Selecione um cartão para gerar o relatório.', 'error');
            return;
        }

        // Encontrar o cartão
        const card = cards.find(c => c.id === cardId);
        if (!card) {
            showNotification('Cartão não encontrado.', 'error');
            return;
        }

        // Filtrar transações do cartão no mês/ano selecionado
        const cardTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return t.cardId === cardId &&
                transactionDate.getMonth() === month &&
                transactionDate.getFullYear() === year;
        });

        // Agrupar transações por usuário
        const userTransactions = {};
        let totalAmount = 0;

        cardTransactions.forEach(transaction => {
            const userId = transaction.cardUserId || transaction.user;

            if (!userTransactions[userId]) {
                userTransactions[userId] = {
                    user: getUserName(userId),
                    transactions: [],
                    total: 0
                };
            }

            userTransactions[userId].transactions.push(transaction);
            userTransactions[userId].total += transaction.value;
            totalAmount += transaction.value;
        });

        // Gerar HTML do relatório
        let reportHTML = `
            <h4>Fatura do cartão ${card.name} - ${getMonthName(month)} de ${year}</h4>
            <table class="invoice-report-table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Parcelas</th>
                        <th>Usuário</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Adicionar transações
        cardTransactions.forEach(transaction => {
            const userText = getUserName(transaction.cardUserId || transaction.user);
            let installmentText = '-';

            if (transaction.installment) {
                installmentText = `Parcela ${transaction.installment.description}`;
            }

            reportHTML += `
                <tr>
                    <td>${transaction.description}</td>
                    <td>${formatDate(transaction.date)}</td>
                    <td>${formatCurrency(transaction.value)}</td>
                    <td>${installmentText}</td>
                    <td>${userText}</td>
                </tr>
            `;
        });

        reportHTML += `
                </tbody>
                <tfoot>
                    <tr class="invoice-report-total">
                        <td colspan="2"><strong>Total</strong></td>
                        <td><strong>${formatCurrency(totalAmount)}</strong></td>
                        <td colspan="2"></td>
                    </tr>
                </tfoot>
            </table>
            
            <h5>Resumo por usuário</h5>
            <table class="invoice-report-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Valor a pagar</th>
                        <th>Percentual</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Adicionar resumo por usuário
        Object.keys(userTransactions).forEach(userId => {
            const userTransaction = userTransactions[userId];
            const percentage = totalAmount > 0 ? (userTransaction.total / totalAmount * 100).toFixed(2) : 0;

            reportHTML += `
                <tr>
                    <td>${userTransaction.user}</td>
                    <td>${formatCurrency(userTransaction.total)}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });

        reportHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-success" id="printReportBtn">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </div>
        `;

        // Exibir o relatório
        invoiceReportContent.innerHTML = reportHTML;
        invoiceReportContent.style.display = 'block';

        // Adicionar evento ao botão de impressão
        const printReportBtn = document.getElementById('printReportBtn');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', function () {
                window.print();
            });
        }
    }

    function getMonthName(monthIndex) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return months[monthIndex];
    }

    // Funções de abas
    function openTab(tabId) {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        if (!tabs || !tabContents) {
            return;
        }

        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        tabContents.forEach(content => {
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    // Funções utilitárias
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    function getCategoryName(category) {
        const categories = {
            'food': 'Alimentação',
            'transport': 'Transporte',
            'shopping': 'Compras',
            'bills': 'Contas',
            'entertainment': 'Entretenimento',
            'health': 'Saúde',
            'education': 'Educação',
            'salary': 'Salário',
            'investments': 'Investimentos',
            'other': 'Outros'
        };

        return categories[category] || category;
    }

    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');

        if (!notification || !notificationMessage) {
            return;
        }

        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Funções do Firebase
    function loadFromFirebase() {
        // Carregar transações
        db.collection("transactions").orderBy("createdAt", "desc").get()
            .then((querySnapshot) => {
                transactions = [];
                querySnapshot.forEach((doc) => {
                    const transaction = doc.data();
                    transaction.id = doc.id;
                    transactions.push(transaction);
                });

                // Carregar cartões
                return db.collection("cards").get();
            })
            .then((querySnapshot) => {
                cards = [];
                querySnapshot.forEach((doc) => {
                    const card = doc.data();
                    card.id = doc.id;
                    cards.push(card);
                });

                // Carregar usuários
                return db.collection("users").get();
            })
            .then((querySnapshot) => {
                users = [];
                querySnapshot.forEach((doc) => {
                    const user = doc.data();
                    user.id = doc.id;
                    users.push(user);
                });

                // Se não houver usuários, adicionar usuários padrão
                if (users.length === 0) {
                    const defaultUsers = [
                        { name: 'Noldenval', avatar: 'N', email: 'noldenval@example.com', admin: false, ativo: true, senha: '', tipo: 'padrao' },
                        { name: 'Eliane', avatar: 'E', email: 'eliane@example.com', admin: false, ativo: true, senha: '', tipo: 'padrao' },
                        { name: 'Convidado', avatar: 'C', email: 'convidado@example.com', admin: false, ativo: true, senha: '', tipo: 'convidado' }
                    ];

                    const promises = defaultUsers.map(user => 
                        db.collection("users").add(user)
                    );

                    return Promise.all(promises)
                        .then((docRefs) => {
                            // Adicionar os usuários ao array local com os IDs gerados
                            docRefs.forEach((docRef, index) => {
                                const userWithId = { ...defaultUsers[index], id: docRef.id };
                                users.push(userWithId);
                            });
                            return users;
                        });
                }
                return users;
            })
            .then((users) => {
                // Atualizar o seletor de usuário no cabeçalho
                updateUserSelector();

                // Atualizar interface
                updateDashboard();
                updateTransactionsTable();
                updateCards();
                updateUsers();
            })
            .catch((error) => {
                console.error("Erro ao carregar dados do Firebase: ", error);
                showNotification('Erro ao carregar dados. Tente novamente.', 'error');
            });
    }

    // Funções de edição e exclusão globais para serem chamadas pelos botões
    window.editTransaction = function (transactionId) {
        openTransactionModal(transactionId);
    };

    window.editCard = function (cardId) {
        openCardModal(cardId);
    };

    window.editUser = function (userId) {
        openUserModal(userId);
    };

    window.deleteTransaction = function (transactionId) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            // Verificar se é uma transação parcelada
            const transaction = transactions.find(t => t.id === transactionId);
            if (transaction) {
                const parentTransactionId = transaction.parentTransactionId || transactionId;

                // Encontrar todas as parcelas relacionadas
                const relatedTransactions = transactions.filter(t =>
                    t.id === parentTransactionId || t.parentTransactionId === parentTransactionId
                );

                // Excluir todas as parcelas
                const deletePromises = relatedTransactions.map(t =>
                    db.collection("transactions").doc(t.id).delete()
                );

                Promise.all(deletePromises)
                    .then(() => {
                        // Remover do array local
                        transactions = transactions.filter(t =>
                            !relatedTransactions.some(rt => rt.id === t.id)
                        );

                        updateDashboard();
                        updateTransactionsTable();
                        updateCards();
                        showNotification('Transação excluída com sucesso!', 'success');
                    })
                    .catch(error => {
                        console.error("Erro ao excluir transação: ", error);
                        showNotification('Erro ao excluir transação. Tente novamente.', 'error');
                    });
            }
        }
    };

    window.deleteCard = function (cardId) {
        if (confirm('Tem certeza que deseja excluir este cartão? Todas as transações associadas também serão excluídas.')) {
            // Verificar se existem transações associadas a este cartão
            const cardTransactions = transactions.filter(t => t.cardId === cardId);

            if (cardTransactions.length > 0) {
                // Excluir todas as transações associadas
                const deleteTransactionPromises = cardTransactions.map(t =>
                    db.collection("transactions").doc(t.id).delete()
                );

                Promise.all(deleteTransactionPromises)
                    .then(() => {
                        // Excluir o cartão
                        return db.collection("cards").doc(cardId).delete();
                    })
                    .then(() => {
                        // Remover do array local
                        cards = cards.filter(c => c.id !== cardId);
                        transactions = transactions.filter(t => t.cardId !== cardId);

                        updateDashboard();
                        updateTransactionsTable();
                        updateCards();
                        showNotification('Cartão e transações associadas excluídos com sucesso!', 'success');
                    })
                    .catch(error => {
                        console.error("Erro ao excluir cartão: ", error);
                        showNotification('Erro ao excluir cartão. Tente novamente.', 'error');
                    });
            } else {
                // Excluir apenas o cartão
                db.collection("cards").doc(cardId).delete()
                    .then(() => {
                        // Remover do array local
                        cards = cards.filter(c => c.id !== cardId);

                        updateCards();
                        showNotification('Cartão excluído com sucesso!', 'success');
                    })
                    .catch(error => {
                        console.error("Erro ao excluir cartão: ", error);
                        showNotification('Erro ao excluir cartão. Tente novamente.', 'error');
                    });
            }
        }
    };

    window.deleteUser = function (userId) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            db.collection("users").doc(userId).delete()
                .then(() => {
                    // Remover do array local
                    users = users.filter(u => u.id !== userId);

                    // Atualizar o seletor de usuário no cabeçalho
                    updateUserSelector();

                    updateUsers();
                    showNotification('Usuário excluído com sucesso!', 'success');
                })
                .catch(error => {
                    console.error("Erro ao excluir usuário: ", error);
                    showNotification('Erro ao excluir usuário. Tente novamente.', 'error');
                });
        }
    };
});

