import { signIn, signUp } from '../services/auth.js';
import { qs, showError, clearError, showStatus, clearStatus } from './dom.js';

/**
 * Modal de login/signup reutilizable. Se abre bajo demanda (ver colección o
 * agregar una planta sin sesión) en vez de forzar una navegación a una página
 * de login aparte.
 */
export function wireAuthModal() {
  const dialog = qs('#dialog-auth');
  if (!dialog) return { open: () => {} };

  const form = qs('#form-auth', dialog);
  const errorEl = qs('#error-auth', dialog);
  const statusEl = qs('#status-auth', dialog);
  const closeBtn = qs('.modal-close', dialog);
  const toggleBtn = qs('#btn-toggle-auth', dialog);
  const submitBtn = qs('#btn-submit-auth', dialog);
  const titulo = qs('#titulo-form-auth', dialog);

  let modo = 'login';
  let onSuccess = null;
  let onDismiss = null;
  let succeeded = false;

  function actualizarModo() {
    if (modo === 'login') {
      titulo.textContent = 'Iniciar sesión';
      submitBtn.textContent = 'Iniciar sesión';
      toggleBtn.textContent = '¿No tenés cuenta? Creá una';
    } else {
      titulo.textContent = 'Crear cuenta';
      submitBtn.textContent = 'Crear cuenta';
      toggleBtn.textContent = '¿Ya tenés cuenta? Iniciá sesión';
    }
  }

  function resetForm() {
    form.reset();
    clearError(errorEl);
    clearStatus(statusEl);
    modo = 'login';
    actualizarModo();
  }

  // Cerrar con la X es un descarte, igual que Escape o el backdrop: el listener
  // de `close` de más abajo se encarga de limpiar el formulario y avisar.
  closeBtn?.addEventListener('click', () => dialog.close());

  toggleBtn.addEventListener('click', () => {
    modo = modo === 'login' ? 'signup' : 'login';
    clearError(errorEl);
    clearStatus(statusEl);
    actualizarModo();
  });

  // Distingue un cierre por login exitoso (submit ya llamó a onSuccess) de un
  // cierre por Escape/backdrop, donde corresponde avisar via onDismiss.
  dialog.addEventListener('close', () => {
    const dismissed = !succeeded;
    succeeded = false;
    resetForm();
    if (dismissed && onDismiss) onDismiss();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);
    clearStatus(statusEl);
    const email = qs('#email-auth', dialog).value;
    const password = qs('#password-auth', dialog).value;
    const submitBtn = qs('#btn-submit-auth', dialog);

    if (!email || !password) {
      showError(errorEl, 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      showError(errorEl, 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cargando...';

    try {
      const data = modo === 'login' ? await signIn(email, password) : await signUp(email, password);

      if (!data?.session) {
        showStatus(statusEl, '✓ Cuenta creada. Te enviamos un email de confirmación. Confirmalo y después iniciá sesión.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      const callback = onSuccess;
      succeeded = true;
      submitBtn.textContent = '✓ ' + originalText;
      dialog.close();
      if (callback) await callback(data.session);
    } catch (err) {
      showError(errorEl, err.message);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  return {
    open({ onSuccess: onSuccessCallback, onDismiss: onDismissCallback } = {}) {
      onSuccess = onSuccessCallback ?? null;
      onDismiss = onDismissCallback ?? null;
      succeeded = false;
      actualizarModo();
      dialog.showModal();
    },
  };
}
