const root = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const icon = document.querySelector('[data-theme-icon]');
const year = document.querySelector('[data-year]');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  root.classList.add('dark');
  icon.textContent = '☀';
}

toggle?.addEventListener('click', () => {
  const isDark = root.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  icon.textContent = isDark ? '☀' : '☾';
});

if (year) year.textContent = new Date().getFullYear();

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
