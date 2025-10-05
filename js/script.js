// Classe principal do aplicativo
class FinanFacil {
    constructor() {
        this.db = window.db;
        this.transactions = [];
        this.cards = [];
        this.users = [];
        this.currentUser = 'user1';
        this.editingTransactionId = null;
        this.editingCardId = null;
        this.editingUserId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFromFirebase();
        this.setupDefaultUsers();
        
        // Definir data atual como padrão
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Preencher anos no relatório
        this.populateReportYears();
    }

    setupEventListeners() {
        // Eventos de transações
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        const closeTransactionModal = document.getElementById('closeTransactionModal');
        const cancelTransaction = document.getElementById('cancelTransaction');
        const transactionForm = document.getElementById('transactionForm');
        const transactionPaymentMethod = document.getElementById('transactionPaymentMethod');
        const installmentTypeRadios = document.querySelectorAll('input[name="installmentType"]');

        if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => this.openTransactionModal());
        if (closeTransactionModal) closeTransactionModal.addEventListener('click', () => this.closeTransactionModal());
        if (cancelTransaction) cancelTransaction.addEventListener('click', () => this.closeTransactionModal());
        if (transactionForm) transactionForm.addEventListener('submit', (e) => this.saveTransaction(e));
        if (transactionPaymentMethod) transactionPaymentMethod.addEventListener('change', () => this.handlePaymentMethodChange());
        
        installmentTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.handleInstallmentTypeChange());
        });

        // Eventos de cartões
        const addCardBtn = document.getElementById('addCardBtn');
        const closeCardModal = document.getElementById('closeCardModal');
        const cancelCard = document.getElementById('cancelCard');
        const cardForm = document.getElementById('cardForm');

        if (addCardBtn) addCardBtn.addEventListener('click', () => this.openCardModal());
        if (closeCardModal) closeCardModal.addEventListener('click', () => this.closeCardModal());
        if (cancelCard) cancelCard.addEventListener('click', () => this.closeCardModal());
        if (cardForm) cardForm.addEventListener('submit', (e) => this.saveCard(e));

        // Eventos de usuários
        const addUserBtn = document.getElementById('addUserBtn');
        const closeUserModal = document.getElementById('closeUserModal');
        const cancelUser = document.getElementById('cancelUser');
        const userForm = document.getElementById('userForm');

        if (addUserBtn) addUserBtn.addEventListener('click', () => this.openUserModal());
        if (closeUserModal) closeUserModal.addEventListener('click', () => this.closeUserModal());
        if (cancelUser) cancelUser.addEventListener('click', () => this.closeUserModal());
        if (userForm) userForm.addEventListener('submit', (e) => this.saveUser(e));

        // Eventos de relatório
        const generateInvoiceBtn = document.getElementById('generateInvoiceBtn');
        const closeInvoiceReportModal = document.getElementById('closeInvoiceReportModal');
        const cancelInvoiceReport = document.getElementById('cancelInvoiceReport');
        const generateInvoiceReport = document.getElementById('generateInvoiceReport');

        if (generateInvoiceBtn) generateInvoiceBtn.addEventListener('click', () => this.openInvoiceReportModal());
        if (closeInvoiceReportModal) closeInvoiceReportModal.addEventListener('click', () => this.closeInvoiceReportModal());
        if (cancelInvoiceReport) cancelInvoiceReport.addEventListener('click', () => this.closeInvoiceReportModal());
        if (generateInvoiceReport) generateInvoiceReport.addEventListener('click', () => this.generateInvoiceReport());

        // Eventos de abas
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.openTab(tabId);
            });
        });

        // Evento de usuário
        const userSelector = document.getElementById('userSelector');
        if (userSelector) userSelector.addEventListener('change', (e) => this.changeUser(e));
    }

    setupDefaultUsers() {
        // Verificar se já existem usuários
        this.db.collection('users').get().then(snapshot => {
            if (snapshot.empty) {
                // Criar usuários padrão
                const defaultUsers = [
                    { name: 'Noldenval', email: '', avatar: 'N', createdAt: firebase.firestore.FieldValue.serverTimestamp() },
                    { name: 'Eliane', email: '', avatar: 'E', createdAt: firebase.firestore.FieldValue.serverTimestamp() }
                ];

                defaultUsers.forEach(user => {
                    this.db.collection('users').add(user);
                });
            }
        });
    }

    async loadFromFirebase() {
        try {
            // Carregar transações
            const transactionsSnapshot = await this.db.collection('transactions')
                .orderBy('createdAt', 'desc')
                .get();
            
            this.transactions = [];
            transactionsSnapshot.forEach(doc => {
                const transaction = doc.data();
                transaction.id = doc.id;
                this.transactions.push(transaction);
            });

            // Carregar cartões
            const cardsSnapshot = await this.db.collection('cards').get();
            this.cards = [];
            cardsSnapshot.forEach(doc => {
                const card = doc.data();
                card.id = doc.id;
                this.cards.push(card);
            });

            // Carregar usuários
            const usersSnapshot = await this.db.collection('users').get();
            this.users = [];
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                user.id = doc.id;
                this.users.push(user);
            });

            // Atualizar interfaces
            this.updateDashboard();
            this.updateTransactionsTable();
            this.updateCards();
            this.updateUsers();
            this.populateUserSelector();
            this.populateCardSelects();

        } catch (error) {
            console.error('Erro ao carregar dados do Firebase:', error);
            this.showNotification('Erro ao carregar dados', 'error');
        }
    }

    // Métodos de Dashboard
    updateDashboard() {
        const incomeValue = document.getElementById('incomeValue');
        const expenseValue = document.getElementById('expenseValue');
        const balanceValue = document.getElementById('balanceValue');

        if (!incomeValue || !expenseValue || !balanceValue) return;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const income = this.transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'income' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        const expense = this.transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.value, 0);

        const balance = income - expense;

        incomeValue.textContent = this.formatCurrency(income);
        expenseValue.textContent = this.formatCurrency(expense);
        balanceValue.textContent = this.formatCurrency(balance);

        // Atualizar cor do saldo
        balanceValue.className = `card-value balance ${balance >= 0 ? 'income' : 'expense'}`;
    }

    // Métodos de Transações
    openTransactionModal(transactionId = null) {
        const modal = document.getElementById('transactionModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('show');

        // Preencher selects
        this.populateCardSelect();
        this.populateCardUserSelect();

        if (transactionId) {
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (transaction) {
                this.editingTransactionId = transactionId;
                this.fillTransactionForm(transaction);
                document.querySelector('#transactionModal .modal-title').textContent = 'Editar Transação';
            }
        } else {
            this.editingTransactionId = null;
            this.clearTransactionForm();
            document.querySelector('#transactionModal .modal-title').textContent = 'Nova Transação';
        }
    }

    closeTransactionModal() {
        const modal = document.getElementById('transactionModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        this.clearTransactionForm();
        this.editingTransactionId = null;
    }

    clearTransactionForm() {
        const form = document.getElementById('transactionForm');
        if (form) form.reset();
        
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) dateInput.valueAsDate = new Date();

        // Esconder campos condicionais
        this.hideConditionalFields();
    }

    fillTransactionForm(transaction) {
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionCategory').value = transaction.category;
        document.getElementById('transactionPaymentMethod').value = transaction.paymentMethod;
        document.getElementById('transactionValue').value = transaction.value;
        document.getElementById('transactionDate').value = transaction.date;
        document.getElementById('transactionUser').value = transaction.user;

        // Mostrar/esconder campos condicionais
        this.handlePaymentMethodChange();

        if (transaction.paymentMethod === 'credit-card' && transaction.cardId) {
            document.getElementById('transactionCard').value = transaction.cardId;
            if (transaction.cardUserId) {
                document.getElementById('transactionCardUser').value = transaction.cardUserId;
            }
            if (transaction.installment) {
                document.querySelector('input[name="installmentType"][value="installment"]').checked = true;
                document.getElementById('transactionInstallments').value = transaction.installment.total;
                this.handleInstallmentTypeChange();
            }
        }
    }

    handlePaymentMethodChange() {
        const paymentMethod = document.getElementById('transactionPaymentMethod');
        const cardSelectionGroup = document.getElementById('cardSelectionGroup');
        const cardUserGroup = document.getElementById('cardUserGroup');
        const installmentTypeGroup = document.getElementById('installmentTypeGroup');

        if (paymentMethod.value === 'credit-card') {
            if (cardSelectionGroup) cardSelectionGroup.style.display = 'block';
            if (cardUserGroup) cardUserGroup.style.display = 'block';
            if (installmentTypeGroup) installmentTypeGroup.style.display = 'block';
        } else {
            this.hideConditionalFields();
        }
    }

    handleInstallmentTypeChange() {
        const installmentType = document.querySelector('input[name="installmentType"]:checked');
        const installmentsGroup = document.getElementById('installmentsGroup');

        if (installmentType && installmentType.value === 'installment' && installmentsGroup) {
            installmentsGroup.style.display = 'block';
        } else if (installmentsGroup) {
            installmentsGroup.style.display = 'none';
        }
    }

    hideConditionalFields() {
        const fields = ['cardSelectionGroup', 'cardUserGroup', 'installmentTypeGroup', 'installmentsGroup'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.style.display = 'none';
        });
    }

    async saveTransaction(e) {
        e.preventDefault();

        try {
            const formData = {
                type: document.getElementById('transactionType').value,
                description: document.getElementById('transactionDescription').value,
                category: document.getElementById('transactionCategory').value,
                paymentMethod: document.getElementById('transactionPaymentMethod').value,
                value: parseFloat(document.getElementById('transactionValue').value),
                date: document.getElementById('transactionDate').value,
                user: document.getElementById('transactionUser').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Adicionar informações de cartão se necessário
            if (formData.paymentMethod === 'credit-card') {
                const cardSelect = document.getElementById('transactionCard');
                if (cardSelect && cardSelect.value) {
                    formData.cardId = cardSelect.value;
                    const cardUserSelect = document.getElementById('transactionCardUser');
                    if (cardUserSelect && cardUserSelect.value) {
                        formData.cardUserId = cardUserSelect.value;
                    }
                }

                // Verificar parcelamento
                const installmentType = document.querySelector('input[name="installmentType"]:checked');
                if (installmentType && installmentType.value === 'installment') {
                    const installmentsInput = document.getElementById('transactionInstallments');
                    if (installmentsInput && installmentsInput.value) {
                        formData.installment = {
                            total: parseInt(installmentsInput.value),
                            current: 1,
                            description: `1/${installmentsInput.value}`
                        };
                    }
                }
            }

            if (this.editingTransactionId) {
                // Atualizar transação existente
                await this.db.collection('transactions').doc(this.editingTransactionId).update(formData);
                
                const index = this.transactions.findIndex(t => t.id === this.editingTransactionId);
                if (index !== -1) {
                    this.transactions[index] = { ...this.transactions[index], ...formData };
                }

                this.showNotification('Transação atualizada com sucesso!', 'success');
            } else {
                // Adicionar nova transação
                const docRef = await this.db.collection('transactions').add(formData);
                formData.id = docRef.id;
                formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                
                this.transactions.unshift(formData);
                this.showNotification('Transação adicionada com sucesso!', 'success');
            }

            this.updateDashboard();
            this.updateTransactionsTable();
            this.updateCards();
            this.closeTransactionModal();

        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            this.showNotification('Erro ao salvar transação', 'error');
        }
    }

    updateTransactionsTable() {
        const allTableBody = document.getElementById('transactionsTableBody');
        const incomeTableBody = document.getElementById('incomeTableBody');
        const expenseTableBody = document.getElementById('expenseTableBody');

        if (!allTableBody || !incomeTableBody || !expenseTableBody) return;

        // Limpar tabelas
        allTableBody.innerHTML = '';
        incomeTableBody.innerHTML = '';
        expenseTableBody.innerHTML = '';

        // Esconder loading e mostrar tabelas
        this.hideLoading('all');
        this.hideLoading('income');
        this.hideLoading('expense');

        if (this.transactions.length === 0) {
            const emptyRow = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhuma transação encontrada</td></tr>';
            allTableBody.innerHTML = emptyRow;
            incomeTableBody.innerHTML = emptyRow.replace('8', '8');
            expenseTableBody.innerHTML = emptyRow.replace('8', '8');
            return;
        }

        // Ordenar transações por data (mais recentes primeiro)
        const sortedTransactions = [...this.transactions].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        sortedTransactions.forEach(transaction => {
            const row = this.createTransactionRow(transaction);
            
            // Adicionar à tabela "Todas"
            allTableBody.appendChild(row.cloneNode(true));
            
            // Adicionar à tabela específica
            if (transaction.type === 'income') {
                incomeTableBody.appendChild(row.cloneNode(true));
            } else {
                expenseTableBody.appendChild(row.cloneNode(true));
            }
        });
    }

    createTransactionRow(transaction) {
        const row = document.createElement('tr');
        
        const typeClass = transaction.type === 'income' ? 'income' : 'expense';
        const userText = this.getUserName(transaction.user);
        const cardText = transaction.cardName || '-';
        const installmentText = transaction.installment ? `Parcela ${transaction.installment.description}` : '-';

        row.innerHTML = `
            <td>${transaction.description}</td>
            <td>${this.getCategoryName(transaction.category)}</td>
            <td>${this.formatDate(transaction.date)}</td>
            <td class="${typeClass}">${transaction.type === 'income' ? '+' : '-'} ${this.formatCurrency(transaction.value)}</td>
            <td>${userText}</td>
            <td>${cardText}</td>
            <td>${installmentText}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="app.editTransaction('${transaction.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="app.deleteTransaction('${transaction.id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        return row;
    }

    async deleteTransaction(id) {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            await this.db.collection('transactions').doc(id).delete();
            
            this.transactions = this.transactions.filter(t => t.id !== id);
            
            this.updateDashboard();
            this.updateTransactionsTable();
            this.updateCards();
            
            this.showNotification('Transação excluída com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            this.showNotification('Erro ao excluir transação', 'error');
        }
    }

    editTransaction(id) {
        this.openTransactionModal(id);
    }

    // Métodos de Cartões
    openCardModal(cardId = null) {
        const modal = document.getElementById('cardModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('show');

        if (cardId) {
            const card = this.cards.find(c => c.id === cardId);
            if (card) {
                this.editingCardId = cardId;
                this.fillCardForm(card);
                document.querySelector('#cardModal .modal-title').textContent = 'Editar Cartão';
            }
        } else {
            this.editingCardId = null;
            this.clearCardForm();
            document.querySelector('#cardModal .modal-title').textContent = 'Adicionar Cartão';
        }
    }

    closeCardModal() {
        const modal = document.getElementById('cardModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        this.clearCardForm();
        this.editingCardId = null;
    }

    clearCardForm() {
        const form = document.getElementById('cardForm');
        if (form) form.reset();
    }

    fillCardForm(card) {
        document.getElementById('cardName').value = card.name;
        document.getElementById('cardLimit').value = card.limit;
        document.getElementById('cardClosingDay').value = card.closingDay;
        document.getElementById('cardDueDate').value = card.dueDate;
    }

    async saveCard(e) {
        e.preventDefault();

        try {
            const cardData = {
                name: document.getElementById('cardName').value,
                limit: parseFloat(document.getElementById('cardLimit').value),
                closingDay: parseInt(document.getElementById('cardClosingDay').value),
                dueDate: parseInt(document.getElementById('cardDueDate').value),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.editingCardId) {
                await this.db.collection('cards').doc(this.editingCardId).update(cardData);
                
                const index = this.cards.findIndex(c => c.id === this.editingCardId);
                if (index !== -1) {
                    this.cards[index] = { ...this.cards[index], ...cardData };
                }

                this.showNotification('Cartão atualizado com sucesso!', 'success');
            } else {
                const docRef = await this.db.collection('cards').add(cardData);
                cardData.id = docRef.id;
                cardData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                
                this.cards.push(cardData);
                this.showNotification('Cartão adicionado com sucesso!', 'success');
            }

            this.updateCards();
            this.populateCardSelects();
            this.closeCardModal();

        } catch (error) {
            console.error('Erro ao salvar cartão:', error);
            this.showNotification('Erro ao salvar cartão', 'error');
        }
    }

    updateCards() {
        const cardsGrid = document.getElementById('cardsGrid');
        const cardsLoading = document.getElementById('cardsLoading');

        if (!cardsGrid || !cardsLoading) return;

        cardsGrid.innerHTML = '';

        if (this.cards.length === 0) {
            cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhum cartão cadastrado</p>';
            cardsLoading.style.display = 'none';
            cardsGrid.style.display = 'grid';
            return;
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        this.cards.forEach(card => {
            const cardTransactions = this.transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return t.cardId === card.id &&
                    t.type === 'expense' &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
            });

            const cardSpent = cardTransactions.reduce((sum, t) => sum + t.value, 0);
            const availableLimit = card.limit - cardSpent;
            const usagePercentage = card.limit > 0 ? (cardSpent / card.limit) * 100 : 0;

            const cardElement = document.createElement('div');
            cardElement.className = 'credit-card';
            cardElement.innerHTML = `
                <div class="card-header">
                    <div class="card-name">${card.name}</div>
                    <div class="card-actions">
                        <button class="btn-icon btn-edit" onclick="app.editCard('${card.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="app.deleteCard('${card.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-details">
                    <div>
                        <div class="card-limit">Limite disponível</div>
                        <div class="card-limit-value">${this.formatCurrency(availableLimit)}</div>
                    </div>
                    <div>
                        <div class="card-limit">Fatura atual</div>
                        <div class="card-limit-value">${this.formatCurrency(cardSpent)}</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${usagePercentage}%"></div>
                </div>
                <div class="card-limit">
                    Limite: ${this.formatCurrency(card.limit)}<br>
                    Fechamento: ${card.closingDay}º<br>
                    Vencimento: ${card.dueDate}º
                </div>
            `;

            cardsGrid.appendChild(cardElement);
        });

        cardsLoading.style.display = 'none';
        cardsGrid.style.display = 'grid';
    }

    async deleteCard(id) {
        if (!confirm('Tem certeza que deseja excluir este cartão?')) return;

        try {
            await this.db.collection('cards').doc(id).delete();
            
            this.cards = this.cards.filter(c => c.id !== id);
            
            this.updateCards();
            this.populateCardSelects();
            
            this.showNotification('Cartão excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir cartão:', error);
            this.showNotification('Erro ao excluir cartão', 'error');
        }
    }

    editCard(id) {
        this.openCardModal(id);
    }

    // Métodos de Usuários
    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('show');

        if (userId) {
            const user = this.users.find(u => u.id === userId);
            if (user) {
                this.editingUserId = userId;
                this.fillUserForm(user);
                document.querySelector('#userModal .modal-title').textContent = 'Editar Usuário';
            }
        } else {
            this.editingUserId = null;
            this.clearUserForm();
            document.querySelector('#userModal .modal-title').textContent = 'Adicionar Usuário';
        }
    }

    closeUserModal() {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        this.clearUserForm();
        this.editingUserId = null;
    }

    clearUserForm() {
        const form = document.getElementById('userForm');
        if (form) form.reset();
    }

    fillUserForm(user) {
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('usuario').value = user.avatar || '';
    }

    async saveUser(e) {
        e.preventDefault();

        try {
            const userData = {
                name: document.getElementById('userName').value,
                email: document.getElementById('userEmail').value || '',
                avatar: document.getElementById('usuario').value.toUpperCase() || document.getElementById('userName').value.charAt(0).toUpperCase(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.editingUserId) {
                await this.db.collection('users').doc(this.editingUserId).update(userData);
                
                const index = this.users.findIndex(u => u.id === this.editingUserId);
                if (index !== -1) {
                    this.users[index] = { ...this.users[index], ...userData };
                }

                this.showNotification('Usuário atualizado com sucesso!', 'success');
            } else {
                const docRef = await this.db.collection('users').add(userData);
                userData.id = docRef.id;
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                
                this.users.push(userData);
                this.showNotification('Usuário adicionado com sucesso!', 'success');
            }

            this.updateUsers();
            this.populateUserSelector();
            this.populateCardUserSelect();
            this.closeUserModal();

        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            this.showNotification('Erro ao salvar usuário', 'error');
        }
    }

    updateUsers() {
        const usersGrid = document.getElementById('usersGrid');
        const usersLoading = document.getElementById('usersLoading');

        if (!usersGrid || !usersLoading) return;

        usersGrid.innerHTML = '';

        if (this.users.length === 0) {
            usersGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhum usuário cadastrado</p>';
            usersLoading.style.display = 'none';
            usersGrid.style.display = 'grid';
            return;
        }

        this.users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-card';
            userElement.innerHTML = `
                <div class="user-card-header">
                    <div class="user-avatar">${user.avatar}</div>
                    <div class="user-card-name">${user.name}</div>
                </div>
                <div class="card-description">${user.email || 'E-mail não informado'}</div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" onclick="app.editUser('${user.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="app.deleteUser('${user.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            usersGrid.appendChild(userElement);
        });

        usersLoading.style.display = 'none';
        usersGrid.style.display = 'grid';
    }

    async deleteUser(id) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            await this.db.collection('users').doc(id).delete();
            
            this.users = this.users.filter(u => u.id !== id);
            
            this.updateUsers();
            this.populateUserSelector();
            this.populateCardUserSelect();
            
            this.showNotification('Usuário excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showNotification('Erro ao excluir usuário', 'error');
        }
    }

    editUser(id) {
        this.openUserModal(id);
    }

    // Métodos de Relatório
    openInvoiceReportModal() {
        const modal = document.getElementById('invoiceReportModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            this.populateReportCardSelect();
        }
    }

    closeInvoiceReportModal() {
        const modal = document.getElementById('invoiceReportModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    populateReportYears() {
        const yearSelect = document.getElementById('reportYear');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';

        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    }

    populateReportCardSelect() {
        const cardSelect = document.getElementById('reportCard');
        if (!cardSelect) return;

        cardSelect.innerHTML = '<option value="">Selecione um cartão</option>';

        this.cards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = card.name;
            cardSelect.appendChild(option);
        });
    }

    generateInvoiceReport() {
        const cardId = document.getElementById('reportCard').value;
        const month = parseInt(document.getElementById('reportMonth').value);
        const year = parseInt(document.getElementById('reportYear').value);

        if (!cardId) {
            this.showNotification('Selecione um cartão', 'error');
            return;
        }

        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        // Filtrar transações do cartão no período
        const cardTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return t.cardId === cardId &&
                t.type === 'expense' &&
                transactionDate.getMonth() === month &&
                transactionDate.getFullYear() === year;
        });

        const totalAmount = cardTransactions.reduce((sum, t) => sum + t.value, 0);

        // Gerar conteúdo do relatório
        const reportContent = document.getElementById('invoiceReportContent');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        reportContent.innerHTML = `
            <div class="invoice-report">
                <h4>Relatório de Fatura - ${card.name}</h4>
                <p><strong>Período:</strong> ${monthNames[month]} de ${year}</p>
                <p><strong>Total da Fatura:</strong> ${this.formatCurrency(totalAmount)}</p>
                <p><strong>Quantidade de Transações:</strong> ${cardTransactions.length}</p>
                
                <h5>Transações Detalhadas</h5>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cardTransactions.map(t => `
                            <tr>
                                <td>${this.formatDate(t.date)}</td>
                                <td>${t.description}</td>
                                <td>${this.getCategoryName(t.category)}</td>
                                <td>${this.formatCurrency(t.value)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="report-actions">
                    <button class="btn btn-primary" onclick="app.printReport()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    <button class="btn btn-secondary" onclick="app.exportReport()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
        `;

        reportContent.style.display = 'block';
    }

    printReport() {
        window.print();
    }

    exportReport() {
        // Simulação de exportação
        this.showNotification('Função de exportação em desenvolvimento', 'info');
    }

    // Métodos de UI
    openTab(tabId) {
        // Esconder todos os conteúdos de abas
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Remover classe active de todas as abas
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // Mostrar conteúdo da aba selecionada
        const selectedTab = document.getElementById(`${tabId}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Adicionar classe active à aba clicada
        const clickedTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
    }

    changeUser(e) {
        this.currentUser = e.target.value;
        this.updateUserAvatar();
        this.updateDashboard();
        this.updateTransactionsTable();
    }

    updateUserAvatar() {
        const userAvatar = document.getElementById('userAvatar');
        const userSelector = document.getElementById('userSelector');
        
        if (userAvatar && userSelector) {
            const selectedOption = userSelector.options[userSelector.selectedIndex];
            userAvatar.textContent = selectedOption.text.charAt(0).toUpperCase();
        }
    }

    populateUserSelector() {
        const userSelector = document.getElementById('userSelector');
        if (!userSelector) return;

        userSelector.innerHTML = '';

        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            if (user.id === this.currentUser) option.selected = true;
            userSelector.appendChild(option);
        });
    }

    populateCardSelects() {
        this.populateCardSelect();
        this.populateCardUserSelect();
    }

    populateCardSelect() {
        const cardSelect = document.getElementById('transactionCard');
        if (!cardSelect) return;

        cardSelect.innerHTML = '<option value="">Selecione um cartão</option>';

        this.cards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = card.name;
            cardSelect.appendChild(option);
        });
    }

    populateCardUserSelect() {
        const userSelect = document.getElementById('transactionCardUser');
        if (!userSelect) return;

        userSelect.innerHTML = '<option value="">Selecione um usuário</option>';

        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });
    }

    hideLoading(type) {
        const loading = document.getElementById(`${type}Loading`);
        const table = document.getElementById(`${type}Table`);
        
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'table';
    }

    // Métodos utilitários
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    getCategoryName(category) {
        const categories = {
            food: 'Alimentação',
            transport: 'Transporte',
            shopping: 'Compras',
            bills: 'Contas',
            entertainment: 'Entretenimento',
            health: 'Saúde',
            education: 'Educação',
            salary: 'Salário',
            investments: 'Investimentos',
            other: 'Outros'
        };
        return categories[category] || category;
    }

    getUserName(userId) {
        const user = this.users.find(u => u.id === userId);
        return user ? user.name : 'Usuário';
    }

    showNotification(message, type = 'success') {
        // Remover notificação existente
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                     type === 'error' ? 'exclamation-circle' : 
                     type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Esconder após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Inicializar aplicativo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanFacil();
});

// Funções globais para os botões
window.editTransaction = function(id) {
    window.app.editTransaction(id);
};

window.deleteTransaction = function(id) {
    window.app.deleteTransaction(id);
};

window.editCard = function(id) {
    window.app.editCard(id);
};

window.deleteCard = function(id) {
    window.app.deleteCard(id);
};

window.editUser = function(id) {
    window.app.editUser(id);
};

window.deleteUser = function(id) {
    window.app.deleteUser(id);
};

window.printReport = function() {
    window.app.printReport();
};

window.exportReport = function() {
    window.app.exportReport();
};
