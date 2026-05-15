<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { TripApi }  from '../../infrastructure/trip-api.js';
import { RouteApi } from '../../../fleet-and-route-planning/infrastructure/route-api.js';
import { fetchRoadRoute } from '../../../shared/infrastructure/ors.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const { t }    = useI18n();
const tripApi  = new TripApi();
const routeApi = new RouteApi();

const trips      = ref([]);
const routes     = ref([]);
const selected   = ref(null);
const loading    = ref(false);
const orsLoading = ref(false);

const STATUS = {
  EN_ROUTE:  { bg: '#dcfce7', text: '#15803d', label: 'En Ruta',     icon: 'pi pi-car'          },
  SCHEDULED: { bg: '#fef9c3', text: '#854d0e', label: 'Programado',  icon: 'pi pi-clock'        },
  COMPLETED: { bg: '#e0f2fe', text: '#0369a1', label: 'Completado',  icon: 'pi pi-check-circle' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado',   icon: 'pi pi-times-circle' },
};
const getStatus = (s) => STATUS[s] || { bg: '#f3f4f6', text: '#374151', label: s, icon: 'pi pi-circle' };

const LIMA = [-12.046374, -77.042793];
let map        = null;
let busMarker  = null;
let mapLayers  = [];

const busIcon = L.divIcon({
  html: `<div style="background:#ffb74d;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.35);border:3px solid #fff">
           <i class='pi pi-car' style='color:#1a1a2e;font-size:14px'></i>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function initMap() {
  if (map) return;
  map = L.map('trip-map').setView(LIMA, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
}

function clearMapLayers() {
  mapLayers.forEach(l => map.removeLayer(l));
  mapLayers = [];
  if (busMarker) { map.removeLayer(busMarker); busMarker = null; }
}

async function showTripOnMap(trip) {
  if (!map) return;
  clearMapLayers();

  const route = routes.value.find(r => r.id === trip.routeId);
  const wps   = route?.waypoints || [];

  if (!wps.length) {
    map.setView(LIMA, 12);
    return;
  }

  const coords = wps.map(w => [w.lat, w.lng]);
  const lineColor = trip.status === 'COMPLETED' ? '#94a3b8' : '#ffb74d';

  // Stop markers (always drawn immediately)
  wps.forEach((wp, i) => {
    const isFirst = i === 0;
    const isLast  = i === wps.length - 1;
    const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#16305a';
    const sm = L.divIcon({
      className: '',
      html: `<div style="width:22px;height:22px;border-radius:50%;background:${bg};color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #ffb74d;box-shadow:0 2px 6px rgba(0,0,0,.3)">${i + 1}</div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    const m = L.marker([wp.lat, wp.lng], { icon: sm }).addTo(map).bindPopup(`<b>${i + 1}. ${wp.name}</b>`);
    mapLayers.push(m);
  });

  // Bus position — find current stop
  const currentStop = wps.find(w => w.name === trip.currentStop) || wps[0];
  const distanceKm = (Math.random() * 5 + 1).toFixed(1); // Simulado
  busMarker = L.marker([currentStop.lat, currentStop.lng], { icon: busIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<b>🚌 ${trip.driverName}</b><br>${trip.currentStop || 'En ruta'}<br><small style="color:#6b7280; font-weight:600"><i class="pi pi-map-marker"></i> Distancia recorrida: ~${distanceKm} km</small>`)
      .openPopup();


  const placeholder = L.polyline(coords, {
    color: lineColor, weight: 5, opacity: 0.3, dashArray: '7 6',
  }).addTo(map);
  mapLayers.push(placeholder);
  map.fitBounds(placeholder.getBounds(), { padding: [40, 40] });

  // Upgrade to ORS road geometry asynchronously
  if (wps.length >= 2) {
    orsLoading.value = true;
    try {
      const { path } = await fetchRoadRoute(wps);
      // Only update if this trip-execution-and-monitoring is still selected
      if (selected.value?.id === trip.id && map) {
        map.removeLayer(placeholder);
        mapLayers = mapLayers.filter(l => l !== placeholder);
        const roadLine = L.polyline(path, { color: lineColor, weight: 5, opacity: 0.85 }).addTo(map);
        mapLayers.push(roadLine);
        map.fitBounds(roadLine.getBounds(), { padding: [40, 40] });
      }
    } catch (e) {
      console.warn('ORS monitoring failed, keeping straight line:', e);
    } finally {
      orsLoading.value = false;
    }
  }
}

async function loadData() {
  loading.value = true;
  const [tripsRes, routesRes] = await Promise.all([
    tripApi.getTrips(),
    routeApi.getRoutes(),
  ]);
  trips.value  = tripsRes.data  || [];
  routes.value = routesRes.data || [];
  loading.value = false;
}

function selectTrip(trip) {
  selected.value = trip;
  showTripOnMap(trip);
}

const getRoute = (routeId) => routes.value.find(r => r.id === routeId);

onMounted(async () => {
  await loadData();
  await nextTick();
  initMap();
  const active = trips.value.find(t => t.status === 'EN_ROUTE');
  if (active) selectTrip(active);
  else if (trips.value.length) selectTrip(trips.value[0]);
});

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
});
</script>

<template>
  <div class="trip-monitor">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('trip-execution-and-monitoring.monitor.title') }}</h1>
        <p class="page-sub">{{ t('trip-execution-and-monitoring.monitor.subtitle') }}</p>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem">
        <span v-if="orsLoading" class="ors-badge">
          <i class="pi pi-spin pi-spinner"/> Trazando ruta real…
        </span>
        <pv-button icon="pi pi-refresh" :label="t('general.refresh')" text @click="loadData"/>
      </div>
    </div>

    <div class="monitor-grid">

      <!-- Trip list -->
      <div class="trips-panel">
        <div v-if="loading" class="state-msg"><i class="pi pi-spin pi-spinner"/> Cargando…</div>

        <div
            v-for="trip in trips" :key="trip.id"
            class="trip-card"
            :class="{ active: selected?.id === trip.id }"
            @click="selectTrip(trip)">

          <div class="trip-top">
            <span class="trip-name">{{ trip.routeName || `Viaje #${trip.id}` }}</span>
            <span class="status-badge" :style="{ background: getStatus(trip.status).bg, color: getStatus(trip.status).text }">
              <i :class="getStatus(trip.status).icon" style="font-size:0.6rem"/>
              {{ getStatus(trip.status).label }}
            </span>
          </div>

          <div class="trip-meta">
            <div class="meta-row"><i class="pi pi-user meta-icon"/> {{ trip.driverName || trip.driverId }}</div>
            <div class="meta-row">
              <i class="pi pi-users meta-icon"/>
              {{ trip.studentsBoarded }} / {{ trip.studentsTotal }} alumnos
            </div>
            <div v-if="trip.currentStop" class="meta-row">
              <i class="pi pi-map-marker meta-icon"/> {{ trip.currentStop }}
            </div>
          </div>

          <!-- Progress mini bar -->
          <div v-if="trip.studentsTotal" class="mini-progress">
            <div class="mini-fill"
                 :style="{
                   width: (trip.studentsBoarded / trip.studentsTotal * 100) + '%',
                   background: trip.status === 'COMPLETED' ? 'var(--green)' : 'var(--amber)'
                 }"/>
          </div>
        </div>

        <div v-if="!loading && trips.length === 0" class="state-msg">No hay viajes registrados.</div>
      </div>

      <!-- Map + detail -->
      <div class="map-detail-col">
        <div class="map-wrap">
          <div id="trip-map" class="leaflet-map"/>
        </div>

        <!-- Detail card -->
        <div v-if="selected" class="detail-card">
          <div class="detail-header">
            <h3 class="detail-title">{{ selected.routeName || `Viaje #${selected.id}` }}</h3>
            <span class="status-badge" :style="{ background: getStatus(selected.status).bg, color: getStatus(selected.status).text }">
              {{ getStatus(selected.status).label }}
            </span>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Conductor</span>
              <span class="detail-val">{{ selected.driverName || selected.driverId }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Tipo</span>
              <span class="detail-val">
                <span class="type-chip" :class="selected.type === 'RECOJO' ? 'recojo' : 'retorno'">{{ selected.type }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Alumnos</span>
              <span class="detail-val">{{ selected.studentsBoarded }} / {{ selected.studentsTotal }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Parada actual</span>
              <span class="detail-val">{{ selected.currentStop || '—' }}</span>
            </div>
            <div v-if="selected.startTime" class="detail-item">
              <span class="detail-label">Inicio</span>
              <span class="detail-val">{{ new Date(selected.startTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            <div v-if="selected.endTime" class="detail-item">
              <span class="detail-label">Fin</span>
              <span class="detail-val">{{ new Date(selected.endTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
          </div>

          <!-- Waypoints list for selected trip-execution-and-monitoring -->
          <div v-if="getRoute(selected.routeId)?.waypoints?.length" class="wps-mini">
            <p class="wps-mini-title"><i class="pi pi-map-marker"/> Paradas de la ruta</p>
            <div class="wps-mini-list">
              <div
                  v-for="(wp, i) in getRoute(selected.routeId).waypoints"
                  :key="i"
                  class="wp-mini-item"
                  :class="{ 'wp-current': wp.name === selected.currentStop }">
                <span class="wp-mini-num"
                      :style="{ background: i === 0 ? '#16a34a' : i === getRoute(selected.routeId).waypoints.length - 1 ? '#dc2626' : '#16305a' }">
                  {{ i + 1 }}
                </span>
                <span class="wp-mini-name">{{ wp.name }}</span>
                <i v-if="wp.name === selected.currentStop" class="pi pi-car" style="color:var(--amber);font-size:0.75rem;margin-left:auto"/>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="placeholder-msg">
          <i class="pi pi-hand-pointer"/> Selecciona un viaje para ver el detalle
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.trip-monitor { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
.page-title   { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.2rem; }
.page-sub     { font-family: var(--sans); font-size: 0.875rem; color: var(--muted); margin: 0; }

.monitor-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.25rem;
  height: calc(100vh - 155px);
}

/* Trip list */
.trips-panel { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; }

.trip-card {
  background: #fff; border: 2px solid #e5e7eb; border-radius: 12px;
  padding: 0.9rem; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.trip-card:hover  { border-color: var(--amber); box-shadow: 0 2px 8px rgba(0,0,0,.07); }
.trip-card.active { border-color: var(--amber); background: #fffbf2; }

.trip-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
.trip-name { font-weight: 700; font-size: 0.85rem; color: var(--dark); line-height: 1.3; }

.status-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.7rem; font-weight: 700;
  padding: 2px 8px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;
}

.trip-meta { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
.meta-row  { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--muted); }
.meta-icon { color: var(--amber); font-size: 0.72rem; }

.mini-progress {
  height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden;
}
.mini-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }

.state-msg { color: var(--muted); text-align: center; padding: 2rem; font-size: 0.875rem; }

/* Map + detail col */
.map-detail-col { display: flex; flex-direction: column; gap: 1rem; overflow: hidden; }
.map-wrap { flex: 1; min-height: 0; }
.leaflet-map { height: 100%; min-height: 300px; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }

/* Detail card */
.detail-card {
  background: #fff; border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 1.1rem 1.25rem;
  display: flex; flex-direction: column; gap: 0.85rem;
}
.detail-header { display: flex; justify-content: space-between; align-items: center; }
.detail-title  { font-family: var(--heading); font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0; }

.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1.5rem;
}
.detail-item  { display: flex; flex-direction: column; gap: 0.1rem; }
.detail-label { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--muted); }
.detail-val   { font-size: 0.85rem; font-weight: 600; color: var(--dark); }

.type-chip {
  font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
}
.type-chip.recojo  { background: #dbeafe; color: #1d4ed8; }
.type-chip.retorno { background: #fce7f3; color: #be185d; }

/* Waypoints mini list */
.wps-mini      { border-top: 1px solid #f3f4f6; padding-top: 0.75rem; }
.wps-mini-title { font-size: 0.75rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.3rem; }
.wps-mini-list  { display: flex; flex-direction: column; gap: 0.3rem; max-height: 140px; overflow-y: auto; }
.wp-mini-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.5rem; border-radius: 6px;
  font-size: 0.78rem; color: var(--dark);
  transition: background 0.12s;
}
.wp-mini-item.wp-current { background: #fffbf2; font-weight: 700; }
.wp-mini-num {
  width: 18px; height: 18px; border-radius: 50%;
  color: #fff; font-size: 9px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  border: 1.5px solid #ffb74d;
}
.wp-mini-name { flex: 1; }

.placeholder-msg { color: var(--muted); text-align: center; padding: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }

.ors-badge {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.75rem; font-weight: 600; color: #92400e;
  background: #fef3c7; padding: 0.3rem 0.75rem; border-radius: 20px;
}
</style>
