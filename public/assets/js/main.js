
document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher --- //
    const themeSwitcher = document.getElementById('theme-switcher');
    const currentTheme = localStorage.getItem('theme');

    // Apply saved theme on load
    if (currentTheme) {
        document.body.setAttribute('data-theme', currentTheme);
        if (themeSwitcher) {
            themeSwitcher.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            let theme = document.body.getAttribute('data-theme');
            if (theme === 'dark') {
                document.body.removeAttribute('data-theme');
                localStorage.removeItem('theme');
                themeSwitcher.textContent = '🌙';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeSwitcher.textContent = '☀️';
            }
        });
    }

    // --- Hamburger Menu --- //
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.main-nav .nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});
