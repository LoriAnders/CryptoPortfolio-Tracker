class CryptoPortfolio {
    constructor() {
        this.holdings = JSON.parse(localStorage.getItem('cryptoHoldings')) || [];
        this.prices = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHoldings();
        this.fetchPrices();
        setInterval(() => this.fetchPrices(), 60000);
    }

    bindEvents() {
        const form = document.getElementById('add-holding-form');
        form.addEventListener('submit', (e) => this.handleAddHolding(e));
        
        const csvBtn = document.getElementById('export-csv');
        const jsonBtn = document.getElementById('export-json');
        csvBtn.addEventListener('click', () => this.exportData('csv'));
        jsonBtn.addEventListener('click', () => this.exportData('json'));
    }

    async fetchPrices() {
        try {
            this.showLoadingState(true);
            const cryptoIds = [
                'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 
                'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'chainlink',
                'polygon', 'litecoin', 'uniswap', 'cosmos', 'algorand'
            ];
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.prices = await response.json();
            this.updateDisplay();
            this.updateLastUpdateTime();
            this.showErrorMessage(false);
        } catch (error) {
            console.error('Error fetching prices:', error);
            this.showErrorMessage(true, 'Failed to fetch current prices. Please try again later.');
        } finally {
            this.showLoadingState(false);
        }
    }

    showLoadingState(isLoading) {
        const summaryCards = document.querySelectorAll('.card span');
        summaryCards.forEach(card => {
            if (isLoading) {
                card.style.opacity = '0.5';
            } else {
                card.style.opacity = '1';
            }
        });
    }

    showErrorMessage(show, message = '') {
        let errorDiv = document.getElementById('error-message');
        
        if (show && !errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            document.querySelector('.container').insertBefore(errorDiv, document.querySelector('main'));
        } else if (show && errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else if (!show && errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    handleAddHolding(e) {
        e.preventDefault();
        
        const cryptoId = document.getElementById('crypto-select').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const purchasePrice = parseFloat(document.getElementById('purchase-price').value);

        if (!cryptoId || !amount || !purchasePrice) {
            alert('Please fill in all fields');
            return;
        }

        const holding = {
            id: Date.now(),
            cryptoId,
            amount,
            purchasePrice,
            dateAdded: new Date().toISOString()
        };

        this.holdings.push(holding);
        this.saveHoldings();
        this.loadHoldings();
        e.target.reset();
    }

    deleteHolding(id) {
        this.holdings = this.holdings.filter(holding => holding.id !== id);
        this.saveHoldings();
        this.loadHoldings();
    }

    saveHoldings() {
        localStorage.setItem('cryptoHoldings', JSON.stringify(this.holdings));
    }

    loadHoldings() {
        const container = document.getElementById('holdings-container');
        
        if (this.holdings.length === 0) {
            container.innerHTML = '<p class="empty-state">No holdings yet. Add your first cryptocurrency above!</p>';
            return;
        }

        container.innerHTML = this.holdings.map(holding => this.createHoldingHTML(holding)).join('');
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (confirm('Are you sure you want to delete this holding?')) {
                    this.deleteHolding(id);
                }
            });
        });

        this.updateSummary();
    }

    createHoldingHTML(holding) {
        const currentPrice = this.prices[holding.cryptoId]?.usd || 0;
        const currentValue = holding.amount * currentPrice;
        const totalCost = holding.amount * holding.purchasePrice;
        const pnl = currentValue - totalCost;
        const pnlPercentage = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;
        
        const cryptoNames = {
            bitcoin: 'Bitcoin',
            ethereum: 'Ethereum',
            binancecoin: 'Binance Coin',
            cardano: 'Cardano',
            solana: 'Solana',
            ripple: 'Ripple',
            polkadot: 'Polkadot',
            dogecoin: 'Dogecoin',
            'avalanche-2': 'Avalanche',
            chainlink: 'Chainlink',
            polygon: 'Polygon',
            litecoin: 'Litecoin',
            uniswap: 'Uniswap',
            cosmos: 'Cosmos',
            algorand: 'Algorand'
        };

        const cryptoSymbols = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            binancecoin: 'BNB',
            cardano: 'ADA',
            solana: 'SOL',
            ripple: 'XRP',
            polkadot: 'DOT',
            dogecoin: 'DOGE',
            'avalanche-2': 'AVAX',
            chainlink: 'LINK',
            polygon: 'MATIC',
            litecoin: 'LTC',
            uniswap: 'UNI',
            cosmos: 'ATOM',
            algorand: 'ALGO'
        };

        return `
            <div class="holding-item">
                <div class="crypto-info">
                    <div>
                        <div class="crypto-name">${cryptoNames[holding.cryptoId]}</div>
                        <div class="crypto-symbol">${cryptoSymbols[holding.cryptoId]}</div>
                    </div>
                </div>
                <div class="amount">${holding.amount.toFixed(8)}</div>
                <div class="current-price">$${currentPrice.toFixed(2)}</div>
                <div class="value">$${currentValue.toFixed(2)}</div>
                <div class="pnl ${pnl >= 0 ? 'positive' : 'negative'}">
                    ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercentage.toFixed(1)}%)
                </div>
                <button class="delete-btn" data-id="${holding.id}">Delete</button>
            </div>
        `;
    }

    updateSummary() {
        let totalValue = 0;
        let totalCost = 0;

        this.holdings.forEach(holding => {
            const currentPrice = this.prices[holding.cryptoId]?.usd || 0;
            const currentValue = holding.amount * currentPrice;
            const cost = holding.amount * holding.purchasePrice;
            
            totalValue += currentValue;
            totalCost += cost;
        });

        const totalPnL = totalValue - totalCost;

        document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('total-pnl').textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
        document.getElementById('total-pnl').className = totalPnL >= 0 ? 'positive' : 'negative';
        document.getElementById('total-holdings').textContent = this.holdings.length;
    }

    updateDisplay() {
        if (this.holdings.length > 0) {
            this.loadHoldings();
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('last-update').textContent = `Last updated: ${timeString}`;
    }

    exportData(format) {
        if (this.holdings.length === 0) {
            alert('No holdings to export');
            return;
        }

        const cryptoNames = {
            bitcoin: 'Bitcoin',
            ethereum: 'Ethereum',
            binancecoin: 'Binance Coin',
            cardano: 'Cardano',
            solana: 'Solana',
            ripple: 'Ripple',
            polkadot: 'Polkadot',
            dogecoin: 'Dogecoin',
            'avalanche-2': 'Avalanche',
            chainlink: 'Chainlink',
            polygon: 'Polygon',
            litecoin: 'Litecoin',
            uniswap: 'Uniswap',
            cosmos: 'Cosmos',
            algorand: 'Algorand'
        };

        const cryptoSymbols = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            binancecoin: 'BNB',
            cardano: 'ADA',
            solana: 'SOL',
            ripple: 'XRP',
            polkadot: 'DOT',
            dogecoin: 'DOGE',
            'avalanche-2': 'AVAX',
            chainlink: 'LINK',
            polygon: 'MATIC',
            litecoin: 'LTC',
            uniswap: 'UNI',
            cosmos: 'ATOM',
            algorand: 'ALGO'
        };

        const exportData = this.holdings.map(holding => {
            const currentPrice = this.prices[holding.cryptoId]?.usd || 0;
            const currentValue = holding.amount * currentPrice;
            const totalCost = holding.amount * holding.purchasePrice;
            const pnl = currentValue - totalCost;
            const pnlPercentage = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;

            return {
                name: cryptoNames[holding.cryptoId],
                symbol: cryptoSymbols[holding.cryptoId],
                amount: holding.amount,
                purchasePrice: holding.purchasePrice,
                currentPrice: currentPrice,
                currentValue: currentValue,
                totalCost: totalCost,
                profitLoss: pnl,
                profitLossPercentage: pnlPercentage,
                dateAdded: new Date(holding.dateAdded).toLocaleDateString()
            };
        });

        if (format === 'csv') {
            this.downloadCSV(exportData);
        } else if (format === 'json') {
            this.downloadJSON(exportData);
        }
    }

    downloadCSV(data) {
        const headers = ['Name', 'Symbol', 'Amount', 'Purchase Price', 'Current Price', 'Current Value', 'Total Cost', 'Profit/Loss', 'P&L %', 'Date Added'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.name,
                row.symbol,
                row.amount,
                row.purchasePrice.toFixed(2),
                row.currentPrice.toFixed(2),
                row.currentValue.toFixed(2),
                row.totalCost.toFixed(2),
                row.profitLoss.toFixed(2),
                row.profitLossPercentage.toFixed(2),
                row.dateAdded
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'crypto-portfolio.csv', 'text/csv');
    }

    downloadJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'crypto-portfolio.json', 'application/json');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CryptoPortfolio();
});