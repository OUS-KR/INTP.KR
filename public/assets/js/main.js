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
            // Close all dropdowns when hamburger menu is toggled
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }

    // --- Dropdown Menu Toggle (for mobile and desktop click) --- //
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            const dropdownMenu = toggle.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                // Close other open dropdowns in the same nav-links
                const parentNavLinks = toggle.closest('.nav-links');
                if (parentNavLinks) {
                    parentNavLinks.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                        if (menu !== dropdownMenu) {
                            menu.classList.remove('show');
                        }
                    });
                }
                dropdownMenu.classList.toggle('show');
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.nav-links')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
});