import { renderDashboard } from '../pages/dashboard';
import { renderOrder } from '../pages/order';
import { renderStrategies } from '../pages/strategies';
import { renderSettings } from '../pages/settings';
import { renderLogin } from '../pages/login';

type Page = 'login' | 'dashboard' | 'order' | 'strategies' | 'settings';

class Router {
  current: Page = 'login';

  navigate(page: Page) {
    this.current = page;
    const main = document.getElementById('main-content')!;
    const loginPage = document.querySelector('.login-page');
    const navbar = document.getElementById('navbar')!;
    const navLinks = navbar.querySelectorAll('#nav-links a');

    // Handle login page separately (no navbar)
    if (page === 'login') {
      navbar.classList.add('hidden');
      main.innerHTML = '';
      renderLogin(main);
      return;
    }

    navbar.classList.remove('hidden');
    navLinks.forEach(a => a.classList.toggle('active', (a as HTMLElement).dataset.page === page));
    main.innerHTML = '';

    switch (page) {
      case 'dashboard': renderDashboard(main); break;
      case 'order': renderOrder(main); break;
      case 'strategies': renderStrategies(main); break;
      case 'settings': renderSettings(main); break;
    }
  }
}

export const router = new Router();
