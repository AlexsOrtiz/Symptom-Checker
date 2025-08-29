class QuoteGuessingGame {
    constructor() {
        this.currentQuote = null;
        this.remainingGuesses = 4;
        this.gameActive = false;
        this.hintsShown = [];
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        // Botones de control
        this.loadQuotesBtn = document.getElementById('loadQuotesBtn');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        
        // Elementos de estado
        this.statusText = document.getElementById('statusText');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        
        // Área del juego
        this.gameArea = document.getElementById('gameArea');
        this.quoteText = document.getElementById('quoteText');
        this.guessesCount = document.getElementById('guessesCount');
        this.guessInput = document.getElementById('guessInput');
        this.submitGuessBtn = document.getElementById('submitGuess');
        
        // Pistas
        this.hintsContainer = document.getElementById('hintsContainer');
        this.hintsList = document.getElementById('hintsList');
        
        // Resultados
        this.resultContainer = document.getElementById('resultContainer');
        this.resultText = document.getElementById('resultText');
        this.authorInfo = document.getElementById('authorInfo');
        this.authorName = document.getElementById('authorName');
        this.authorImage = document.getElementById('authorImage');
        this.imagePlaceholder = document.getElementById('imagePlaceholder');
        
        // Modal
        this.modal = document.getElementById('messageModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.closeModal = document.querySelector('.close');
    }
    
    bindEvents() {
        // Eventos de botones
        this.loadQuotesBtn.addEventListener('click', () => this.loadQuotes());
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.playAgainBtn.addEventListener('click', () => this.startNewGame());
        this.submitGuessBtn.addEventListener('click', () => this.submitGuess());
        
        // Evento de Enter en el input
        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.gameActive) {
                this.submitGuess();
            }
        });
        
        // Eventos del modal
        this.closeModal.addEventListener('click', () => this.hideModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        // Evento para prevenir el submit del formulario
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target === this.guessInput) {
                e.preventDefault();
            }
        });
    }
    
    showLoading(show = true) {
        if (show) {
            this.loadingSpinner.classList.add('show');
        } else {
            this.loadingSpinner.classList.remove('show');
        }
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
    }
    
    showModal(title, message) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modal.style.display = 'block';
    }
    
    hideModal() {
        this.modal.style.display = 'none';
    }
    
    async loadQuotes() {
        try {
            this.loadQuotesBtn.disabled = true;
            this.showLoading(true);
            this.updateStatus('Loading quotes...');
            
            const response = await fetch('/api/load-quotes');
            const data = await response.json();
            
            if (data.success) {
                this.updateStatus(data.message);
                this.newGameBtn.disabled = false;
                this.showModal('Success!', `${data.count} quotes loaded successfully! You can now start playing!`);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            this.updateStatus('Error loading quotes');
            this.showModal('Error', `Could not load quotes: ${error.message}`);
            this.loadQuotesBtn.disabled = false;
        } finally {
            this.showLoading(false);
        }
    }
    
    async startNewGame() {
        try {
            this.showLoading(true);
            this.updateStatus('Iniciando nuevo juego...');
            
            const response = await fetch('/api/new-game');
            const data = await response.json();
            
            if (data.success) {
                this.currentQuote = data.quote;
                this.remainingGuesses = 4;
                this.gameActive = true;
                this.hintsShown = [];
                
                this.setupGameUI();
                this.updateStatus('New game started! Guess who wrote this quote.');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            this.updateStatus('Error starting game');
            this.showModal('Error', `Could not start game: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    setupGameUI() {
        // Mostrar área del juego
        this.gameArea.style.display = 'block';
        this.gameArea.classList.add('fade-in');
        
        // Ocultar resultados
        this.resultContainer.style.display = 'none';
        
        // Configurar texto de la cita
        this.quoteText.textContent = this.currentQuote.text;
        
        // Resetear input
        this.guessInput.value = '';
        this.guessInput.disabled = false;
        this.submitGuessBtn.disabled = false;
        
        // Resetear pistas
        this.hintsList.innerHTML = '';
        
        // Actualizar contador de intentos
        this.updateGuessesDisplay();
        
        // Focus en el input
        setTimeout(() => {
            this.guessInput.focus();
        }, 100);
    }
    
    updateGuessesDisplay() {
        this.guessesCount.textContent = this.remainingGuesses;
        
        const guessesElement = document.querySelector('.guesses-remaining');
        guessesElement.classList.remove('warning', 'danger');
        
        if (this.remainingGuesses <= 1) {
            guessesElement.classList.add('danger');
        } else if (this.remainingGuesses <= 2) {
            guessesElement.classList.add('warning');
        }
    }
    
    async submitGuess() {
        if (!this.gameActive) return;
        
        const userGuess = this.guessInput.value.trim();
        if (!userGuess) {
            this.showModal('Warning', 'Please enter your guess before submitting.');
            return;
        }
        
        try {
            this.submitGuessBtn.disabled = true;
            this.showLoading(true);
            
            const response = await fetch('/api/check-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answer: userGuess,
                    author: this.currentQuote.author
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.correct) {
                    this.winGame();
                } else {
                    this.remainingGuesses--;
                    this.updateGuessesDisplay();
                    
                    if (this.remainingGuesses > 0) {
                        await this.showHint();
                        this.guessInput.value = '';
                        this.guessInput.focus();
                    } else {
                        this.loseGame();
                    }
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            this.showModal('Error', `Error al verificar la respuesta: ${error.message}`);
        } finally {
            this.showLoading(false);
            this.submitGuessBtn.disabled = false;
        }
    }
    
    async showHint() {
        let hintType;
        
        if (this.remainingGuesses === 3) {
            hintType = 'birth';
        } else if (this.remainingGuesses === 2) {
            hintType = 'first_name';
        } else if (this.remainingGuesses === 1) {
            hintType = 'last_name';
        }
        
        if (!hintType || this.hintsShown.includes(hintType)) return;
        
        try {
            const params = new URLSearchParams({
                type: hintType,
                author: this.currentQuote.author,
                bio_link: this.currentQuote.bio_link
            });
            
            const response = await fetch(`/api/get-hint?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.addHintToUI(data.hint);
                this.hintsShown.push(hintType);
            }
        } catch (error) {
            console.error('Error al obtener pista:', error);
        }
    }
    
    addHintToUI(hint) {
        const hintElement = document.createElement('div');
        hintElement.className = 'hint-item';
        hintElement.textContent = hint;
        
        this.hintsList.appendChild(hintElement);
        
        // Scroll hacia la pista
        hintElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    winGame() {
        this.gameActive = false;
        this.guessInput.disabled = true;
        this.submitGuessBtn.disabled = true;
        
        this.showResult(true, 'Congratulations! 🎉', 'You guessed correctly!');
        this.loadAuthorImage();
    }
    
    loseGame() {
        this.gameActive = false;
        this.guessInput.disabled = true;
        this.submitGuessBtn.disabled = true;
        
        this.showResult(false, 'Game Over 😔', `The correct answer was: ${this.currentQuote.author}`);
        this.loadAuthorImage();
    }
    
    showResult(isWin, title, message) {
        // Ocultar área del juego
        this.gameArea.style.display = 'none';
        
        // Mostrar resultados
        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.add('fade-in');
        
        // Configurar texto del resultado
        this.resultText.textContent = message;
        this.resultText.classList.remove('success', 'failure');
        this.resultText.classList.add(isWin ? 'success' : 'failure');
        
        // Mostrar nombre del autor
        this.authorName.textContent = this.currentQuote.author;
        
        // Resetear imagen
        this.authorImage.style.display = 'none';
        this.imagePlaceholder.style.display = 'flex';
        this.imagePlaceholder.innerHTML = '<i class="fas fa-user-circle"></i><p>Cargando imagen...</p>';
        
        // Scroll hacia arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.updateStatus(`Game finished. Author: ${this.currentQuote.author}`);
    }
    
    async loadAuthorImage() {
        try {
            console.log(`Buscando imagen para: ${this.currentQuote.author}`);
            
            const params = new URLSearchParams({
                author: this.currentQuote.author
            });
            
            const response = await fetch(`/api/get-image?${params}`);
            const data = await response.json();
            
            console.log('Respuesta de imagen:', data);
            
            if (data.success && data.image_url) {
                console.log(`URL de imagen encontrada: ${data.image_url}`);
                await this.tryLoadImage(data.image_url);
            } else {
                console.log('No se encontró imagen, generando fallback');
                this.generateFallbackImage();
            }
        } catch (error) {
            console.error('Error al cargar imagen:', error);
            this.generateFallbackImage();
        }
    }
    
    async tryLoadImage(imageUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                this.authorImage.src = imageUrl;
                this.authorImage.style.display = 'block';
                this.imagePlaceholder.style.display = 'none';
                resolve(true);
            };
            
            img.onerror = () => {
                console.log('Imagen falló, intentando con imagen alternativa...');
                this.generateFallbackImage();
                resolve(false);
            };
            
            // Timeout más corto para mejor UX
            setTimeout(() => {
                if (this.authorImage.style.display === 'none') {
                    console.log('Timeout de imagen, generando alternativa...');
                    img.src = ''; // Cancelar carga
                    this.generateFallbackImage();
                    resolve(false);
                }
            }, 8000);
            
            img.src = imageUrl;
        });
    }
    
    generateFallbackImage() {
        // Generar imagen con las iniciales del autor
        const authorName = this.currentQuote.author;
        const initials = authorName.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&size=400&background=667eea&color=fff&font-size=0.33&format=png&rounded=true&length=2`;
        
        this.authorImage.src = fallbackUrl;
        this.authorImage.style.display = 'block';
        this.imagePlaceholder.style.display = 'none';
    }
    
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    new QuoteGuessingGame();
});

// Manejar errores de red globalmente
window.addEventListener('online', function() {
    console.log('Conexión restaurada');
});

window.addEventListener('offline', function() {
    console.log('Sin conexión a internet');
});
