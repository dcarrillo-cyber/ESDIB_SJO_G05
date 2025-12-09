

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
                alert('Bienvenido ' + result.user.username);
                checkSession();
                formLogin.reset();
            } else {
                alert(result.error || 'Error al iniciar sesión');
            }
        } catch (err) {
            alert('Error de conexión');
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
                alert('Registro exitoso. Ahora puedes iniciar sesión.');
                showLogin();
                formRegister.reset();
            } else {
                alert(result.error || 'Error al registrarse');
            }
        } catch (err) {
            alert('Error de conexión');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        checkSession();
        alert('Has cerrado sesión');
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
                    alert('Mensaje enviado correctamente');
                    contactForm.reset();
                } else {
                    const errorData = await res.json();
                    alert('Error al enviar: ' + (errorData.error || 'Desconocido'));
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión al enviar mensaje');
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
        const dateStr = item.fecha ? new Date(item.fecha).toLocaleDateString() : '';
        const title = escapeHtml(item.titulo);
        const img = item.imagen || 'ilustraciones_logos/sang.svg';
        const content = escapeHtml(item.contenido);

        return `
        <div class="swiper-slide">
            <div class="noticias">
                <h3>${title}</h3>
                <img src="${img}" alt="${title}" loading="lazy" style="will-change: transform;">
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
});