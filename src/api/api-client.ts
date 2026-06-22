const BASE = '/api/v1';

function token(): string | null {
  return localStorage.getItem('token');
}

export const api = {
  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = `Bearer ${t}`;
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error((data as any).detail || 'Request failed');
    return data;
  },

  get(path: string) { return this.request('GET', path); },
  post(path: string, body?: unknown) { return this.request('POST', path, body); },
  put(path: string, body?: unknown) { return this.request('PUT', path, body); },
  delete(path: string) { return this.request('DELETE', path); },
};

export function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function showModal(title: string, content: string, onConfirm?: () => void) {
  const overlay = document.getElementById('modal-overlay')!;
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-content">
        <div class="modal-header">${title}</div>
        <div>${content}</div>
        <div class="modal-actions">
          <button class="btn btn-outline close-modal">Cancel</button>
          ${onConfirm ? '<button class="btn btn-primary confirm-modal">Confirm</button>' : ''}
        </div>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  overlay.querySelector('.close-modal')?.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.querySelector('.confirm-modal')?.addEventListener('click', () => { onConfirm?.(); overlay.classList.add('hidden'); });
}
