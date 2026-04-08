/* ============================================================
   PARIS — TERRITOIRE, MOBILITÉ & CARBONE
   script.js — Données + Carte + CO₂ + Dataviz
   Sources : INSEE 2019 · Paris Open Data · AIRPARIF 2023 · APUR
   ============================================================ */

// ── DONNÉES COMPLÈTES ─────────────────────────────────────────
// co2 : tCO₂eq/hab/an (AIRPARIF/APUR 2023 — transport + résidentiel)
// score : calculé (espVerts 40% + kmPistes 30% + CO₂ inversé 30%)
const DATA = {
     1: { nom:"1er",  densite: 9800,  espVerts: 1.6,  kmPistes: 18.2, co2: 4.2 },
     2: { nom:"2e",   densite:22900,  espVerts: 0.2,  kmPistes:  9.1, co2: 3.9 },
     3: { nom:"3e",   densite:30300,  espVerts: 0.9,  kmPistes: 11.4, co2: 3.4 },
     4: { nom:"4e",   densite:17900,  espVerts: 2.5,  kmPistes: 14.8, co2: 3.6 },
     5: { nom:"5e",   densite:23500,  espVerts: 1.6,  kmPistes: 16.3, co2: 3.2 },
     6: { nom:"6e",   densite:20300,  espVerts: 0.8,  kmPistes: 12.7, co2: 3.5 },
     7: { nom:"7e",   densite:14000,  espVerts: 7.6,  kmPistes: 22.4, co2: 3.0 },
     8: { nom:"8e",   densite:10200,  espVerts: 6.4,  kmPistes: 24.1, co2: 5.8 },
     9: { nom:"9e",   densite:28000,  espVerts: 0.4,  kmPistes: 13.5, co2: 3.7 },
    10: { nom:"10e",  densite:31500,  espVerts: 0.8,  kmPistes: 19.7, co2: 3.2 },
    11: { nom:"11e",  densite:41400,  espVerts: 0.8,  kmPistes: 21.3, co2: 3.0 },
    12: { nom:"12e",  densite: 8800,  espVerts:74.5,  kmPistes: 62.8, co2: 2.8 },
    13: { nom:"13e",  densite:25600,  espVerts: 2.3,  kmPistes: 31.2, co2: 2.9 },
    14: { nom:"14e",  densite:24900,  espVerts: 4.5,  kmPistes: 27.6, co2: 3.0 },
    15: { nom:"15e",  densite:28200,  espVerts: 3.3,  kmPistes: 38.4, co2: 2.9 },
    16: { nom:"16e",  densite:10300,  espVerts:56.3,  kmPistes: 54.7, co2: 3.8 },
    17: { nom:"17e",  densite:30000,  espVerts: 2.8,  kmPistes: 29.3, co2: 3.3 },
    18: { nom:"18e",  densite:32400,  espVerts: 2.8,  kmPistes: 33.8, co2: 3.1 },
    19: { nom:"19e",  densite:27700,  espVerts: 3.7,  kmPistes: 41.2, co2: 2.8 },
    20: { nom:"20e",  densite:32900,  espVerts: 4.8,  kmPistes: 28.9, co2: 2.9 }
};

// Constantes
const SEUIL_OMS   = 9;
const MAX_EV      = 74.5;
const MAX_KM      = 62.8;
const MAX_DENSITE = 41400;
const MAX_CO2     = 5.8;
const MIN_CO2     = 2.8;
const MOY_CO2     = 3.4;

// Calcul score environnemental /100
// EV : 0→40 points, KM : 0→30 points, CO2 : 0→30 points (inversé)
function calcScore(d) {
    const s_ev  = Math.min(d.espVerts / MAX_EV, 1) * 40;
    const s_km  = Math.min(d.kmPistes / MAX_KM, 1) * 30;
    const s_co2 = (1 - Math.min((d.co2 - MIN_CO2) / (MAX_CO2 - MIN_CO2), 1)) * 30;
    return Math.round(s_ev + s_km + s_co2);
}

// Ajouter le score à chaque arrondissement
Object.values(DATA).forEach(d => { d.score = calcScore(d); });

// ── COULEURS ──────────────────────────────────────────────────
function couleurDensite(d) {
    if (d > 38000) return '#67000d';
    if (d > 30000) return '#BD0026';
    if (d > 24000) return '#FC4E2A';
    if (d > 18000) return '#FD8D3C';
    if (d > 12000) return '#FEB24C';
    return '#FFEDA0';
}

function couleurCO2(v) {
    const ratio = (v - MIN_CO2) / (MAX_CO2 - MIN_CO2);
    const r = Math.round(63  + ratio * 185);
    const g = Math.round(185 - ratio * 175);
    const b = Math.round(80  - ratio * 60);
    return `rgba(${r},${g},${b},0.75)`;
}

function couleurScore(s) {
    if (s >= 60) return '#3fb950';
    if (s >= 40) return '#d29922';
    return '#f85149';
}

function couleurBarre(ev) {
    const ratio = Math.min(ev / MAX_EV, 1);
    return `rgb(${Math.round(192-ratio*120)},${Math.round(80+ratio*140)},${Math.round(80-ratio*40)})`;
}


// ══════════════════════════════════════════════════════════════
// 1. CARTE LEAFLET
// ══════════════════════════════════════════════════════════════
const map = L.map('map', { zoomControl: true }).setView([48.8566, 2.3522], 12);

const TILES = {
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { subdomains:'abcd', attribution:'© CartoDB' }),
    dark:  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { subdomains:'abcd', attribution:'© CartoDB' })
};
TILES.light.addTo(map);

const LABELS = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    { subdomains:'abcd', pane:'shadowPane' });

let choroplethLayer = null;
let layerPistes     = null;
let layerCO2        = null;
let activeOverlay   = null;

// — Arrondissements —
const URL_ARR = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson?lang=fr';

fetch(URL_ARR)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(geojson => {
        choroplethLayer = L.geoJSON(geojson, {
            style: f => {
                const num = getNum(f);
                const d   = DATA[num];
                return { fillColor: d ? couleurDensite(d.densite) : '#ccc',
                         fillOpacity: 0.65, color: 'rgba(255,255,255,0.4)', weight: 1.5 };
            },
            onEachFeature: (f, layer) => {
                const num = getNum(f);
                const d   = DATA[num];
                if (!d) return;
                layer.on('mouseover', function () {
                    this.setStyle({ fillOpacity: 0.85, weight: 2.5, color: '#fff' });
                    this.bringToFront();
                });
                layer.on('mouseout', function () { choroplethLayer.resetStyle(this); });
                layer.on('click', function () {
                    ouvrirSidebar(d, num);
                    map.flyToBounds(this.getBounds(), { padding: [40, 40], duration: 0.9 });
                });
            }
        }).addTo(map);
        LABELS.addTo(map);

        // Construire aussi la couche CO2 maintenant
        layerCO2 = L.geoJSON(geojson, {
            style: f => {
                const num = getNum(f);
                const d   = DATA[num];
                return { fillColor: d ? couleurCO2(d.co2) : '#ccc',
                         fillOpacity: 0.75, color: 'rgba(255,255,255,0.3)', weight: 1 };
            },
            onEachFeature: (f, layer) => {
                const num = getNum(f);
                const d   = DATA[num];
                if (d) layer.bindTooltip(
                    `<b>${d.nom}</b> — ${d.co2} tCO₂/hab/an`,
                    { sticky: true, className: 'co2-tooltip' }
                );
            }
        });
    })
    .catch(() => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:400;pointer-events:none;';
        el.innerHTML = '<div style="background:rgba(13,17,23,0.9);color:#c9d1d9;padding:16px 24px;border-radius:10px;font-size:.88rem;text-align:center;border:1px solid #30363d;">⚠️ Carte non chargée en local<br><small>Fonctionne sur GitHub Pages · ou : python -m http.server 8000</small></div>';
        document.getElementById('map').style.position = 'relative';
        document.getElementById('map').appendChild(el);
    });

// — Pistes cyclables —
fetch('data/pistes_cyclables.json')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(geojson => {
        layerPistes = L.geoJSON(geojson, {
            style: f => {
                const type = (f.properties.amenagement || '').toLowerCase();
                let color = '#3fb950';
                if (type.includes('bande'))   color = '#58a6ff';
                if (type.includes('voie'))    color = '#a97dff';
                if (type.includes('couloir')) color = '#d29922';
                return { color, weight: 1.8, opacity: 0.8 };
            },
            onEachFeature: (f, l) => {
                const type = f.properties.amenagement || 'Aménagement cyclable';
                const nom  = f.properties.nom || '';
                l.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:.82rem;color:#c9d1d9;background:#161b22;padding:8px;border-radius:6px;">🚴 <b style="color:#e6edf3;">${type}</b>${nom ? '<br><span style="color:#8b949e">'+nom+'</span>' : ''}</div>`,
                    { className: 'dark-popup' });
            }
        });
        document.getElementById('lcMsg').textContent = '';
    })
    .catch(() => {
        document.getElementById('lcMsg').textContent = '⚠️ Fichier data/pistes_cyclables.json introuvable';
    });

// Contrôle des couches
document.querySelectorAll('input[name="layer"]').forEach(r => {
    r.addEventListener('change', function () {
        if (activeOverlay) { map.removeLayer(activeOverlay); activeOverlay = null; }
        if (this.value === 'pistes' && layerPistes) {
            layerPistes.addTo(map); activeOverlay = layerPistes;
            document.getElementById('lcMsg').textContent = '🟢 Piste cyclable  🔵 Bande  🟣 Voie verte  🟡 Couloir';
        } else if (this.value === 'co2' && layerCO2) {
            layerCO2.addTo(map); activeOverlay = layerCO2;
            document.getElementById('lcMsg').textContent = '🟢 Faible CO₂ → 🔴 Élevé';
        } else {
            document.getElementById('lcMsg').textContent = '';
        }
    });
});

function getNum(f) {
    const raw = f.properties.c_ar || f.properties.c_arinsee || 0;
    const n   = parseInt(raw);
    return n > 100 ? n - 75100 : n;
}

// Zooms rapides
document.querySelectorAll('.zbtn').forEach(btn => {
    btn.addEventListener('click', () => {
        map.flyTo([+btn.dataset.lat, +btn.dataset.lng], +btn.dataset.zoom,
            { animate: true, duration: 1.1 });
    });
});


// ══════════════════════════════════════════════════════════════
// 2. SIDEBAR
// ══════════════════════════════════════════════════════════════
const sdDefault = document.getElementById('sidebarDefault');
const sdStats   = document.getElementById('sidebarStats');

document.getElementById('sbClose').addEventListener('click', () => {
    sdStats.classList.add('hidden');
    sdDefault.classList.remove('hidden');
});

function ouvrirSidebar(d, num) {
    sdDefault.classList.add('hidden');
    sdStats.classList.remove('hidden');

    document.getElementById('sbArrName').textContent  = d.nom + ' arrondissement';
    document.getElementById('sbDensite').textContent  = d.densite.toLocaleString('fr-FR');
    document.getElementById('sbVert').textContent     = d.espVerts;
    document.getElementById('sbVelo').textContent     = d.kmPistes;
    document.getElementById('sbCo2').textContent      = d.co2;

    // Score
    const score = d.score;
    document.getElementById('sbScore').textContent = score;
    document.getElementById('sbScore').style.color = couleurScore(score);

    // Jauge CO2
    const pctCO2 = ((d.co2 - 0) / 6) * 100;
    document.getElementById('co2GaugeFill').style.width = Math.min(pctCO2, 100) + '%';

    // Mini barres
    document.getElementById('sbBars').innerHTML = `
        <div class="sbr"><span class="sbr-lbl">Esp. verts</span>
            <div class="sbr-track"><div class="sbr-fill" style="width:${(d.espVerts/MAX_EV*100).toFixed(1)}%;background:#3fb950;"></div></div>
            <span class="sbr-val">${d.espVerts} m²</span></div>
        <div class="sbr"><span class="sbr-lbl">Pistes</span>
            <div class="sbr-track"><div class="sbr-fill" style="width:${(d.kmPistes/MAX_KM*100).toFixed(1)}%;background:#58a6ff;"></div></div>
            <span class="sbr-val">${d.kmPistes} km</span></div>
        <div class="sbr"><span class="sbr-lbl">Densité</span>
            <div class="sbr-track"><div class="sbr-fill" style="width:${(d.densite/MAX_DENSITE*100).toFixed(1)}%;background:#f85149;"></div></div>
            <span class="sbr-val">${(d.densite/1000).toFixed(0)}k</span></div>
        <div class="sbr"><span class="sbr-lbl">CO₂</span>
            <div class="sbr-track"><div class="sbr-fill" style="width:${(d.co2/MAX_CO2*100).toFixed(1)}%;background:#ff7b00;"></div></div>
            <span class="sbr-val">${d.co2} t</span></div>
    `;

    // Analyse contextuelle
    let analyse = '';
    if (d.co2 > 4.5)
        analyse = `⚠️ Le ${d.nom} est un point chaud CO₂ : ${d.co2} tCO₂/hab/an, soit ${((d.co2/MOY_CO2-1)*100).toFixed(0)}% au-dessus de la moyenne parisienne. Fort trafic automobile et bâtiments énergivores.`;
    else if (d.espVerts < 1)
        analyse = `🏙️ Le ${d.nom} souffre d'un déficit sévère d'espaces verts (${d.espVerts} m²/hab vs 9 m² OMS). Ses ${d.kmPistes} km de pistes cyclables constituent un levier de mobilité douce essentiel.`;
    else if (d.espVerts > 20)
        analyse = `🌳 Le ${d.nom} affiche ${d.espVerts} m²/hab d'espaces verts, incluant les grands massifs forestiers (Bois). Ses émissions CO₂ relativement basses (${d.co2} t) reflètent un profil modal plus actif.`;
    else if (d.densite > 35000)
        analyse = `🏙️ Avec ${d.densite.toLocaleString('fr-FR')} hab/km², le ${d.nom} est parmi les plus denses. Son réseau cyclable de ${d.kmPistes} km contribue à limiter les émissions (${d.co2} tCO₂/hab/an).`;
    else
        analyse = `📊 Score environnemental de ${score}/100. ${d.kmPistes} km de pistes cyclables et ${d.espVerts} m²/hab d'espaces verts pour ${d.co2} tCO₂eq/hab/an.`;

    document.getElementById('sbAnalyse').textContent = analyse;
}


// ══════════════════════════════════════════════════════════════
// 3. GRAPHIQUE BULLE CO2 × ESPACES VERTS × DENSITÉ
// ══════════════════════════════════════════════════════════════
const ctxBubble = document.getElementById('bubbleChart').getContext('2d');

const bubbleData = Object.values(DATA).map(d => ({
    x: d.espVerts > 20 ? 20 : d.espVerts, // plafonner pour lisibilité
    y: d.co2,
    r: Math.sqrt(d.densite / 1000) * 2.8,
    label: d.nom,
    densite: d.densite,
    ev_reel: d.espVerts,
    co2: d.co2
}));

new Chart(ctxBubble, {
    type: 'bubble',
    data: {
        datasets: [{
            label: 'Arrondissement',
            data: bubbleData,
            backgroundColor: bubbleData.map(b => {
                const ratio = (b.co2 - MIN_CO2) / (MAX_CO2 - MIN_CO2);
                return `rgba(${Math.round(63+ratio*185)},${Math.round(185-ratio*175)},80,0.75)`;
            }),
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(13,17,23,0.95)',
                titleFont: { family: 'Inter', size: 13, weight: '600' },
                bodyFont:  { family: 'Inter', size: 12 },
                borderColor: '#30363d', borderWidth: 1,
                padding: 12, cornerRadius: 8,
                callbacks: {
                    title: items => `${items[0].raw.label} arrondissement`,
                    label: item => [
                        `  🌳 Espaces verts : ${item.raw.ev_reel} m²/hab`,
                        `  💨 CO₂ : ${item.raw.co2} tCO₂eq/hab/an`,
                        `  🏙️ Densité : ${item.raw.densite.toLocaleString('fr-FR')} hab/km²`
                    ]
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Espaces verts (m²/hab) — plafonné à 20 pour lisibilité',
                         color: '#8b949e', font: { size: 11, family: 'Inter' } },
                grid: { color: 'rgba(48,54,61,0.5)' },
                ticks: { color: '#8b949e', font: { size: 11 } }
            },
            y: {
                title: { display: true, text: 'Émissions CO₂ (tCO₂eq/hab/an)',
                         color: '#8b949e', font: { size: 11, family: 'Inter' } },
                grid: { color: 'rgba(48,54,61,0.5)' },
                ticks: { color: '#8b949e', font: { size: 11 } },
                min: 2.4, max: 6.2
            }
        }
    }
});


// ══════════════════════════════════════════════════════════════
// 4. INFOGRAPHIE — SCORE + BARRES ESPACES VERTS
// ══════════════════════════════════════════════════════════════

// Score environnemental
const scoreBars = document.getElementById('scoreBars');
if (scoreBars) {
    const sorted = Object.values(DATA).sort((a, b) => b.score - a.score);
    sorted.forEach(d => {
        const div = document.createElement('div');
        div.className = 'sc-row';
        div.innerHTML = `
            <span class="sc-lbl">${d.nom}</span>
            <div class="sc-track"><div class="sc-fill" style="width:0%;background:${couleurScore(d.score)};" data-target="${d.score}"></div></div>
            <span class="sc-val" style="color:${couleurScore(d.score)}">${d.score}</span>
        `;
        scoreBars.appendChild(div);
    });
}

// Barres espaces verts
const barsGrid = document.getElementById('barsGrid');
if (barsGrid) {
    const sorted = Object.values(DATA).sort((a, b) => b.densite - a.densite);
    sorted.forEach(d => {
        const pct   = (Math.min(d.espVerts, MAX_EV) / MAX_EV * 100).toFixed(1);
        const color = couleurBarre(d.espVerts);
        const div = document.createElement('div');
        div.className = 'bar-row';
        div.innerHTML = `
            <span class="bar-lbl">${d.nom}</span>
            <div class="bar-track"><div class="bar-fill" style="width:0%;background:${color};" data-target="${pct}"></div></div>
            <span class="bar-val">${d.espVerts} m²</span>
            <span class="bar-oms">${d.espVerts >= SEUIL_OMS ? '✅' : '❌'}</span>
        `;
        barsGrid.appendChild(div);
    });
}

// Animation barres au scroll
new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            document.querySelectorAll('[data-target]').forEach(el => {
                el.style.width = el.dataset.target + '%';
            });
        }
    });
}, { threshold: 0.2 }).observe(document.body);


// ══════════════════════════════════════════════════════════════
// 5. TABLEAU RÉCAPITULATIF
// ══════════════════════════════════════════════════════════════
const tbody = document.getElementById('tableBody');
if (tbody) {
    const sorted = Object.values(DATA).sort((a, b) => b.score - a.score);
    sorted.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:#e6edf3">${d.nom}</strong></td>
            <td>${d.densite.toLocaleString('fr-FR')}</td>
            <td>${d.espVerts}</td>
            <td>${d.kmPistes}</td>
            <td style="color:${couleurCO2(d.co2)};font-weight:600;">${d.co2}</td>
            <td class="td-score" style="color:${couleurScore(d.score)}">${d.score}/100</td>
            <td class="${d.espVerts >= SEUIL_OMS ? 'td-oms-ok' : 'td-oms-non'}">${d.espVerts >= SEUIL_OMS ? '✅' : '❌'}</td>
        `;
        tbody.appendChild(tr);
    });
}


// ══════════════════════════════════════════════════════════════
// 6. CHART.JS — ONGLETS DATAVIZ
// ══════════════════════════════════════════════════════════════
const arrSorted  = Object.values(DATA).sort((a, b) => a.densite - b.densite);
const labels     = arrSorted.map(d => d.nom);
const evData     = arrSorted.map(d => d.espVerts);
const densData   = arrSorted.map(d => +(d.densite / 1000).toFixed(1));
const veloData   = arrSorted.map(d => d.kmPistes);
const co2Data    = arrSorted.map(d => d.co2);
const scoreData  = arrSorted.map(d => d.score);
const barColors  = arrSorted.map(d => {
    const r = d.densite / MAX_DENSITE;
    return `rgba(${Math.round(39+r*193)},${Math.round(174-r*144)},${Math.round(96-r*64)},0.85)`;
});

const CHART_DEFAULTS = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { position: 'top', labels: { padding: 20, color: '#8b949e',
                  font: { family: 'Inter', size: 12 }, usePointStyle: true } },
        tooltip: {
            backgroundColor: 'rgba(13,17,23,0.95)',
            titleColor: '#e6edf3', bodyColor: '#c9d1d9',
            borderColor: '#30363d', borderWidth: 1,
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont:  { family: 'Inter', size: 12 },
            padding: 14, cornerRadius: 8,
            callbacks: {
                afterBody: items => {
                    const d = arrSorted[items[0]?.dataIndex];
                    if (!d) return;
                    return d.espVerts >= SEUIL_OMS
                        ? ['  ✅ Seuil OMS atteint'] : ['  ❌ Sous le seuil OMS'];
                }
            }
        }
    },
    scales: {
        x:      { grid: { color: 'rgba(48,54,61,0.5)' }, ticks: { color: '#8b949e', font: { size: 11 } } },
        yLeft:  { position: 'left',  beginAtZero: true, grid: { color: 'rgba(48,54,61,0.5)' },
                  ticks: { color: '#8b949e', font: { size: 11 } } },
        yRight: { position: 'right', beginAtZero: true, grid: { display: false },
                  ticks: { color: '#8b949e', font: { size: 11 } } }
    }
};

const ctxMain = document.getElementById('mainChart').getContext('2d');
let mainChart = null;

const VIEWS = {
    verts: {
        datasets: [
            { type:'bar',  label:'Espaces verts (m²/hab)', data:evData, backgroundColor:barColors,
              borderRadius:5, yAxisID:'yLeft', order:2 },
            { type:'line', label:'Densité (×1 000 hab/km²)', data:densData,
              borderColor:'#58a6ff', backgroundColor:'rgba(88,166,255,0.06)',
              borderWidth:2.5, pointRadius:4, fill:true, tension:0.35, yAxisID:'yRight', order:1 }
        ]
    },
    velo: {
        datasets: [
            { type:'bar',  label:'Pistes cyclables (km)', data:veloData,
              backgroundColor:arrSorted.map(()=>'rgba(63,185,80,0.7)'), borderRadius:5, yAxisID:'yLeft', order:2 },
            { type:'line', label:'Densité (×1 000 hab/km²)', data:densData,
              borderColor:'#f85149', backgroundColor:'rgba(248,81,73,0.06)',
              borderWidth:2.5, pointRadius:4, fill:true, tension:0.35, yAxisID:'yRight', order:1 }
        ]
    },
    co2: {
        datasets: [
            { type:'bar',  label:'Émissions CO₂ (tCO₂eq/hab/an)', data:co2Data,
              backgroundColor:co2Data.map(v => couleurCO2(v)), borderRadius:5, yAxisID:'yLeft', order:2 },
            { type:'line', label:'Densité (×1 000 hab/km²)', data:densData,
              borderColor:'#d29922', backgroundColor:'rgba(210,153,34,0.06)',
              borderWidth:2, pointRadius:3, fill:false, tension:0.35, yAxisID:'yRight', order:1 }
        ]
    },
    score: {
        datasets: [
            { type:'bar',  label:'Score environnemental (/100)', data:scoreData,
              backgroundColor:scoreData.map(s => couleurScore(s)+'cc'), borderRadius:5, yAxisID:'yLeft', order:2 },
            { type:'line', label:'Densité (×1 000 hab/km²)', data:densData,
              borderColor:'#8b949e', backgroundColor:'rgba(139,148,158,0.06)',
              borderWidth:1.5, pointRadius:3, fill:false, tension:0.35, yAxisID:'yRight', order:1 }
        ]
    },
    combine: {
        datasets: [
            { type:'bar',  label:'Espaces verts (m²/hab)', data:evData,
              backgroundColor:'rgba(63,185,80,0.6)', borderRadius:5, yAxisID:'yLeft', order:4 },
            { type:'line', label:'Pistes cyclables (km)', data:veloData,
              borderColor:'#58a6ff', backgroundColor:'rgba(88,166,255,0.06)',
              borderWidth:2, pointRadius:3, fill:true, tension:0.35, yAxisID:'yLeft', order:3 },
            { type:'line', label:'CO₂ (tCO₂/hab/an)', data:co2Data,
              borderColor:'#ff7b00', backgroundColor:'rgba(255,123,0,0.06)',
              borderWidth:2, pointRadius:3, fill:false, tension:0.35, yAxisID:'yRight', order:2 },
            { type:'line', label:'Densité (×1 000 hab/km²)', data:densData,
              borderColor:'#f85149', borderDash:[4,4],
              borderWidth:1.5, pointRadius:0, fill:false, tension:0.35, yAxisID:'yRight', order:1 }
        ]
    }
};

function buildChart(view) {
    if (mainChart) mainChart.destroy();
    const opts = JSON.parse(JSON.stringify(CHART_DEFAULTS));
    opts.scales.yLeft.title  = { display:true, text: view==='co2'?'tCO₂eq/hab/an': view==='score'?'Score /100':'m²/hab · km', color:'#8b949e', font:{size:11} };
    opts.scales.yRight.title = { display:true, text:'Densité (×1 000 hab/km²)', color:'#8b949e', font:{size:11} };
    mainChart = new Chart(ctxMain, { type:'bar', data:{ labels, datasets:VIEWS[view].datasets }, options:opts });
}

buildChart('verts');

document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        buildChart(this.dataset.view);
    });
});
