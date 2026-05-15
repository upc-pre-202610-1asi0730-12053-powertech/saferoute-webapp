<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchRoadRoute } from '../../../shared/infrastructure/ors.js';

// Leaflet ships broken default icon paths under most bundlers — patch them manually
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const { t } = useI18n();

// ── Route simulation data ──────────────────────────────────────────────────
// Hardcoded waypoints for the demo; last point is the parent's home
const ROUTE_PATH = [
  [-12.046374, -77.042793],
  [-12.052000, -77.035000],
  [-12.060000, -77.030000],
  [-12.068000, -77.022000],
  [-12.075000, -77.015000],   // HOME_POSITION
];
const HOME_POSITION = ROUTE_PATH[ROUTE_PATH.length - 1];
const PROXIMITY_THRESHOLD_M = 500;
const STEP_INTERVAL_MS = 4000; // ms between route steps

// ── State ──────────────────────────────────────────────────────────────────
const busStepIdx       = ref(0);              // index into ROUTE_PATH
const busPos           = ref(ROUTE_PATH[0]);
const busInfo          = ref({ driver: 'Carlos Ramirez', route: 'Ruta Norte — Comas / Los Olivos', vehiclePlate: 'ABC-123' });

// US19 — Proximity alert
const proximityAlert   = ref(false);   // triggered when < 500 m
const proximityDist    = ref(null);    // metres, null = not yet computed

// US20 — Arrival confirmation
const arrivalConfirmed = ref(false);
const arrivalTime      = ref(null);

// Derive status from progress instead of tracking it as separate state
const busStatus = computed(() => {
  if (arrivalConfirmed.value) return 'COMPLETED';
  if (busStepIdx.value > 0)   return 'EN_ROUTE';
  return 'SCHEDULED';
});

const statusLabel = computed(() => ({
  SCHEDULED: 'Programado', EN_ROUTE: 'En camino', COMPLETED: 'Llegó',
}[busStatus.value]));

const etaLabel = computed(() => {
  if (arrivalConfirmed.value) return arrivalTime.value;
  // Rough ETA: remaining steps × interval
  const stepsLeft = ROUTE_PATH.length - 1 - busStepIdx.value;
  const mins = Math.round((stepsLeft * STEP_INTERVAL_MS) / 60000);
  if (mins <= 0) return 'Llegando…';
  return `~${mins} min`;
});

// ── Timeline (reactive) ────────────────────────────────────────────────────
// Each row flips to done once the bus passes the matching step
const timeline = computed(() => [
  { time: '06:00', event: 'Bus salió del punto de inicio',   done: busStepIdx.value >= 0, icon: 'pi pi-flag'       },
  { time: '06:15', event: 'Parada 1 - Av. Universitaria',    done: busStepIdx.value >= 1, icon: 'pi pi-map-marker' },
  { time: '06:30', event: 'Parada 2 - Av. Angélica Gamarra', done: busStepIdx.value >= 2, icon: 'pi pi-map-marker' },
  { time: '06:45', event: 'Parada 3 - Jr. Las Orquídeas',    done: busStepIdx.value >= 3, icon: 'pi pi-map-marker' },
  { time: '07:00', event: 'Llegada a tu zona',                done: arrivalConfirmed.value, icon: 'pi pi-home'      },
]);

// ── Map ────────────────────────────────────────────────────────────────────
const orsLoading = ref(false);
let map         = null;
let busMarker   = null;
let simTimer    = null;
let roadPath    = ROUTE_PATH;   // will be replaced by ORS result
let routeLine   = null;

function initMap() {
  if (map) return; // guard against double init
  map = L.map('tracking-map').setView(ROUTE_PATH[0], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Placeholder straight-line shown until ORS returns the real road geometry
  routeLine = L.polyline(ROUTE_PATH, { color: '#FFB74D', weight: 4, dashArray: '8, 4', opacity: 0.5 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

  const busIcon = L.divIcon({
    html: '<div style="background:#FFB74D;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><i class=\'pi pi-car\' style=\'color:#1a1a2e;font-size:16px\'></i></div>',
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
  });
  busMarker = L.marker(ROUTE_PATH[0], { icon: busIcon, zIndexOffset: 1000 }).addTo(map)
      .bindPopup(`🚌 ${busInfo.value.driver}`);

  // Static marker for the destination
  const homeIcon = L.divIcon({
    html: '<div style="background:#22C55E;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2)"><i class=\'pi pi-home\' style=\'color:#fff;font-size:14px\'></i></div>',
    className: '', iconSize: [30, 30], iconAnchor: [15, 15],
  });
  L.marker(HOME_POSITION, { icon: homeIcon }).addTo(map).bindPopup('Tu domicilio');
}

// Swap the placeholder line for the actual ORS road route once it resolves
async function loadRoadRoute() {
  orsLoading.value = true;
  try {
    const wps = ROUTE_PATH.map(([lat, lng]) => ({ lat, lng }));
    const { path } = await fetchRoadRoute(wps);
    roadPath = path;
    if (map && routeLine) {
      map.removeLayer(routeLine);
      routeLine = L.polyline(path, { color: '#FFB74D', weight: 4, opacity: 0.9 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    }
  } catch (e) {
    // Non-fatal: just keep the straight-line fallback
    console.warn('ORS tracking failed, keeping straight line:', e);
  } finally {
    orsLoading.value = false;
  }
}

// ── Simulation ─────────────────────────────────────────────────────────────
// Haversine distance between two [lat, lng] points, in metres
function calcDistance(a, b) {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

// Called on every tick — moves the bus one step along the route
function advanceBus() {
  const next = busStepIdx.value + 1;

  // Reached the end of the route
  if (next >= ROUTE_PATH.length) {
    // US20 — Arrival confirmation
    if (!arrivalConfirmed.value) {
      arrivalConfirmed.value = true;
      proximityAlert.value   = false;
      const now = new Date();
      arrivalTime.value = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      busMarker?.setLatLng(HOME_POSITION);
    }
    clearInterval(simTimer);
    return;
  }

  busStepIdx.value = next;
  busPos.value     = ROUTE_PATH[next];
  busMarker?.setLatLng(ROUTE_PATH[next]);
  map?.panTo(ROUTE_PATH[next], { animate: true, duration: 0.5 });

  // US19 — Proximity detection: fire the alert once when within threshold
  const dist = calcDistance(ROUTE_PATH[next], HOME_POSITION);
  proximityDist.value = Math.round(dist);
  if (dist <= PROXIMITY_THRESHOLD_M && !proximityAlert.value && !arrivalConfirmed.value) {
    proximityAlert.value = true;
    // Haptic feedback on mobile if available
    if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
  }
}

onMounted(async () => {
  await nextTick(); // wait for #tracking-map to exist in the DOM
  initMap();
  loadRoadRoute(); // async — upgrades polyline to real roads in background
  simTimer = setInterval(advanceBus, STEP_INTERVAL_MS);
});

// Tear down timer + map to avoid leaks on navigation
onBeforeUnmount(() => {
  clearInterval(simTimer);
  if (map) { map.remove(); map = null; }
});
</script>

<template>
  <div class="parent-tracking">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('trip-execution-and-monitoring.tracking.title') }}</h1>
        <p class="page-sub">Seguimiento en tiempo real del transporte de tu hijo/a</p>
      </div>
      <div style="display:flex;align-items:center;gap:0.65rem">
        <!-- Shown only while the ORS request is in flight -->
        <span v-if="orsLoading" class="ors-badge">
          <i class="pi pi-spin pi-spinner"/> Trazando ruta real…
        </span>
        <div class="status-badge" :class="busStatus.toLowerCase().replace('_','-')">
          <i :class="busStatus === 'COMPLETED' ? 'pi pi-check-circle' : busStatus === 'EN_ROUTE' ? 'pi pi-car' : 'pi pi-clock'"/>
          <span>{{ statusLabel }}</span>
        </div>
      </div>
    </div>

    <!-- US19 — Proximity Alert Banner -->
    <transition name="slide-down">
      <div v-if="proximityAlert && !arrivalConfirmed" class="proximity-alert">
        <div class="prox-icon"><i class="pi pi-bell"/></div>
        <div class="prox-body">
          <p class="prox-title">🔔 ¡El bus está cerca!</p>
          <p class="prox-msg">
            A <strong>{{ proximityDist ?? '...' }} metros</strong> de tu parada.
            <strong>¡Sal ahora!</strong>
          </p>
        </div>
        <!-- Lets the user dismiss the banner manually -->
        <button class="prox-close" @click="proximityAlert = false">✕</button>
      </div>
    </transition>

    <!-- US20 — Arrival Confirmation Banner -->
    <transition name="slide-down">
      <div v-if="arrivalConfirmed" class="arrival-banner">
        <i class="pi pi-check-circle arrival-icon"/>
        <div>
          <p class="arrival-title">¡Tu hijo/a llegó a destino!</p>
          <p class="arrival-msg">El bus llegó a las <strong>{{ arrivalTime }}</strong>. Todos los alumnos fueron entregados correctamente.</p>
        </div>
      </div>
    </transition>

    <div class="tracking-grid">
      <!-- Map -->
      <div class="map-col">
        <!-- Leaflet mounts into this node -->
        <div id="tracking-map" class="leaflet-map"/>

        <!-- Bus info card -->
        <div class="bus-info-card">
          <div class="bus-info-item">
            <i class="pi pi-user info-icon"/>
            <div>
              <span class="info-label">Conductor</span>
              <span class="info-value">{{ busInfo.driver }}</span>
            </div>
          </div>
          <div class="bus-info-item">
            <i class="pi pi-car info-icon"/>
            <div>
              <span class="info-label">Vehículo</span>
              <span class="info-value">{{ busInfo.vehiclePlate }}</span>
            </div>
          </div>
          <div class="bus-info-item">
            <i class="pi pi-clock info-icon"/>
            <div>
              <span class="info-label">ETA</span>
              <span class="info-value eta-val">{{ etaLabel }}</span>
            </div>
          </div>
          <!-- Only render distance once we have a reading -->
          <div v-if="proximityDist !== null" class="bus-info-item">
            <i class="pi pi-map-marker info-icon"/>
            <div>
              <span class="info-label">Distancia</span>
              <!-- Turns red inside the proximity threshold -->
              <span class="info-value" :style="{ color: proximityDist <= 500 ? '#ef4444' : 'var(--dark)' }">
                {{ proximityDist >= 1000 ? `${(proximityDist/1000).toFixed(1)} km` : `${proximityDist} m` }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline-col">
        <h3 class="timeline-title">Recorrido del día</h3>
        <div class="timeline">
          <div
              v-for="(item, i) in timeline"
              :key="i"
              class="timeline-item"
              :class="{ done: item.done }">
            <div class="tl-line-col">
              <div class="tl-dot" :class="{ done: item.done }">
                <i :class="item.icon"/>
              </div>
              <!-- Skip the connector after the last item -->
              <div v-if="i < timeline.length - 1" class="tl-connector" :class="{ done: item.done }"/>
            </div>
            <div class="tl-content">
              <span class="tl-time">{{ item.time }}</span>
              <span class="tl-event">{{ item.event }}</span>
              <span v-if="item.done" class="tl-status done">Completado</span>
              <span v-else class="tl-status pending">Pendiente</span>
            </div>
          </div>
        </div>

        <!-- Alert box — three mutually exclusive states: arrived / nearby / en route -->
        <div v-if="arrivalConfirmed" class="alert-box success">
          <i class="pi pi-check-circle alert-icon"/>
          <div>
            <p class="alert-title">Servicio concluido</p>
            <p class="alert-msg">Tu hijo/a fue entregado correctamente.</p>
          </div>
        </div>
        <div v-else-if="proximityAlert" class="alert-box warn">
          <i class="pi pi-exclamation-triangle alert-icon"/>
          <div>
            <p class="alert-title">¡Bus a {{ proximityDist }} metros!</p>
            <p class="alert-msg">Baja ya a la parada para recibir al alumno.</p>
          </div>
        </div>
        <div v-else class="alert-box">
          <i class="pi pi-info-circle alert-icon"/>
          <div>
            <p class="alert-title">Bus en camino</p>
            <p class="alert-msg">Tiempo estimado de llegada: <strong>{{ etaLabel }}</strong></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.parent-tracking { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
.page-title  { font-size: 1.5rem; font-weight: 700; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub    { font-size: 0.875rem; color: var(--muted); margin: 0; }

.status-badge {
  display: flex; align-items: center; gap: 0.4rem;
  font-weight: 700; padding: 0.45rem 1rem; border-radius: 20px; font-size: 0.875rem;
}
/* One variant per bus status */
.status-badge.en_route  { background: var(--amber); color: var(--dark); }
.status-badge.scheduled { background: #e5e7eb; color: #374151; }
.status-badge.completed { background: #dcfce7; color: #15803d; }

/* ── US19 Proximity Alert ──────────────────────────────────── */
.proximity-alert {
  display: flex; align-items: center; gap: 0.85rem;
  background: #fff7ed; border: 2px solid #f59e0b; border-radius: 12px;
  padding: 0.85rem 1.1rem; margin-bottom: 1.1rem;
  box-shadow: 0 4px 12px rgba(245,158,11,0.2);
}
.prox-icon { width: 42px; height: 42px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #d97706; flex-shrink: 0; animation: proxPulse 1s ease-in-out infinite; }
/* Pulsing bell to draw attention */
@keyframes proxPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
.prox-body  { flex: 1; }
.prox-title { font-size: 0.95rem; font-weight: 800; color: #92400e; margin: 0 0 2px; }
.prox-msg   { font-size: 0.82rem; color: #b45309; margin: 0; }
.prox-close { background: none; border: none; color: #b45309; font-size: 1rem; cursor: pointer; padding: 4px 8px; flex-shrink: 0; }

/* ── US20 Arrival Banner ───────────────────────────────────── */
.arrival-banner {
  display: flex; align-items: flex-start; gap: 0.85rem;
  background: #dcfce7; border: 2px solid #22c55e; border-radius: 12px;
  padding: 0.85rem 1.1rem; margin-bottom: 1.1rem;
  box-shadow: 0 4px 12px rgba(34,197,94,0.15);
}
.arrival-icon  { font-size: 2rem; color: #15803d; flex-shrink: 0; }
.arrival-title { font-size: 0.95rem; font-weight: 800; color: #14532d; margin: 0 0 3px; }
.arrival-msg   { font-size: 0.82rem; color: #166534; margin: 0; }

/* Slide + fade for both banners */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.35s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-12px); }

.tracking-grid {
  display: grid; grid-template-columns: 1fr 320px;
  gap: 1.25rem; height: calc(100vh - 200px);
}

.map-col      { display: flex; flex-direction: column; gap: 0.85rem; }
.leaflet-map  { flex: 1; min-height: 350px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

.bus-info-card {
  background: #fff; border-radius: 10px; padding: 0.9rem 1.1rem;
  display: flex; gap: 1.25rem; flex-wrap: wrap; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.bus-info-item { display: flex; align-items: center; gap: 0.6rem; }
.info-icon  { font-size: 1.1rem; color: var(--amber); }
.info-label { display: block; font-size: 0.72rem; color: var(--muted); }
.info-value { display: block; font-size: 0.875rem; font-weight: 600; color: var(--dark); }
.eta-val    { color: var(--amber); }

.timeline-col {
  background: #fff; border-radius: 12px; padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-y: auto;
  display: flex; flex-direction: column; gap: 1rem;
}
.timeline-title { font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0 0 0.5rem; }
.timeline       { display: flex; flex-direction: column; }
.timeline-item  { display: flex; gap: 0.85rem; position: relative; }

.tl-line-col { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.tl-dot {
  width: 32px; height: 32px; border-radius: 50%;
  background: #f3f4f6; border: 2px solid #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: var(--muted); flex-shrink: 0;
}
/* Green dot once the step is reached */
.tl-dot.done { background: #dcfce7; border-color: #bbf7d0; color: #15803d; }
.tl-connector { width: 2px; flex: 1; min-height: 20px; background: #e5e7eb; margin: 4px 0; }
.tl-connector.done { background: #bbf7d0; }

.tl-content { padding-bottom: 1rem; flex: 1; }
.tl-time    { display: block; font-size: 0.72rem; color: var(--amber); font-weight: 700; margin-bottom: 2px; }
.tl-event   { display: block; font-size: 0.875rem; color: var(--dark); font-weight: 500; }
.tl-status  { display: inline-block; font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 10px; margin-top: 4px; }
.tl-status.done    { background: #dcfce7; color: #15803d; }
.tl-status.pending { background: #fef9c3; color: #854d0e; }

.alert-box {
  display: flex; gap: 0.75rem; border-radius: 10px;
  padding: 0.85rem 1rem; margin-top: auto;
  background: #fffbf2; border: 1px solid var(--amber);
}
/* Color overrides per alert state */
.alert-box.warn    { background: #fff7ed; border-color: #f59e0b; }
.alert-box.success { background: #f0fdf4; border-color: #22c55e; }
.alert-icon  { font-size: 1.1rem; color: var(--amber); flex-shrink: 0; margin-top: 2px; }
.alert-box.warn .alert-icon    { color: #f59e0b; }
.alert-box.success .alert-icon { color: #22c55e; }
.alert-title { font-weight: 700; color: var(--dark); margin: 0 0 2px; font-size: 0.875rem; }
.alert-msg   { color: var(--muted); margin: 0; font-size: 0.82rem; }

.ors-badge {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.75rem; font-weight: 600; color: #92400e;
  background: #fef3c7; padding: 0.3rem 0.75rem; border-radius: 20px;
}
</style>