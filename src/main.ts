import { router } from './api/router';

const nav = document.getElementById('nav-links')!;
nav.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a');
  if (!a) return;
  e.preventDefault();
  const page = a.dataset.page;
  if (page) router.navigate(page);
});

const token = localStorage.getItem('token');
if (token) {
  router.navigate('dashboard');
}
