document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeToggleBtn.textContent = '☀️'; // Sun icon for light mode
    } else {
        themeToggleBtn.textContent = '🌙'; // Moon icon for dark mode
    }

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '🌙';
        }
    });
});