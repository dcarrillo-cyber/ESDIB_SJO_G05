

// --- SWIPER LOGIC (Dynamic) ---
let swiperInstance = null;

function initSwiper(slideCount) {
    // Determine if loop should be enabled
    // We need loop only if we have enough slides for the largest breakpoint (3)
    const enableLoop = slideCount >= 3;

    if (swiperInstance) {
        swiperInstance.destroy(true, true);
    }

    swiperInstance = new Swiper(".mySwiper", {
        slidesPerView: 3,
        spaceBetween: 30,
        loop: enableLoop,
        // loopFillGroupWithBlank: true, // Only if we want to fill usage groups
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev"
        },
        breakpoints: {
            0: {
                slidesPerView: 1
            },
            520: {
                slidesPerView: 2
            },
            950: {
                slidesPerView: 3
            }
        }
    });
    window.swiper = swiperInstance;
}

// --- AUTH LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const authModal = document.getElementById('auth-modal');
    const openLoginBtn = document.getElementById('open-login-btn');
    const closeModalBtn = document.querySelector('.close-modal');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const navLogin = document.getElementById('nav-login');
    const navUser = document.getElementById('nav-user');
    const logoutBtn = document.getElementById('logout-btn');

    // Forms
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const contactForm = document.getElementById('contact-form-main');

    // Check Session on Init
    checkSession();

    // --- MODAL & TABS ---
    if (openLoginBtn) openLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (authModal) {
            authModal.style.display = 'flex';
            showLogin();
        }
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
        if (authModal) authModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (authModal && e.target === authModal) authModal.style.display = 'none';
    });

    if (goToRegister) goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });

    if (goToLogin) goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    function showLogin() {
        if (loginSection) loginSection.style.display = 'block';
        if (registerSection) registerSection.style.display = 'none';
    }

    function showRegister() {
        if (loginSection) loginSection.style.display = 'none';
        if (registerSection) registerSection.style.display = 'block';
    }

    // --- AUTH ACTIONS ---
    if (formLogin) formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = formLogin.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';

        const formData = new FormData(formLogin);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(result.user));
                if (authModal) authModal.style.display = 'none';
                // --- CUSTOM ALERT LOGIC ---
                showAlert('Bienvenido ' + result.user.username, 'success');

                checkSession();
                formLogin.reset();
            } else {
                showAlert(result.error || 'Error al iniciar sesión', 'error');
            }
        } catch (err) {
            showAlert('Error de conexión', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    if (formRegister) formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = formRegister.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        const formData = new FormData(formRegister);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                showAlert('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
                showLogin();
                formRegister.reset();
            } else {
                showAlert(result.error || 'Error al registrarse', 'error');
            }
        } catch (err) {
            showAlert('Error de conexión', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error('Logout error', err);
        }
        localStorage.removeItem('user');
        checkSession();
        showAlert('Has cerrado sesión', 'success');
        // Optional: Reload to ensure clean state
        setTimeout(() => window.location.reload(), 1000);
    });

    function checkSession() {
        const user = JSON.parse(localStorage.getItem('user'));
        const navAdmin = document.getElementById('nav-admin');

        if (user) {
            if (navLogin) navLogin.style.display = 'none';
            if (navUser) {
                navUser.style.display = 'block';
                navUser.querySelector('a').textContent = `Salir (${user.username})`;
            }
            if (navAdmin) navAdmin.style.display = (user.role === 'admin') ? 'block' : 'none';
        } else {
            if (navLogin) navLogin.style.display = 'block';
            if (navUser) navUser.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
        }
    }

    // --- CONTACT FORM ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const nombre = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const mensaje = document.getElementById('contact-message').value;

            try {
                const res = await fetch('/api/contacto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, mensaje })
                });

                if (res.ok) {
                    showAlert('Mensaje enviado correctamente', 'success');
                    contactForm.reset();
                } else {
                    const errorData = await res.json();
                    showAlert('Error al enviar: ' + (errorData.error || 'Desconocido'), 'error');
                }
            } catch (err) {
                console.error(err);
                showAlert('Error de conexión al enviar mensaje', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // --- LOAD DYNAMIC NEWS ---
    async function loadNews() {
        const wrapper = document.querySelector('.swiper-wrapper');
        try {
            // Loader
            if (wrapper) wrapper.innerHTML = '<div class="swiper-slide" style="width:100%;"><p style="text-align:center; display:block; padding:20px;">Cargando nuevas noticias...</p></div>';

            const res = await fetch('/api/noticias');
            if (!res.ok) throw new Error('Error fetch');
            const news = await res.json();

            if (wrapper) wrapper.innerHTML = '';

            if (news && news.length > 0) {
                const newSlides = news.map(n => createNewsSlide(n)).join('');
                if (wrapper) wrapper.innerHTML = newSlides;
                // Init swiper with correct item count to decide on Loop
                initSwiper(news.length);
            } else {
                if (wrapper) wrapper.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No hay noticias recientes.</p>';
                initSwiper(0); // No loop
            }
        } catch (e) {
            console.error('Error loading news:', e);
            if (wrapper) wrapper.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No se pudieron cargar las noticias.</p>';
        }
    }

    function createNewsSlide(item) {
        // Fix for Timezone issue: treat stored date as UTC
        let dateStr = 'Fecha no disponible';
        if (item.fecha) {
            const d = new Date(item.fecha);
            if (!isNaN(d.getTime())) {
                const day = String(d.getUTCDate()).padStart(2, '0');
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const year = d.getUTCFullYear();
                dateStr = `${day}/${month}/${year}`;
            }
        }
        const title = escapeHtml(item.titulo);
        const img = item.imagen || 'ilustraciones_logos/sang.svg';
        const content = escapeHtml(item.contenido);

        return `
        <div class="swiper-slide">
            <div class="noticias">
                <h3>${title}</h3>
                <img src="${img}" alt="${title}" loading="lazy" style="will-change: transform;" onerror="this.onerror=null;this.src='ilustraciones_logos/sang.svg';">
                <p>${content}</p>
                <p>${dateStr}</p>
                <a href="#" class="saber-mas-btn1">Saber más</a>
            </div>
        </div>
        `;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    loadNews();

    // --- CUSTOM ALERT HELPER ---
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
});