// CONFIG
const API_BASE = '/api';
// API Key removed significantly improving security

// Estado global
let currentSection = 'donantes';
let editingId = null;

// Helpers
const q = (sel) => document.querySelector(sel);
const qa = (sel) => document.querySelectorAll(sel);
const val = (sel) => (q(sel)?.value ?? '').trim();

// Custom Alert Helper
function showAlert(message, type = 'success') {
  const existingAlert = document.getElementById('custom-alert');
  if (existingAlert) existingAlert.remove();

  const alertBox = document.createElement('div');
  alertBox.id = 'custom-alert';
  alertBox.className = `custom-alert ${type}`;

  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else {
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  alertBox.innerHTML = `${iconHtml}<span class="custom-alert-message">${message}</span>`;
  document.body.appendChild(alertBox);

  requestAnimationFrame(() => {
    alertBox.classList.add('show');
  });

  setTimeout(() => {
    alertBox.classList.remove('show');
    setTimeout(() => {
      alertBox.remove();
    }, 500);
  }, 3000);
}

// Custom Confirm Helper
function showConfirm(message) {
  return new Promise((resolve) => {
    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';

    // Create Box
    const box = document.createElement('div');
    box.className = 'custom-confirm-box';

    // Message
    const msg = document.createElement('p');
    msg.className = 'custom-confirm-message';
    msg.textContent = message;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'custom-confirm-actions';

    const btnYes = document.createElement('button');
    btnYes.className = 'btn-confirm-yes';
    btnYes.textContent = 'Aceptar';

    const btnNo = document.createElement('button');
    btnNo.className = 'btn-confirm-no';
    btnNo.textContent = 'Cancelar';

    // Append all
    actions.appendChild(btnNo);
    actions.appendChild(btnYes);
    box.appendChild(msg);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Handlers
    function close(result) {
      overlay.style.opacity = '0';
      box.style.transform = 'scale(0.9)';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 300);
    }

    btnYes.onclick = () => close(true);
    btnNo.onclick = () => close(false);
  });
}

// Fetch Wrapper
async function apiFetch(path, options = {}) {
  // Ensure we send cookies
  options.credentials = 'include';

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    alert('Sesión expirada. Redirigiendo...');
    window.location.href = '/?login=true'; // Redirect to login
    return null;
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Error');
    throw new Error(msg || 'Error de red');
  }
  return res.status !== 204 ? res.json() : null;
}

// --- LOGICA DE PESTAÑAS ---
function initTabs() {
  const tabs = qa('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // UI Update
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Section Update
      const target = tab.dataset.target;
      qa('.section-content').forEach(s => s.classList.remove('active'));
      document.getElementById(target).classList.add('active');

      // State Update
      currentSection = target;
      editingId = null;
      resetForms();
      loadList(target);
    });
  });
}

// --- LOGICA GENÉRICA DE LISTAS ---
async function loadList(section) {
  const listId = `list_${section}`;
  const ul = document.getElementById(listId);
  if (!ul) return;

  ul.innerHTML = 'Cargando...';

  try {
    let endpoint = section;
    if (section === 'tipos') endpoint = 'tipos_donacion';
    if (section === 'donaciones') endpoint = 'donaciones_realizadas';

    const data = await apiFetch(`/${endpoint}`);
    ul.innerHTML = '';

    if (data.length === 0) {
      ul.innerHTML = '<li>No hay registros</li>';
      return;
    }

    data.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-item';

      // Renderizado específico según sección
      let title = '';
      let subtitle = '';

      if (section === 'donantes') {
        title = `${item.nombre} ${item.apellidos || ''}`;
        subtitle = `${item.email} - ${item.provincia || ''}`;
      } else if (section === 'tipos') {
        title = item.nombre;
        subtitle = item.descripcion_general || '';
      } else if (section === 'centros') {
        title = item.nombre;
        subtitle = `${item.direccion || ''} (${item.provincia || ''})`;
      } else if (section === 'donaciones') {
        title = `Donación: ${item._id}`;
        subtitle = `Estado: ${item.estado} - Fecha: ${item.fecha_donacion ? new Date(item.fecha_donacion).toLocaleDateString() : 'N/A'}`;
      } else if (section === 'contacto') {
        title = `${item.nombre} (${item.email})`;
        subtitle = item.mensaje || '';
      } else if (section === 'noticias') {
        title = item.titulo;
        subtitle = `Fecha: ${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}`;
      }

      li.innerHTML = `
                <div class="list-info">
                  <h4>${title}</h4>
                  <p>${subtitle}</p>
                </div>
                <div class="actions">
                    <button class="btn-edit">Editar</button>
                    <button class="btn-del">Eliminar</button>
                </div>
            `;

      li.querySelector('.btn-edit').onclick = () => startEdit(section, item);
      li.querySelector('.btn-del').onclick = () => deleteItem(section, item._id);

      ul.appendChild(li);
    });

  } catch (e) {
    console.error(e);
    ul.innerHTML = 'Error al cargar lista';
  }
}

// --- LOGICA GENÉRICA DE FORMULARIOS ---
function getFormData(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((value, key) => {
    if (key === '_id') return; // ignoramos _id en el payload
    obj[key] = value;
  });
  return obj;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const section = currentSection;

  let endpoint = section;
  if (section === 'tipos') endpoint = 'tipos_donacion';
  if (section === 'donaciones') endpoint = 'donaciones_realizadas';

  let payload = getFormData(form);

  // --- LOGICA DE SUBIDA DE IMAGEN (SOLO NOTICIAS) ---
  const fileInput = form.querySelector('input[name="imagen_file"]');
  if (fileInput && fileInput.files.length > 0) {
    try {
      const uploadData = new FormData();
      uploadData.append('file', fileInput.files[0]);

      // Usamos fetch directo para multipart/form-data (no setear Content-Type manual)
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include', // Cookies
        body: uploadData
      });

      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      payload.imagen = data.url; // Asignar URL de Azure

    } catch (uploadErr) {
      showAlert('Falló la subida de imagen: ' + uploadErr.message, 'error');
      return; // Detener proceso
    }
  }
  // --------------------------------------------------

  try {
    if (editingId) {
      await apiFetch(`/${endpoint}/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showAlert('Actualizado correctamente', 'success');
    } else {
      await apiFetch(`/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showAlert('Creado correctamente', 'success');
    }
    resetForms();
    loadList(section);
  } catch (err) {
    showAlert('Error: ' + err.message, 'error');
  }
}

// --- LOGICA DE EDICIÓN Y BORRADO ---
function startEdit(section, item) {
  editingId = item._id;
  const formId = `form_${section}`;
  const form = document.getElementById(formId);
  if (!form) return;

  // Rellenar inputs
  Array.from(form.elements).forEach(el => {
    if (el.name && item[el.name] !== undefined) {
      if (el.type === 'date' && item[el.name]) {
        const d = new Date(item[el.name]);
        if (!isNaN(d.getTime())) {
          el.value = d.toISOString().split('T')[0];
        }
      } else {
        el.value = item[el.name];
      }
    }
    // Casos especiales
    if (section === 'centros' && el.name === 'lat' && item.coordenadas) el.value = item.coordenadas.lat;
    if (section === 'centros' && el.name === 'lon' && item.coordenadas) el.value = item.coordenadas.lon;
    if (section === 'centros' && el.name === 'tipos_disponibles' && Array.isArray(item.tipos_disponibles)) {
      el.value = item.tipos_disponibles.join(', ');
    }
  });

  // Cambiar botones
  const btnSubmit = form.querySelector('button[type="submit"]');
  const btnCancel = form.querySelector('.cancel-edit');
  if (btnSubmit) btnSubmit.textContent = 'ACTUALIZAR';
  if (btnCancel) btnCancel.style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteItem(section, id) {
  const confirmed = await showConfirm('¿Seguro que quieres eliminar este registro?');
  if (!confirmed) return;

  let endpoint = section;
  if (section === 'tipos') endpoint = 'tipos_donacion';
  if (section === 'donaciones') endpoint = 'donaciones_realizadas';

  try {
    await apiFetch(`/${endpoint}/${id}`, { method: 'DELETE' });
    loadList(section);
    if (editingId === id) resetForms();
  } catch (e) {
    showAlert('Error al eliminar: ' + e.message, 'error');
  }
}

function resetForms() {
  editingId = null;
  qa('form').forEach(f => {
    f.reset();
    const btnSubmit = f.querySelector('button[type="submit"]');
    const btnCancel = f.querySelector('.cancel-edit');
    if (btnSubmit) btnSubmit.textContent = btnSubmit.textContent.replace('ACTUALIZAR', 'GUARDAR'); // Simple hack
    if (btnSubmit && btnSubmit.textContent.includes('ACTUALIZAR')) btnSubmit.textContent = 'GUARDAR'; // Fallback
    if (btnCancel) btnCancel.style.display = 'none';
  });

  // Restaurar textos originales de botones si es necesario
  // (Simplificado: asumimos que el texto original contiene "GUARDAR")
  qa('button[type="submit"]').forEach(b => {
    if (b.textContent === 'ACTUALIZAR') b.textContent = 'GUARDAR';
  });
}

// --- ARRANQUE ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // Listeners formularios
  qa('form').forEach(f => {
    f.addEventListener('submit', handleFormSubmit);
    f.querySelector('.cancel-edit')?.addEventListener('click', resetForms);
  });

  // Cargar sección inicial
  loadList('donantes');
});