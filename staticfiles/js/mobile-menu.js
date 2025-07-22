/**
 * Mobile Menu Handler
 * Professional mobile sidebar menu with smooth animations
 */

class MobileMenu {
    constructor() {
        this.menuToggle = document.getElementById('mobile-menu-toggle');
        this.sidebar = document.getElementById('mobile-sidebar');
        this.overlay = document.getElementById('mobile-overlay');
        this.closeBtn = document.getElementById('mobile-menu-close');
        this.body = document.body;
        
        this.init();
    }

    init() {
        if (!this.menuToggle || !this.sidebar || !this.overlay) {
            console.warn('Mobile menu elements not found');
            return;
        }

        this.bindEvents();
        this.setupInitialState();
    }

    bindEvents() {
        // Toggle menu on hamburger click
        this.menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMenu();
        });

        // Close menu on overlay click
        this.overlay.addEventListener('click', () => {
            this.closeMenu();
        });

        // Close menu on close button click
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.closeMenu();
            });
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeMenu();
            }
        });

        // Close menu when clicking on menu links
        const menuLinks = this.sidebar.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });

        // Handle resize events
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && this.isMenuOpen()) {
                this.closeMenu();
            }
        });
    }

    setupInitialState() {
        // Ensure menu is closed initially
        this.sidebar.classList.remove('mobile-sidebar-open');
        this.overlay.classList.remove('mobile-overlay-active');
        this.body.classList.remove('mobile-menu-active');
        this.updateHamburgerIcon(false);
    }

    toggleMenu() {
        if (this.isMenuOpen()) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.sidebar.classList.add('mobile-sidebar-open');
        this.overlay.classList.add('mobile-overlay-active');
        this.body.classList.add('mobile-menu-active');
        this.updateHamburgerIcon(true);
        
        // Add animation class
        this.sidebar.style.transform = 'translateX(0)';
        this.overlay.style.opacity = '1';
        this.overlay.style.visibility = 'visible';
    }

    closeMenu() {
        this.sidebar.classList.remove('mobile-sidebar-open');
        this.overlay.classList.remove('mobile-overlay-active');
        this.body.classList.remove('mobile-menu-active');
        this.updateHamburgerIcon(false);
        
        // Remove animation class
        this.sidebar.style.transform = 'translateX(-100%)';
        this.overlay.style.opacity = '0';
        this.overlay.style.visibility = 'hidden';
    }

    isMenuOpen() {
        return this.sidebar.classList.contains('mobile-sidebar-open');
    }

    updateHamburgerIcon(isOpen) {
        const hamburgerLines = this.menuToggle.querySelectorAll('.hamburger-line');
        
        if (isOpen) {
            hamburgerLines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            hamburgerLines[1].style.opacity = '0';
            hamburgerLines[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            this.menuToggle.classList.add('active');
        } else {
            hamburgerLines[0].style.transform = 'rotate(0) translate(0, 0)';
            hamburgerLines[1].style.opacity = '1';
            hamburgerLines[2].style.transform = 'rotate(0) translate(0, 0)';
            this.menuToggle.classList.remove('active');
        }
    }
}

// Initialize mobile menu when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MobileMenu();
});

// Export for potential use in other modules
window.MobileMenu = MobileMenu;
