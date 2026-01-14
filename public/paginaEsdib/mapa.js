document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('map')) return;

    // --- CONFIGURACIÓN MAPA (SOLO ESPAÑA) ---
    // Límites aproximados para restringir la vista a España y alrededores
    const spainBounds = [
        [35.0, -10.0], // Sur-Oeste
        [44.5, 5.0]    // Nor-Este
    ];

    const map = L.map('map', {
        center: [40.4168, -3.7038], // Madrid
        zoom: 6,
        minZoom: 5,
        maxBounds: spainBounds,
        maxBoundsViscosity: 1.0 // Rebote duro al salir
    });

    // Usamos CartoDB Light para un diseño más limpio y moderno
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Variables de estado
    let allCentros = [];
    let allTipos = [];
    let markers = [];

    // Icono Personalizado Vidar (Punto rojo con halo)
    const vidarIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#bb0710; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(187,7,16,0.3);'></div>",
        iconSize: [20, 20],
        iconAnchor: [10, 10], // Centro
        popupAnchor: [0, -10]
    });

    // Cargar Datos
    try {
        const [resCentros, resTipos] = await Promise.all([
            fetch('/api/centros'),
            fetch('/api/tipos_donacion')
        ]);

        if (resCentros.ok) allCentros = await resCentros.json();
        if (resTipos.ok) allTipos = await resTipos.json();

        generateFilters();
        renderMarkers('all');

    } catch (error) {
        console.error('Error cargando datos del mapa:', error);
    }

    function renderMarkers(filterType) {
        // Limpiar mapa
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        // Limpiar Grid
        const grid = document.getElementById('centers-grid');
        const noMsg = document.getElementById('no-centers-msg');
        if (grid) grid.innerHTML = '';
        let countVisible = 0;

        allCentros.forEach(centro => {
            const hasCoords = centro.coordenadas && centro.coordenadas.lat && centro.coordenadas.lon;

            let show = false;
            if (filterType === 'all') {
                show = true;
            } else if (centro.tipos_disponibles && centro.tipos_disponibles.includes(filterType)) {
                show = true;
            }

            if (show) {
                countVisible++;

                // --- 1. PREPARAR ICONOS HTML ---
                const tiposIcons = centro.tipos_disponibles.map(id => {
                    const t = allTipos.find(at => at._id === id);
                    if (!t) return '';
                    let iconPath = 'ilustraciones_logos/sang.svg';
                    const n = t.nombre.toLowerCase();
                    if (n.includes('médula') || n.includes('medula')) iconPath = 'ilustraciones_logos/medula.svg';
                    else if (n.includes('órgano') || n.includes('organo')) iconPath = 'ilustraciones_logos/organ.svg';
                    else if (n.includes('leche')) iconPath = 'ilustraciones_logos/llet.svg';
                    else if (n.includes('cordón') || n.includes('cordon')) iconPath = 'ilustraciones_logos/cordon.svg';

                    return `<img src="${iconPath}" title="${t.nombre}" style="width:24px; height:24px; object-fit:contain;">`;
                }).join(' ');

                // --- 2. MAPA ---
                if (hasCoords) {
                    const popupContent = `
                        <div class="vidar-popup">
                            <div style="border-bottom: 2px solid #bb0710; margin-bottom: 8px; padding-bottom: 4px;">
                                <h3 style="margin:0; color:#bb0710; font-size:1.1rem;">${centro.nombre}</h3>
                            </div>
                            <div class="popup-body" style="font-size:0.9rem; color:#333;">
                                <p style="margin:4px 0;"><strong>📍</strong> ${centro.direccion || ''}</p>
                                <p style="margin:4px 0;"><strong>📞</strong> ${centro.telefono || ''}</p>
                                <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
                                    ${tiposIcons}
                                </div>
                            </div>
                        </div>
                    `;
                    const marker = L.marker([centro.coordenadas.lat, centro.coordenadas.lon], { icon: vidarIcon })
                        .bindPopup(popupContent, { minWidth: 200, maxWidth: 260 })
                        .addTo(map);

                    markers.push(marker);
                }

                // --- 3. LISTA (GRID) ---
                if (grid) {
                    const card = document.createElement('div');
                    card.className = 'center-card';
                    card.innerHTML = `
                        <h3>${centro.nombre}</h3>
                        <div class="center-info-row">
                            <span>📍</span>
                            <span>${centro.direccion || 'Dirección no disponible'}</span>
                        </div>
                        <div class="center-info-row">
                            <span>📞</span>
                            <span>${centro.telefono || 'Sin teléfono'}</span>
                        </div>
                         <div class="center-info-row">
                            <span>⏰</span>
                            <span>${centro.horario || 'Consultar horario'}</span>
                        </div>
                        <div class="center-icons">
                            ${tiposIcons}
                        </div>
                    `;
                    // Optional: click card to pan map
                    if (hasCoords) {
                        card.style.cursor = 'pointer';
                        card.title = 'Ver en el mapa';
                        card.addEventListener('click', () => {
                            document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
                            map.flyTo([centro.coordenadas.lat, centro.coordenadas.lon], 15, { duration: 1.5 });
                            setTimeout(() => {
                                const m = markers.find(mark => mark.getLatLng().lat === centro.coordenadas.lat && mark.getLatLng().lng === centro.coordenadas.lon);
                                if (m) m.openPopup();
                            }, 1600);
                        });
                    }
                    grid.appendChild(card);
                }
            }
        });

        if (noMsg) noMsg.style.display = countVisible === 0 ? 'block' : 'none';
        if (grid) grid.style.display = countVisible === 0 ? 'none' : 'grid';
    }

    function generateFilters() {
        const container = document.getElementById('filters-container');
        // Reset botones (manteniendo el contenedor limpio)
        container.innerHTML = '<button class="filter-btn active" data-type="all">Ver Todos</button>';

        allTipos.forEach(tipo => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = tipo.nombre;
            btn.dataset.type = tipo._id;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderMarkers(tipo._id);
            });

            container.appendChild(btn);
        });

        const btnAll = container.querySelector('[data-type="all"]');
        btnAll.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btnAll.classList.add('active');
            renderMarkers('all');
        });
    }
});
