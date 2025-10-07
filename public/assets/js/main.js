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
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // --- Dropdown Menu --- //
    const dropdowns = document.querySelectorAll('.nav-item.dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other open dropdowns
                document.querySelectorAll('.nav-item.dropdown.show').forEach(openDropdown => {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                    }
                });
                dropdown.classList.toggle('show');
            });
        }
    });

    // Close dropdowns if clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-toggle')) {
            document.querySelectorAll('.nav-item.dropdown.show').forEach(openDropdown => {
                openDropdown.classList.remove('show');
            });
        }
    });
});