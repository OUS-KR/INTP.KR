document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    // --- Theme Switcher --- //
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if(themeSwitcher) themeSwitcher.textContent = '☀️';
        } else {
            document.body.removeAttribute('data-theme');
            if(themeSwitcher) themeSwitcher.textContent = '🌙';
        }
    };

    const currentTheme = localStorage.getItem('theme');
    applyTheme(currentTheme);

    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            let theme = document.body.getAttribute('data-theme');
            if (theme === 'dark') {
                localStorage.removeItem('theme');
                applyTheme('light');
            } else {
                localStorage.setItem('theme', 'dark');
                applyTheme('dark');
            }
        });
    }

    // --- Hamburger Menu --- //
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            // When opening hamburger, close any open dropdowns
            if (navLinks.classList.contains('active')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                    menu.previousElementSibling.classList.remove('open');
                });
            }
        });
    }

    // --- Dropdown Menu Toggle (for MOBILE ONLY) --- //
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Only run this click logic if the hamburger is visible (i.e., on mobile)
            if (window.getComputedStyle(hamburger).display === 'block') {
                e.preventDefault();
                const dropdownMenu = toggle.nextElementSibling;

                // Close other open dropdowns within the mobile nav
                toggle.closest('.nav-links').querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    if (menu !== dropdownMenu) {
                        menu.classList.remove('show');
                        menu.previousElementSibling.classList.remove('open');
                    }
                });

                // Toggle the current dropdown
                dropdownMenu.classList.toggle('show');
                toggle.classList.toggle('open');
            }
        });
    });

    // --- Close Menus When Clicking Outside --- //
    document.addEventListener('click', (e) => {
        // Close hamburger menu if click is outside
        if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            navLinks.classList.remove('active');
            // Also close any open dropdowns when closing the hamburger menu
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
                menu.previousElementSibling.classList.remove('open');
            });
        }
    });
});