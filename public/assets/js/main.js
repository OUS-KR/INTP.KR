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
            e.stopPropagation(); // Prevent click from bubbling up to the document
            navLinks.classList.toggle('active');
        });
    }

    // --- Dropdown Menu Toggle (for both desktop and mobile) --- //
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling up to the document
            const dropdownMenu = toggle.nextElementSibling;
            
            // Close other open dropdowns
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.classList.remove('show');
                    menu.previousElementSibling.classList.remove('open');
                }
            });

            dropdownMenu.classList.toggle('show');
            toggle.classList.toggle('open');
        });
    });

    // --- Close Menus When Clicking Outside --- //
    document.addEventListener('click', (e) => {
        // Close hamburger menu if active
        if (navLinks.classList.contains('active')) {
            if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        }

        // Close all dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (!menu.previousElementSibling.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('show');
                menu.previousElementSibling.classList.remove('open');
            }
        });
    });
});