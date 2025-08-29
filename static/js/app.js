/**
 * MedInsight - Medical Symptom Analyzer
 * Enhanced JavaScript with modern UX features
 */

class MedInsight {
    constructor() {
        this.selectedSymptoms = new Set();
        this.maxSymptoms = 10;
        this.allSymptoms = [];
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeTooltips();
        this.loadInitialSymptoms();
        this.setupFormValidation();
        this.initializeAnimations();
    }

    bindEvents() {
        // Search input with debounce
        $('#symptom_search').on('input', this.debounce(this.handleSymptomSearch.bind(this), 300));
        
        // Symptom selection - use double-click instead of change
        $('#symptom_dropdown').on('dblclick', this.handleSymptomSelection.bind(this));
        
        // Form submission
        $('.analysis-form').on('submit', this.handleFormSubmit.bind(this));
        
        // Keyboard navigation
        $('#symptom_search').on('keydown', this.handleSearchKeydown.bind(this));
        
        // Empty state click to focus search
        $(document).on('click', '#empty_symptoms', () => {
            $('#symptom_search').focus();
        });
        
        // Remove button delegation
        $(document).on('click', '.remove-btn', this.handleSymptomRemoval.bind(this));
        
        // Navigation button interactions
        $('.nav-btn').on('click', this.handleNavButtonClick.bind(this));
        
        // Prevent form submission on Enter in search
        $('#symptom_search').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this.selectFirstSymptom();
            }
        });

        // Add double-click functionality for dropdown options
        $(document).on('dblclick', '#symptom_dropdown option', this.handleOptionClick.bind(this));
    }

    initializeTooltips() {
        // Enhanced tooltips with better positioning
        $('[data-tooltip]').each(function() {
            const $element = $(this);
            const tooltip = $element.data('tooltip');
            
            $element.on('mouseenter', function() {
                const $tooltip = $('<div class="custom-tooltip">')
                    .text(tooltip)
                    .appendTo('body');
                
                const rect = this.getBoundingClientRect();
                const tooltipRect = $tooltip[0].getBoundingClientRect();
                
                $tooltip.css({
                    top: rect.top - tooltipRect.height - 8,
                    left: rect.left + (rect.width - tooltipRect.width) / 2
                });
                
                $tooltip.addClass('show');
            });
            
            $element.on('mouseleave', function() {
                $('.custom-tooltip').remove();
            });
        });
    }

    async loadInitialSymptoms() {
        try {
            const response = await $.get('/search?query=');
            this.allSymptoms = response || [];
            console.log('Loaded symptoms:', this.allSymptoms.length);
            this.populateSymptomDropdown(this.allSymptoms);
        } catch (error) {
            console.error('Failed to load symptoms:', error);
            this.showNotification('Failed to load symptoms', 'error');
        }
    }

    async handleSymptomSearch(event) {
        const query = $(event.target).val().trim();
        
        if (query.length === 0) {
            this.populateSymptomDropdown(this.allSymptoms);
            return;
        }

        try {
            this.showSearchLoading(true);
            const response = await $.get(`/search?query=${encodeURIComponent(query)}`);
            const filteredSymptoms = response || [];
            
            this.populateSymptomDropdown(filteredSymptoms);
            this.highlightSearchResults(query);
        } catch (error) {
            console.error('Search failed:', error);
            this.showNotification('Search failed. Please try again.', 'error');
        } finally {
            this.showSearchLoading(false);
        }
    }

    populateSymptomDropdown(symptoms) {
        const $dropdown = $('#symptom_dropdown');
        $dropdown.empty();
        
        if (symptoms.length === 0) {
            $dropdown.append('<option disabled>No symptoms found</option>');
            return;
        }
        
        symptoms.forEach(symptom => {
            if (!this.selectedSymptoms.has(symptom)) {
                const $option = $('<option>')
                    .val(symptom)
                    .text(symptom)
                    .data('symptom', symptom);
                
                $dropdown.append($option);
            }
        });
        
        // Add visual feedback for available options
        this.updateDropdownState();
    }

    highlightSearchResults(query) {
        if (!query) return;
        
        $('#symptom_dropdown option').each(function() {
            const $option = $(this);
            const text = $option.text();
            const regex = new RegExp(`(${query})`, 'gi');
            const highlighted = text.replace(regex, '<mark>$1</mark>');
            
            // Note: HTML in option elements is limited, this is more for future enhancement
            $option.attr('title', `Contains: ${query}`);
        });
    }

    handleSymptomSelection(event) {
        const $select = $(event.target);
        const $selectedOption = $select.find('option:selected').first();
        
        if ($selectedOption.length > 0) {
            const symptom = $selectedOption.val();
            if (symptom) {
                this.addSymptom(symptom);
                $selectedOption.prop('selected', false); // Deselect after adding
            }
        }
    }

    handleOptionClick(event) {
        const symptom = $(event.target).val() || $(event.target).text();
        if (symptom) {
            this.addSymptom(symptom);
        }
    }

    addSymptom(symptom) {
        if (!symptom || symptom.trim() === '') {
            console.warn('Attempted to add empty symptom');
            return;
        }
        
        if (this.selectedSymptoms.has(symptom)) {
            this.showNotification('Symptom already selected', 'info');
            return;
        }
        
        if (this.selectedSymptoms.size >= this.maxSymptoms) {
            this.showNotification(`Maximum ${this.maxSymptoms} symptoms allowed`, 'warning');
            return;
        }
        
        console.log('Adding symptom:', symptom);
        this.selectedSymptoms.add(symptom);
        this.updateSelectedSymptomsList();
        this.updateProgressIndicator();
        this.populateSymptomDropdown(this.getFilteredSymptoms());
        this.clearSearch();
        
        // Provide haptic feedback if supported
        this.triggerHapticFeedback();
        
        // Show success animation
        this.showNotification('Symptom added successfully', 'success');
    }

    handleSymptomRemoval(event) {
        const symptom = $(event.target).data('symptom');
        
        if (this.selectedSymptoms.has(symptom)) {
            this.selectedSymptoms.delete(symptom);
            
            // Add removal animation
            $(event.target).closest('li').addClass('removing');
            
            setTimeout(() => {
                this.updateSelectedSymptomsList();
                this.updateProgressIndicator();
                this.populateSymptomDropdown(this.getFilteredSymptoms());
                this.triggerHapticFeedback();
            }, 300);
        }
    }

    updateSelectedSymptomsList() {
        const $list = $('#selected_symptoms_list');
        const $emptyState = $('#empty_symptoms');
        
        $list.empty();
        
        if (this.selectedSymptoms.size === 0) {
            $emptyState.show();
            return;
        }
        
        $emptyState.hide();
        
        Array.from(this.selectedSymptoms).forEach((symptom, index) => {
            const $item = $('<li>')
                .addClass('symptom-item')
                .css('animation-delay', `${index * 50}ms`)
                .html(`
                    <span class="symptom-name">${symptom}</span>
                    <button type="button" class="remove-btn" data-symptom="${symptom}" title="Remove ${symptom}">
                        <i class="fas fa-times"></i>
                        <span class="sr-only">Remove</span>
                    </button>
                `);
            
            $list.append($item);
        });
        
        // Update counter badge
        $('.symptom-counter-badge').text(this.selectedSymptoms.size);
    }

    updateProgressIndicator() {
        const progress = (this.selectedSymptoms.size / this.maxSymptoms) * 100;
        
        $('#symptom_progress').css('width', `${progress}%`);
        $('.progress-text').text(`${this.selectedSymptoms.size}/${this.maxSymptoms} symptoms`);
        
        // Update analyze button state
        const $analyzeBtn = $('#analyze_btn');
        if (this.selectedSymptoms.size > 0) {
            $analyzeBtn.removeClass('disabled').prop('disabled', false);
        } else {
            $analyzeBtn.addClass('disabled').prop('disabled', true);
        }
    }

    getFilteredSymptoms() {
        return this.allSymptoms.filter(symptom => !this.selectedSymptoms.has(symptom));
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.selectedSymptoms.size === 0) {
            this.showNotification('Please select at least one symptom', 'warning');
            return;
        }
        
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingOverlay(true);
        this.setAnalyzeButtonLoading(true);
        
        try {
            // Create hidden form inputs for each selected symptom
            const form = event.target;
            
            console.log('Selected symptoms for submission:', Array.from(this.selectedSymptoms));
            
            // Remove any existing symptom inputs
            form.querySelectorAll('input[name="symptoms"]').forEach(input => input.remove());
            
            // Add hidden inputs for each selected symptom
            this.selectedSymptoms.forEach(symptom => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'symptoms';
                hiddenInput.value = symptom;
                form.appendChild(hiddenInput);
                console.log('Added symptom input:', symptom);
            });
            
            // Submit the form normally (not with fetch)
            form.submit();
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showNotification('Analysis failed. Please try again.', 'error');
            this.showLoadingOverlay(false);
            this.setAnalyzeButtonLoading(false);
            this.isLoading = false;
        }
    }

    setupFormValidation() {
        // Real-time validation feedback
        const $form = $('.analysis-form');
        const $analyzeBtn = $('#analyze_btn');
        
        // Initially disable the button
        $analyzeBtn.addClass('disabled').prop('disabled', true);
        
        // Add validation state indicators
        $form.addClass('needs-validation');
    }

    initializeAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            
            // Observe elements for animation
            document.querySelectorAll('.form-card, .notice-card, .result-card').forEach(el => {
                observer.observe(el);
            });
        }
        
        // Add staggered animations to existing elements
        $('.form-card').each((index, element) => {
            $(element).css('animation-delay', `${index * 100}ms`);
        });
    }

    showLoadingOverlay(show) {
        const $overlay = $('#loading_overlay');
        
        if (show) {
            $overlay.addClass('show');
            $('body').addClass('loading');
        } else {
            $overlay.removeClass('show');
            $('body').removeClass('loading');
        }
    }

    setAnalyzeButtonLoading(loading) {
        const $button = $('#analyze_btn');
        
        if (loading) {
            $button.addClass('loading').prop('disabled', true);
        } else {
            $button.removeClass('loading').prop('disabled', false);
        }
    }

    showSearchLoading(show) {
        const $searchIcon = $('.search-icon i');
        
        if (show) {
            $searchIcon.removeClass('fa-search').addClass('fa-spinner fa-spin');
        } else {
            $searchIcon.removeClass('fa-spinner fa-spin').addClass('fa-search');
        }
    }

    showNotification(message, type = 'info') {
        // Create and show notification
        const $notification = $(`
            <div class="notification notification-${type}">
                <div class="notification-content">
                    <i class="fas ${this.getNotificationIcon(type)}"></i>
                    <span>${message}</span>
                </div>
                <button class="notification-close" type="button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `);
        
        $('body').append($notification);
        
        // Show with animation
        setTimeout(() => $notification.addClass('show'), 100);
        
        // Auto-hide after delay
        const hideTimeout = setTimeout(() => {
            this.hideNotification($notification);
        }, type === 'error' ? 6000 : 4000);
        
        // Manual close
        $notification.find('.notification-close').on('click', () => {
            clearTimeout(hideTimeout);
            this.hideNotification($notification);
        });
    }

    hideNotification($notification) {
        $notification.removeClass('show');
        setTimeout(() => $notification.remove(), 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    handleSearchKeydown(event) {
        const $dropdown = $('#symptom_dropdown');
        const $options = $dropdown.find('option');
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if ($options.length > 0) {
                $dropdown.focus();
                $options.first().prop('selected', true);
            }
        }
    }

    selectFirstSymptom() {
        const $firstOption = $('#symptom_dropdown option:first');
        if ($firstOption.length > 0) {
            const symptom = $firstOption.val();
            this.addSymptom(symptom);
        }
    }

    clearSearch() {
        $('#symptom_search').val('');
    }

    updateDropdownState() {
        const $dropdown = $('#symptom_dropdown');
        const hasOptions = $dropdown.find('option').length > 0;
        
        $dropdown.toggleClass('has-options', hasOptions);
    }

    handleNavButtonClick(event) {
        const $button = $(event.currentTarget);
        
        // Add click animation
        $button.addClass('clicked');
        setTimeout(() => $button.removeClass('clicked'), 200);
        
        // Handle specific nav actions
        const tooltip = $button.data('tooltip');
        if (tooltip === 'Settings') {
            this.showNotification('Settings feature coming soon!', 'info');
        } else if (tooltip === 'Help') {
            this.showHelpModal();
        }
    }

    showHelpModal() {
        const helpContent = `
            <div class="help-modal">
                <div class="help-header">
                    <h3>How to Use MedInsight</h3>
                </div>
                <div class="help-content">
                    <div class="help-step">
                        <i class="fas fa-search"></i>
                        <div>
                            <h4>Search Symptoms</h4>
                            <p>Type in the search box to find symptoms you're experiencing</p>
                        </div>
                    </div>
                    <div class="help-step">
                        <i class="fas fa-plus"></i>
                        <div>
                            <h4>Select Symptoms</h4>
                            <p>Click on symptoms from the dropdown to add them to your list</p>
                        </div>
                    </div>
                    <div class="help-step">
                        <i class="fas fa-brain"></i>
                        <div>
                            <h4>Get Analysis</h4>
                            <p>Click "Analyze Symptoms" to get AI-powered health insights</p>
                        </div>
                    </div>
                </div>
                <div class="help-disclaimer">
                    <p><strong>Remember:</strong> This tool provides preliminary information only. Always consult healthcare professionals for medical advice.</p>
                </div>
            </div>
        `;
        
        this.showNotification(helpContent, 'info');
    }

    triggerHapticFeedback() {
        // Trigger haptic feedback on supported devices
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    // Utility function for debouncing
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }
}

// Initialize application when DOM is ready
$(document).ready(() => {
    window.medInsight = new MedInsight();
    
    // Add global error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (window.medInsight) {
            window.medInsight.showNotification('An unexpected error occurred', 'error');
        }
    });
    
    // Add performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`Page loaded in ${Math.round(perfData.loadEventEnd - perfData.loadEventStart)}ms`);
        });
    }
    
    // Service worker registration for future PWA features
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('/static/sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedInsight;
}
