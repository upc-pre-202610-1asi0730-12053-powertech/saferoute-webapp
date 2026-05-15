<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import { useConfirm } from 'primevue/useconfirm';
import { useToast }   from 'primevue/usetoast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { TripApi }  from '../../infrastructure/trip-api.js';
import { RouteApi } from '../../../fleet-and-route-planning/infrastructure/route-api.js';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import { fetchRoadRoute } from '../../../shared/infrastructure/ors.js';
import seedData from '../../../server/db.json';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const STEP_MS = parseInt(import.meta.env.VITE_SIMULATION_STEP_MS) || 2000;

const confirm  = useConfirm();
const toast    = useToast();
const tripApi  = new TripApi();
const routeApi = new RouteApi();
const iamStore = useIamStore();

// ── State ──────────────────────────────────────────────────────────────────
const allTrips      = ref([]);
const routeCache    = ref({});   // { [routeId]: routeObject }
const tripData      = ref(null);
const routeData     = ref(null);
const loading       = ref(true);
const simRunning    = ref(false);
const currentWpIdx  = ref(-1);   // -1 = not started
const isOffline     = ref(!navigator.onLine);

// ORS road geometry
const roadPath     = ref([]);   // full [lat,lng][] road coordinates from ORS
const wpIndices    = ref([]);   // index in roadPath for each waypoint
const orsLoading   = ref(false);

// ── Derived ────────────────────────────────────────────────────────────────
const waypoints  = computed(() => routeData.value?.waypoints || []);

const stops = computed(() =>
  waypoints.value.map((wp, i) => ({
    ...wp,
    done:    i < currentWpIdx.value,
    current: i === currentWpIdx.value,
  }))
);

const progress = computed(() => {
  const n = waypoints.value.length;
  if (!n) return 0;
  return Math.round((Math.max(0, currentWpIdx.value) / n) * 100);
});

const tripStatus  = computed(() => tripData.value?.status || 'SCHEDULED');
const isScheduled = computed(() => tripStatus.value === 'SCHEDULED');
const isEnRoute   = computed(() => tripStatus.value === 'EN_ROUTE');
const isCompleted = computed(() => tripStatus.value === 'COMPLETED');

const STATUS_META = {
  EN_ROUTE:  { bg: '#dcfce7', text: '#15803d', label: 'En Ruta',    icon: 'pi pi-car'          },
  SCHEDULED: { bg: '#fef9c3', text: '#854d0e', label: 'Programado', icon: 'pi pi-clock'        },
  COMPLETED: { bg: '#e0f2fe', text: '#0369a1', label: 'Completado', icon: 'pi pi-check-circle' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado',  icon: 'pi pi-times-circle' },
};
const getMeta = (s) => STATUS_META[s] || { bg: '#f3f4f6', text: '#6b7280', label: s, icon: 'pi pi-circle' };

// Trip-type display helpers (handles both new OUTBOUND/RETURN and legacy RECOJO/RETORNO)
function tripTypeRaw(trip) { return trip?.tripType || trip?.type || ''; }
function tripTypeLabel(trip) {
  const t = tripTypeRaw(trip);
  if (t === 'OUTBOUND' || t === 'RECOJO')  return 'Recojo';
  if (t === 'RETURN'   || t === 'RETORNO') return 'Retorno';
  return t;
}
function tripTypeClass(trip) {
  const t = tripTypeRaw(trip);
  return (t === 'OUTBOUND' || t === 'RECOJO') ? 'recojo' : 'retorno';
}

// ── Map ────────────────────────────────────────────────────────────────────
const LIMA = [-12.046374, -77.042793];
let map         = null;
let busMarker   = null;
let routeLine   = null;
let stopCircles = [];
let animFrame   = null;
let subStepTimer = null;

// Inline SVG car icon — no font dependency, always renders
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#1a1a2e" style="display:block">
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>`;

const busIcon = L.divIcon({
  html: `
    <div class="at-bus-wrap" style="position:relative;width:44px;height:44px;box-sizing:border-box">
      <div class="at-bus-pulse" style="position:absolute;top:4px;left:4px;width:36px;height:36px;border-radius:50%;background:#ffb74d;opacity:0;pointer-events:none;z-index:1"></div>
      <div class="at-bus-body" style="position:absolute;top:4px;left:4px;width:36px;height:36px;background:#ffb74d;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;box-sizing:border-box;z-index:2">
        ${CAR_SVG}
      </div>
    </div>`,
  className: 'at-bus-marker', iconSize: [44, 44], iconAnchor: [22, 22],
});

/** Inject marker animation styles once into <head> */
function injectMapStyles() {
  if (document.getElementById('at-bus-styles')) return;
  const s = document.createElement('style');
  s.id = 'at-bus-styles';
  s.textContent = `
    @keyframes atPulse {
      0%   { transform: scale(1);   opacity: 0.7; }
      100% { transform: scale(2.4); opacity: 0;   }
    }
    @keyframes atBounce {
      0%, 100% { transform: translateY(0);    }
      50%       { transform: translateY(-3px); }
    }
    .leaflet-marker-icon.at-bus-marker {
      background: transparent !important;
      border: none !important;
      width: 44px !important;
      height: 44px !important;
    }
    .at-bus-wrap         { transition: transform 0.15s linear; }
    .at-bus-pulse.active { animation: atPulse  1.2s ease-out   infinite; }
    .at-bus-body.moving  { animation: atBounce 0.32s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

/** Calculate compass bearing (0=N, 90=E) between two [lat,lng] points */
function getBearing(a, b) {
  const toRad = d => d * Math.PI / 180;
  const dLng  = toRad(b[1] - a[1]);
  const φ1    = toRad(a[0]), φ2 = toRad(b[0]);
  const y     = Math.sin(dLng) * Math.cos(φ2);
  const x     = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Rotate the bus icon to face the given compass bearing.
 *  pi-car faces East (90°) by default, so we subtract 90°. */
function rotateBus(bearing) {
  const wrap = busMarker?.getElement()?.querySelector('.at-bus-wrap');
  if (wrap) wrap.style.transform = `rotate(${bearing - 90}deg)`;
}

/** Toggle the moving animations (pulse ring + bounce) */
function setBusMoving(moving) {
  const el = busMarker?.getElement();
  if (!el) return;
  el.querySelector('.at-bus-pulse')?.classList.toggle('active', moving);
  el.querySelector('.at-bus-body')?.classList.toggle('moving', moving);
}

function initMap() {
  if (map) return;
  injectMapStyles();
  map = L.map('active-trip-map').setView(LIMA, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
}

function clearMapLayers() {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  stopCircles.forEach(c => map.removeLayer(c));
  stopCircles = [];
  if (busMarker) { map.removeLayer(busMarker); busMarker = null; }
}

function buildMapLayer() {
  if (!map) return;
  clearMapLayers();
  const wps = waypoints.value;
  if (!wps.length) { map.setView(LIMA, 12); return; }

  
  const pathCoords = roadPath.value.length > 1
    ? roadPath.value
    : wps.map(w => [w.lat, w.lng]);

  routeLine = L.polyline(pathCoords, { color: '#6366f1', weight: 5, opacity: 0.85 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

  wps.forEach((wp, i) => {
    const color = i < currentWpIdx.value ? '#22c55e'
                : i === currentWpIdx.value ? '#6366f1' : '#94a3b8';
    const c = L.circleMarker([wp.lat, wp.lng], {
      radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(map).bindTooltip(`${i + 1}. ${wp.name}`, { direction: 'top' });
    stopCircles.push(c);
  });
}

// ── ORS road fleet-and-route-planning ─────────────────────────────────────────────────────────
async function loadRoadRoute() {
  const wps = waypoints.value;
  if (wps.length < 2) {
    roadPath.value  = wps.map(w => [w.lat, w.lng]);
    wpIndices.value = wps.map((_, i) => i);
    return;
  }
  orsLoading.value = true;
  try {
    const result = await fetchRoadRoute(wps);
    roadPath.value  = result.path;
    wpIndices.value = result.wayPointIndices;
  } catch (e) {
    console.warn('ORS failed, using straight lines:', e);
    roadPath.value  = wps.map(w => [w.lat, w.lng]);
    wpIndices.value = wps.map((_, i) => i);
  } finally {
    orsLoading.value = false;
  }
}

function refreshStopColors() {
  stopCircles.forEach((c, i) => {
    const color = i < currentWpIdx.value ? '#22c55e'
                : i === currentWpIdx.value ? '#6366f1' : '#94a3b8';
    c.setStyle({ fillColor: color });
  });
}

function placeBusAt(wp) {
  if (!map || !wp) return;
  if (!busMarker) {
    busMarker = L.marker([wp.lat, wp.lng], { icon: busIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`🚌 ${tripData.value?.driverName || 'Conductor'}`);
  } else {
    busMarker.setLatLng([wp.lat, wp.lng]);
  }
}

/** Animate bus through a segment of road coordinates at ~30fps over STEP_MS */
function animateSegment(segCoords, onDone) {
  if (!segCoords.length) { onDone?.(); return; }

  const FPS        = 30;
  const frameMs    = 1000 / FPS;
  const totalSteps = Math.ceil(STEP_MS / frameMs);
  const stride     = (segCoords.length - 1) / totalSteps;
  let progress     = 0;

  setBusMoving(true);
  clearInterval(subStepTimer);
  subStepTimer = setInterval(() => {
    progress += stride;
    if (progress >= segCoords.length - 1) {
      clearInterval(subStepTimer);
      subStepTimer = null;
      busMarker?.setLatLng(segCoords[segCoords.length - 1]);
      setBusMoving(false);
      onDone?.();
      return;
    }
    const idx = Math.floor(progress);
    const t   = progress - idx;
    const a   = segCoords[idx];
    const b   = segCoords[Math.min(idx + 1, segCoords.length - 1)];
    busMarker?.setLatLng([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    rotateBus(getBearing(a, b));
  }, frameMs);
}

function getSegment(fromWpIdx, toWpIdx) {
  const path  = roadPath.value;
  const idxA  = wpIndices.value[fromWpIdx] ?? 0;
  const idxB  = wpIndices.value[toWpIdx]   ?? path.length - 1;
  return path.length > 1 ? path.slice(idxA, idxB + 1) : [];
}

function onSegmentArrival(wpIdx) {
  currentWpIdx.value = wpIdx;
  refreshStopColors();
  const wp  = waypoints.value[wpIdx];
  const n   = waypoints.value.length;
  if (wp && tripData.value) {
    tripData.value = { ...tripData.value, currentStop: wp.name };
    tripApi.updateTrip(tripData.value);
  }
  if (wp) map?.panTo([wp.lat, wp.lng], { animate: true, duration: 0.3 });

  if (wpIdx > 0 && wpIdx < n - 1 && tripTypeRaw(tripData.value) === 'RETURN') {
    toast.add({
      severity: 'success',
      summary: 'Hijo entregado',
      detail: `Alumno entregado en parada: ${wp?.name}`,
      life: 3000
    });
  }

  // Arrival alerts
  if (n > 0 && wpIdx === n - 2) {
    toast.add({
      severity: 'warn',
      summary:  '¡El bus está por llegar!',
      detail:   `Próxima y última parada: ${waypoints.value[n - 1]?.name}. ¡Prepárate!`,
      life:     6000,
    });
  }
  if (n > 0 && wpIdx === n - 1) {
    toast.add({
      severity: 'success',
      summary:  '¡Destino alcanzado!',
      detail:   `El bus llegó a ${wp?.name}.`,
      life:     5000,
    });
  }
}

// ── Simulation ─────────────────────────────────────────────────────────────
function scheduleNext() {
  clearTimeout(animFrame);
  animFrame = setTimeout(() => {
    if (!simRunning.value) return;
    const next = currentWpIdx.value + 1;
    if (next >= waypoints.value.length) { simRunning.value = false; return; }

    const seg = getSegment(currentWpIdx.value, next);
    animateSegment(seg, () => {
      onSegmentArrival(next);
      if (simRunning.value) scheduleNext();
    });
  }, 400); // brief pause at each stop before moving
}

function startSim() {
  if (!isEnRoute.value || !waypoints.value.length) return;
  if (orsLoading.value) {
    toast.add({ severity: 'warn', summary: 'Calculando ruta…', detail: 'Espera un momento.', life: 2000 });
    return;
  }
  simRunning.value = true;
  scheduleNext();
}

function pauseSim() {
  simRunning.value = false;
  clearTimeout(animFrame);
  clearInterval(subStepTimer);
  subStepTimer = null;
  setBusMoving(false);
}

function resetSim() {
  pauseSim(); // also calls setBusMoving(false)
  currentWpIdx.value = 0;
  const wps = waypoints.value;
  if (!wps.length) return;

  refreshStopColors();

  
  const roadIdx = wpIndices.value[0] ?? 0;
  const pos = roadPath.value.length > 1 ? roadPath.value[roadIdx] : null;
  if (pos) {
    busMarker?.setLatLng(pos);
  } else {
    placeBusAt(wps[0]);
  }

  // Reset rotation — face default (East / 0° offset)
  const wrap = busMarker?.getElement()?.querySelector('.at-bus-wrap');
  if (wrap) wrap.style.transform = 'rotate(0deg)';

  map?.panTo(pos ?? [wps[0].lat, wps[0].lng], { animate: true, duration: 0.4 });
  toast.add({ severity: 'info', summary: 'Simulación reiniciada', detail: 'El bus volvió a la parada inicial.', life: 2500 });
}

function goToStop(i) {
  if (i <= currentWpIdx.value || !isEnRoute.value) return;
  pauseSim();
  const seg = getSegment(currentWpIdx.value, i);
  animateSegment(seg, () => onSegmentArrival(i));
}

// ── Trip lifecycle ─────────────────────────────────────────────────────────
async function startTrip() {
  const updated = {
    ...tripData.value,
    status:      'EN_ROUTE',
    startTime:   new Date().toISOString(),
    currentStop: waypoints.value[0]?.name || null,
  };
  await tripApi.updateTrip(updated);
  // also update in the list
  const idx = allTrips.value.findIndex(t => t.id === updated.id);
  if (idx !== -1) allTrips.value[idx] = updated;
  tripData.value     = updated;
  currentWpIdx.value = 0;
  placeBusAt(waypoints.value[0]);
  refreshStopColors();
  toast.add({ severity: 'info', summary: 'Viaje iniciado', detail: `Ruta: ${updated.routeName}`, life: 3000 });
}

function finishTrip() {
  const wps = waypoints.value;
  const lastIdx = wps.length - 1;
  const isNotFinished = currentWpIdx.value < lastIdx;

  confirm.require({
    message: isNotFinished 
      ? '⚠️ Hay alumnos a bordo (no has completado todas las paradas). ¿Forzar finalización?' 
      : '¿Confirmas la finalización del viaje? Se registrará como completado.',
    header:      'Finalizar Viaje',
    icon:        'pi pi-flag-fill',
    acceptLabel: 'Sí, finalizar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      pauseSim();
      const wps     = waypoints.value;
      const lastIdx = wps.length - 1;
      const updated = {
        ...tripData.value,
        status:          'COMPLETED',
        endTime:         new Date().toISOString(),
        studentsBoarded: tripData.value.studentsTotal,
        currentStop:     null,
        currentLocation: wps[lastIdx]?.name || tripData.value.currentLocation,
      };
      await tripApi.updateTrip(updated);
      // sync list
      const idx = allTrips.value.findIndex(t => t.id === updated.id);
      if (idx !== -1) allTrips.value[idx] = updated;
      tripData.value     = updated;
      currentWpIdx.value = lastIdx;
      if (lastIdx >= 0) placeBusAt(wps[lastIdx]);
      refreshStopColors();
      toast.add({ severity: 'success', summary: '¡Viaje finalizado!', detail: 'Todos los alumnos entregados. Puedes seleccionar otro viaje.', life: 5000 });
    },
  });
}

// ── Select trip-execution-and-monitoring (from left panel) ──────────────────────────────────────────
async function selectTrip(trip) {
  if (tripData.value?.id === trip.id) return;
  pauseSim();
  boardingState.value = {};

  tripData.value  = trip;
  routeData.value = routeCache.value[trip.routeId] || null;
  roadPath.value  = [];
  wpIndices.value = [];

  // Restore simulation position
  const wps = routeData.value?.waypoints || [];
  if (trip.status === 'EN_ROUTE' && wps.length) {
    const idx = trip.currentStop
      ? wps.findIndex(w => w.name === trip.currentStop)
      : 0;
    currentWpIdx.value = idx >= 0 ? idx : 0;
  } else if (trip.status === 'COMPLETED') {
    currentWpIdx.value = Math.max(0, wps.length - 1);
  } else {
    currentWpIdx.value = -1;
  }

  
  buildMapLayer();
  // Always show the bus at the first / current stop (even for SCHEDULED trips)
  if (wps.length) {
    const wpIdx = currentWpIdx.value >= 0 ? currentWpIdx.value : 0;
    placeBusAt(wps[wpIdx]);
  }

  // Then fetch real road geometry and upgrade the map
  if (wps.length >= 2) {
    await loadRoadRoute();
    buildMapLayer(); // rebuild with real roads
    // Re-place the bus on top of the new layer
    const wpIdx = currentWpIdx.value >= 0 ? currentWpIdx.value : 0;
    placeBusAt(wps[wpIdx]);

    // Snap bus to exact road position
    if (roadPath.value.length) {
      const roadIdx = wpIndices.value[wpIdx] ?? 0;
      const pos     = roadPath.value[roadIdx];
      if (pos) busMarker?.setLatLng(pos);
    }
  }
}

// ── Emergency ─────────────────────────────────────────────────────────────
const emergencyDialog   = ref(false);
const emergencyMode     = ref(null); // 'urgent' | 'mild'
const emergencyForm     = ref({ type: 'OTRO', description: '' });

const EMERGENCY_PHONE = '+51 900 000 000'; // central de emergencias

function openEmergency() {
  emergencyMode.value = null;
  emergencyForm.value = { type: 'OTRO', description: '' };
  emergencyDialog.value = true;
}

function callEmergency() {
  window.location.href = `tel:${EMERGENCY_PHONE.replace(/\s/g, '')}`;
  emergencyDialog.value = false;
}

function submitEmergencyReport() {
  if (!emergencyForm.value.description) return;
  const inc = {
    id:             `i-${Date.now()}`,
    tripId:         tripData.value?.id || null,
    routeId:        tripData.value?.routeId || null,
    routeName:      tripData.value?.routeName || '',
    type:           emergencyForm.value.type,
    severity:       'HIGH',
    description:    emergencyForm.value.description,
    reportedBy:     iamStore.currentUser?.id || 'DRIVER',
    timestamp:      new Date().toISOString(),
    status:         'OPEN',
    organizationId: 'org-1',
  };
  const key   = 'saferoute.incidents';
  const extra = JSON.parse(localStorage.getItem(key) || '[]');
  extra.push(inc);
  localStorage.setItem(key, JSON.stringify(extra));
  emergencyDialog.value = false;
  toast.add({ severity: 'warn', summary: 'Incidencia reportada', detail: 'Registrada y notificada al administrador.', life: 4000 });
}

// ── US17 — Pre-trip Security Checklist ────────────────────────────────────
const checklistDialog = ref(false);
const checklist = ref([
  { id: 'luces',      label: 'Luces delanteras y traseras', icon: 'pi pi-sun',         checked: false },
  { id: 'frenos',     label: 'Sistema de frenos operativo', icon: 'pi pi-stop-circle',  checked: false },
  { id: 'cinturones', label: 'Cinturones de seguridad',     icon: 'pi pi-link',         checked: false },
  { id: 'documentos', label: 'Documentos del vehículo',     icon: 'pi pi-file',         checked: false },
  { id: 'extintor',   label: 'Extintor vigente',            icon: 'pi pi-shield',       checked: false },
]);
const checklistComplete = computed(() => checklist.value.every(c => c.checked));

function openChecklist() {
  checklist.value.forEach(c => { c.checked = false; });
  checklistDialog.value = true;
}
async function confirmChecklist() {
  checklistDialog.value = false;
  await startTrip();
}

// ── US13 — SOS Panic Button ────────────────────────────────────────────────
const sosHolding  = ref(false);
const sosProgress = ref(0);
const sosActive   = ref(false);
let sosTimer         = null;
let sosProgressTimer = null;
const SOS_HOLD_MS = 3000;

function sosStart() {
  if (sosActive.value) return;
  sosHolding.value  = true;
  sosProgress.value = 0;
  const t0 = Date.now();
  sosProgressTimer = setInterval(() => {
    sosProgress.value = Math.min(100, ((Date.now() - t0) / SOS_HOLD_MS) * 100);
  }, 40);
  sosTimer = setTimeout(triggerSOS, SOS_HOLD_MS);
}
function sosEnd() {
  if (!sosHolding.value) return;
  clearTimeout(sosTimer);
  clearInterval(sosProgressTimer);
  const cancelled = sosProgress.value < 66; // < ~2s
  sosHolding.value  = false;
  sosProgress.value = 0;
  if (cancelled) {
    toast.add({ severity: 'info', summary: 'Cancelado', detail: 'Mantén 3 segundos para activar el SOS.', life: 2000 });
  }
}
function triggerSOS() {
  clearInterval(sosProgressTimer);
  sosHolding.value  = false;
  sosProgress.value = 100;
  sosActive.value   = true;
  const wp  = waypoints.value[Math.max(0, currentWpIdx.value)];
  const inc = {
    id:             `i-sos-${Date.now()}`,
    tripId:         tripData.value?.id || null,
    routeId:        tripData.value?.routeId || null,
    routeName:      tripData.value?.routeName || '',
    type:           'EMERGENCIA',
    severity:       'HIGH',
    description:    `🚨 SOS activado por ${iamStore.currentUser?.firstName || 'Conductor'}. Ubicación: ${wp?.name || tripData.value?.currentStop || 'En ruta'}. Coord: ${wp?.lat ?? '—'}, ${wp?.lng ?? '—'}`,
    reportedBy:     iamStore.currentUser?.id || 'DRIVER',
    timestamp:      new Date().toISOString(),
    status:         'OPEN',
    organizationId: iamStore.currentUser?.organizationId || 'org-1',
  };
  const orgId = iamStore.currentUser?.organizationId || 'default';
  const key   = `saferoute.incidents.${orgId}`;
  const extra = JSON.parse(localStorage.getItem(key) || '[]');
  extra.push(inc);
  localStorage.setItem(key, JSON.stringify(extra));
  toast.add({ severity: 'error', summary: '🚨 SOS ACTIVADO', detail: 'Alerta enviada con coordenadas GPS. Central notificada.', life: 10000 });
}
function cancelSOS() {
  sosActive.value   = false;
  sosProgress.value = 0;
  toast.add({ severity: 'info', summary: 'SOS desactivado', detail: 'La alerta de emergencia fue cancelada.', life: 3000 });
}

// ── US16 — Navigation Integration ─────────────────────────────────────────
function openNavigation() {
  const idx  = Math.min(currentWpIdx.value + 1, waypoints.value.length - 1);
  const dest = waypoints.value[idx] || waypoints.value[0];
  if (!dest) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  window.open(url, '_blank');
  toast.add({ severity: 'info', summary: 'Abriendo Google Maps', detail: `Navegando hacia: ${dest.name}`, life: 2500 });
}

// ── US11.S1 — Per-student Boarding ────────────────────────────────────────
const boardingState = ref({});  // { [childId]: 'ABORDADO' | 'AUSENTE' }

const boardingStudents = computed(() => {
  if (!tripData.value?.studentIds) return [];
  const orgId = iamStore.currentUser?.organizationId || null;
  const extra = JSON.parse(localStorage.getItem(`saferoute.mock.children.${orgId || 'default'}`) || 'null');
  const allChildren = extra || (orgId ? seedData.children.filter(c => c.organizationId === orgId) : []);
  return allChildren
    .filter(c => tripData.value.studentIds.includes(c.id))
    .map(c => ({ ...c, boardingMark: boardingState.value[c.id] ?? null }));
});

function markBoarding(childId, status) {
  boardingState.value = { ...boardingState.value, [childId]: status };
  const boarded = Object.values(boardingState.value).filter(s => s === 'ABORDADO').length;
  if (tripData.value) {
    tripData.value = { ...tripData.value, studentsBoarded: boarded };
    tripApi.updateTrip(tripData.value);
  }
  const label = status === 'ABORDADO' ? 'abordado' : 'ausente';
  const child = boardingStudents.value.find(c => c.id === childId);
  toast.add({
    severity: status === 'ABORDADO' ? 'success' : 'warn',
    summary:  status === 'ABORDADO' ? 'Abordaje confirmado' : 'Alumno ausente',
    detail:   `${child?.name || 'Alumno'} marcado como ${label}.`,
    life: 2500,
  });
}

// ── US11.S2/S3 — QR Scanner ───────────────────────────────────────────────
const qrDialog   = ref(false);
const qrScanning = ref(false);
let html5QrCode       = null;
let qrErrorCooldown   = false;   // debounce: only 1 "not found" toast per 3 s
let qrHandlingSuccess = false;   // prevent double-fire while closing

async function openQrScanner() {
  qrDialog.value       = true;
  qrHandlingSuccess    = false;
  qrErrorCooldown      = false;
  await nextTick();
  try {
    html5QrCode = new Html5Qrcode('qr-reader');
    qrScanning.value = true;
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 30,
        qrbox: { width: 220, height: 220 },
      },
      (decodedText) => onQrSuccess(decodedText),
      (_err) => { /* ignore per-frame decode errors */ }
    );
  } catch (e) {
    qrScanning.value = false;
    toast.add({ severity: 'warn', summary: 'Cámara no disponible', detail: 'No se pudo acceder a la cámara del dispositivo.', life: 3500 });
    qrDialog.value = false;
  }
}

async function closeQrScanner() {
  if (html5QrCode && qrScanning.value) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (_) { /* ignore */ }
  }
  html5QrCode       = null;
  qrScanning.value  = false;
  qrDialog.value    = false;
  qrHandlingSuccess = false;
  qrErrorCooldown   = false;
}

function onQrSuccess(decodedText) {
  // Guard: ignore frames that fire after we already matched
  if (qrHandlingSuccess) return;

  const matched = boardingStudents.value.find(c => c.id === decodedText);
  if (matched) {
    // US-11.S2: valid student on this trip — mark and close immediately
    qrHandlingSuccess = true;
    markBoarding(matched.id, 'ABORDADO');
    closeQrScanner();
  } else {
    // US-11.S3: unknown QR — debounce so toast fires at most once every 3 s
    if (qrErrorCooldown) return;
    qrErrorCooldown = true;
    toast.add({
      severity: 'error',
      summary:  'Alumno no encontrado',
      detail:   'El QR escaneado no corresponde a ningún alumno de este viaje.',
      life: 3000,
    });
    setTimeout(() => { qrErrorCooldown = false; }, 3000);
  }
}

// ── Load all data ──────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  const [tripsRes, routesRes] = await Promise.all([
    tripApi.getTrips(),
    routeApi.getRoutes(),
  ]);
  const allFetched = tripsRes.data || [];
  const isDriver   = iamStore.currentUser?.roleTier === 'DRIVER';
  const myId       = iamStore.currentUser?.id;
  // DRIVER only sees their own trips; ADMIN/others see all.
  allTrips.value = isDriver
    ? allFetched.filter(t => t.driverId === myId)
    : allFetched;
  routeCache.value = {};
  (routesRes.data || []).forEach(r => { routeCache.value[r.id] = r; });
  loading.value = false;
}

function handleOffline() {
  isOffline.value = true;
  toast.add({ severity: 'error', summary: 'Sin conexión', detail: 'Modo Offline: reconectando...', life: 5000 });
}
function handleOnline() {
  isOffline.value = false;
  toast.add({ severity: 'success', summary: 'Conectado', detail: 'Conexión restaurada.', life: 3000 });
}

onMounted(async () => {
  await loadData();
  await nextTick();
  initMap();

  // Auto-select: prefer EN_ROUTE → SCHEDULED → first
  const driverId = iamStore.currentUser?.id;
  const auto =
    allTrips.value.find(t => t.driverId === driverId && t.status === 'EN_ROUTE') ||
    allTrips.value.find(t => t.driverId === driverId && t.status === 'SCHEDULED') ||
    allTrips.value.find(t => t.driverId === driverId) ||
    allTrips.value[0] || null;

  if (auto) await selectTrip(auto);

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
});

onBeforeUnmount(async () => {
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('online', handleOnline);
  pauseSim();
  if (html5QrCode && qrScanning.value) {
    try { await html5QrCode.stop(); html5QrCode.clear(); } catch (_) {}
    html5QrCode = null;
  }
  if (map) { map.remove(); map = null; }
});
</script>

<template>
  <div class="active-trip">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Viajes</h1>
        <p class="page-sub">Selecciona un viaje para iniciar o continuar la simulación</p>
      </div>
      <div class="header-right">
        <div v-if="isOffline" class="offline-badge">
          <i class="pi pi-wifi" style="text-decoration: line-through"/> Modo Offline: reconectando...
        </div>
        <span v-if="orsLoading" class="ors-badge">
          <i class="pi pi-spin pi-spinner"/> Calculando ruta real…
        </span>
        <template v-if="tripData && isEnRoute && waypoints.length">
          <pv-button
            icon="pi pi-refresh"
            label="Reiniciar"
            size="small"
            severity="secondary"
            :disabled="orsLoading || isOffline"
            @click="resetSim"/>
          <pv-button v-if="!simRunning" label="Simular" icon="pi pi-play" size="small" :disabled="orsLoading || isOffline" @click="startSim"/>
          <pv-button v-else label="Pausar" icon="pi pi-pause" size="small" severity="secondary" @click="pauseSim"/>
        </template>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size:2rem;color:var(--amber)"/>
    </div>

    <template v-else>

      <!-- Stats bar (only when a trip-execution-and-monitoring is selected) -->
      <div v-if="tripData" class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Estado</span>
          <span class="stat-value">
            <span class="status-pill" :class="tripStatus.toLowerCase().replace('_','-')">
              <i :class="getMeta(tripStatus).icon" style="font-size:0.6rem"/>
              {{ getMeta(tripStatus).label }}
            </span>
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Alumnos</span>
          <span class="stat-value">{{ tripData.studentsBoarded }} / {{ tripData.studentsTotal }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Progreso</span>
          <span class="stat-value">{{ progress }}%</span>
        </div>
        <div class="stat-card" v-if="tripData.vehiclePlate">
          <span class="stat-label">Vehículo</span>
          <span class="stat-value small">{{ tripData.vehiclePlate }}</span>
        </div>
        <div class="stat-card" v-if="tripData.scheduledStartTime">
          <span class="stat-label">Salida</span>
          <span class="stat-value small">{{ tripData.scheduledStartTime }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Parada actual</span>
          <span class="stat-value small">{{ tripData.currentStop || (isCompleted ? 'Finalizado' : '—') }}</span>
        </div>
      </div>

      <!-- Three-column layout -->
      <div class="content-grid">

        <!-- LEFT: trip-execution-and-monitoring selector list -->
        <div class="trips-panel">
          <p class="panel-label">Viajes disponibles</p>
          <div v-if="allTrips.length === 0" class="empty-panel">Sin viajes</div>

          <div
            v-for="trip in allTrips" :key="trip.id"
            class="trip-card"
            :class="{ active: tripData?.id === trip.id }"
            @click="selectTrip(trip)">

            <div class="trip-card-top">
              <span class="trip-card-name">{{ trip.routeName || `Viaje #${trip.id}` }}</span>
              <span class="status-dot" :style="{ background: getMeta(trip.status).text }"/>
            </div>

            <div class="trip-card-meta">
              <span><i class="pi pi-user meta-icon"/> {{ trip.driverName }}</span>
              <span><i class="pi pi-users meta-icon"/> {{ trip.studentsBoarded }}/{{ trip.studentsTotal }}</span>
            </div>

            <div class="trip-card-bottom">
              <span class="type-chip" :class="tripTypeClass(trip)">{{ tripTypeLabel(trip) }}</span>
              <span class="status-label" :style="{ color: getMeta(trip.status).text }">
                {{ getMeta(trip.status).label }}
              </span>
            </div>
          </div>
        </div>

        <!-- CENTER: map + progress -->
        <div class="map-col">
          <div id="active-trip-map" class="leaflet-map"/>
          <div v-if="tripData" class="progress-card">
            <div class="progress-header">
              <span>{{ tripData.routeName }}</span>
              <strong :style="{ color: progress === 100 ? 'var(--green)' : 'var(--amber)' }">{{ progress }}%</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill"
                   :style="{ width: progress + '%', background: progress === 100 ? 'var(--green)' : 'var(--amber)' }"/>
            </div>
          </div>
        </div>

        <!-- RIGHT: stops panel -->
        <div class="stops-col">

          <!-- No trip-execution-and-monitoring selected -->
          <div v-if="!tripData" class="start-state">
            <i class="pi pi-hand-pointer start-icon"/>
            <p>Selecciona un viaje de la lista para ver sus paradas.</p>
          </div>

          <template v-else>
            <div class="stops-header">
              <h3 class="stops-title">
                <i class="pi pi-map-marker"/>
                Paradas
                <span class="stops-count">{{ waypoints.length }}</span>
              </h3>
              <span v-if="simRunning" class="sim-badge">
                <i class="pi pi-spin pi-spinner" style="font-size:0.7rem"/> Simulando…
              </span>
            </div>

            <!-- SCHEDULED → start button (US17: opens checklist first) -->
            <div v-if="isScheduled" class="start-state">
              <i class="pi pi-clock start-icon"/>
              <p>Viaje programado.<br>Completa el <strong>check de seguridad</strong> para comenzar.</p>
              <pv-button label="Check de Seguridad" icon="pi pi-shield" :disabled="isOffline" @click="openChecklist"/>
            </div>

            <!-- EN_ROUTE / COMPLETED → stop list -->
            <template v-else>
              <div class="stop-list">
                <div
                  v-for="(stop, i) in stops" :key="i"
                  class="stop-item"
                  :class="{ done: stop.done, current: stop.current, clickable: isEnRoute && i > currentWpIdx }"
                  @click="goToStop(i)">

                  <div class="stop-num"
                       :style="{
                         background: stop.done ? '#22c55e' : stop.current ? '#ffb74d' : '#e5e7eb',
                         color:      stop.done ? '#fff'    : stop.current ? '#1a1a2e' : '#94a3b8',
                       }">
                    <i v-if="stop.done" class="pi pi-check" style="font-size:9px"/>
                    <span v-else>{{ i + 1 }}</span>
                  </div>

                  <div class="stop-info">
                    <span class="stop-name">{{ stop.name }}</span>
                    <span v-if="stop.current && isEnRoute" class="stop-badge current-badge">
                      <i class="pi pi-circle-fill blink" style="font-size:0.45rem"/> Aquí ahora
                    </span>
                    <span v-else-if="stop.done" class="stop-badge done-badge">Completada</span>
                  </div>

                  <i v-if="isEnRoute && i > currentWpIdx" class="pi pi-arrow-right tap-hint"/>
                </div>
              </div>

              <!-- US11.S1 — Per-student boarding panel -->
              <div v-if="isEnRoute && boardingStudents.length" class="boarding-panel">
                <div class="boarding-title">
                  <i class="pi pi-users"/> Abordaje de alumnos
                  <span class="boarding-count">{{ Object.values(boardingState).filter(s=>s==='ABORDADO').length }}/{{ boardingStudents.length }}</span>
                  <button class="qr-scan-btn" @click="openQrScanner" title="Escanear QR del alumno">
                    <i class="pi pi-qrcode"/> Escanear QR
                  </button>
                </div>
                <div class="boarding-list">
                  <div v-for="child in boardingStudents" :key="child.id" class="boarding-row">
                    <span class="boarding-name">{{ child.name }}</span>
                    <div class="boarding-btns">
                      <button
                        class="b-btn aboard"
                        :class="{ active: child.boardingMark === 'ABORDADO' }"
                        @click="markBoarding(child.id, 'ABORDADO')">
                        <i class="pi pi-check"/>
                      </button>
                      <button
                        class="b-btn absent"
                        :class="{ active: child.boardingMark === 'AUSENTE' }"
                        @click="markBoarding(child.id, 'AUSENTE')">
                        <i class="pi pi-times"/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="action-row">
                <!-- US16 — Navigation -->
                <pv-button
                  v-if="isEnRoute"
                  label="Navegar"
                  icon="pi pi-map"
                  severity="secondary"
                  outlined
                  class="w-full"
                  @click="openNavigation"/>

                <pv-button
                  v-if="isEnRoute"
                  label="Finalizar Viaje"
                  icon="pi pi-flag-fill"
                  severity="danger"
                  class="w-full"
                  @click="finishTrip"/>

                <div v-else-if="isCompleted" class="completed-banner">
                  <i class="pi pi-check-circle"/>
                  Completado · selecciona otro viaje
                </div>

                <!-- US13 — SOS Panic Button -->
                <div v-if="sosActive" class="sos-active-banner">
                  <i class="pi pi-exclamation-triangle sos-blink"/>
                  <span>🚨 SOS ACTIVO — Central notificada</span>
                  <button class="sos-cancel-btn" @click="cancelSOS">Cancelar</button>
                </div>
                <div v-else class="sos-hold-wrap">
                  <button
                    class="sos-hold-btn w-full"
                    @mousedown="sosStart" @mouseup="sosEnd" @mouseleave="sosEnd"
                    @touchstart.prevent="sosStart" @touchend.prevent="sosEnd">
                    <svg class="sos-ring" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fee2e2" stroke-width="2.5"/>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" stroke-width="2.5"
                        stroke-dasharray="100" :stroke-dashoffset="100 - sosProgress"
                        stroke-linecap="round" transform="rotate(-90 18 18)"
                        style="transition:stroke-dashoffset 0.04s linear"/>
                    </svg>
                    <i class="pi pi-exclamation-triangle sos-icon"/>
                    <span>{{ sosHolding ? 'Suelta para cancelar…' : 'SOS — Mantén 3 seg' }}</span>
                  </button>
                </div>
              </div>
            </template>
          </template>
        </div>

      </div><!-- /content-grid -->
    </template>

    <pv-confirm-dialog/>

    <!-- US17 — Security Checklist Dialog -->
    <pv-dialog v-model:visible="checklistDialog" header="✅ Check de Seguridad Pre-Ruta" modal style="width:420px" :closable="false">
      <p class="checklist-intro">Marca todos los ítems antes de iniciar el viaje.</p>
      <div class="checklist-items">
        <label v-for="item in checklist" :key="item.id" class="checklist-row" :class="{ checked: item.checked }">
          <pv-checkbox v-model="item.checked" :binary="true"/>
          <i :class="item.icon" class="checklist-icon"/>
          <span>{{ item.label }}</span>
          <i v-if="item.checked" class="pi pi-check-circle checklist-ok"/>
        </label>
      </div>
      <div v-if="checklistComplete" class="checklist-ready">
        <i class="pi pi-shield"/> Todo en orden — listo para partir
      </div>
      <template #footer>
        <pv-button label="Cancelar" text @click="checklistDialog = false"/>
        <pv-button label="Iniciar Viaje" icon="pi pi-play" :disabled="!checklistComplete" @click="confirmChecklist"/>
      </template>
    </pv-dialog>

    <!-- US11.S2/S3 — QR Scanner Dialog -->
    <pv-dialog
      v-model:visible="qrDialog"
      header="📷 Escanear QR de Alumno"
      modal
      style="width:360px"
      :closable="true"
      @hide="closeQrScanner">
      <p class="qr-hint">Apunta la cámara al código QR del carnet del alumno.</p>
      <div id="qr-reader" class="qr-reader-box"/>
      <p v-if="qrScanning" class="qr-scanning-label">
        <i class="pi pi-spin pi-spinner"/> Escaneando…
      </p>
      <template #footer>
        <pv-button label="Cancelar" text @click="closeQrScanner"/>
      </template>
    </pv-dialog>

    <!-- Emergency dialog -->
    <pv-dialog v-model:visible="emergencyDialog" header="🚨 Emergencia" modal style="width:400px">
      <!-- Mode select -->
      <div v-if="!emergencyMode" class="em-mode-list">
        <button class="em-mode-card urgent" @click="emergencyMode = 'urgent'">
          <i class="pi pi-phone em-mode-icon"/>
          <div>
            <strong>Urgente</strong>
            <p>Llamar a la central de emergencias</p>
          </div>
        </button>
        <button class="em-mode-card mild" @click="emergencyMode = 'mild'">
          <i class="pi pi-file-edit em-mode-icon"/>
          <div>
            <strong>Leve</strong>
            <p>Reportar incidencia al administrador</p>
          </div>
        </button>
      </div>

      <!-- Urgent: call -->
      <div v-else-if="emergencyMode === 'urgent'" class="em-call-panel">
        <div class="em-call-ring"><i class="pi pi-phone"/></div>
        <p class="em-call-label">Central de emergencias</p>
        <p class="em-call-number">{{ EMERGENCY_PHONE }}</p>
      </div>

      <!-- Mild: report form -->
      <div v-else class="em-form">
        <div class="em-field">
          <label>Tipo</label>
          <pv-select
            v-model="emergencyForm.type"
            :options="[{ value: 'RETRASO', label: 'Retraso' }, { value: 'AVERIA', label: 'Avería' }, { value: 'ACCIDENTE', label: 'Accidente' }, { value: 'COMPORTAMIENTO', label: 'Comportamiento' }, { value: 'OTRO', label: 'Otro' }]"
            option-label="label" option-value="value" class="w-full"/>
        </div>
        <div class="em-field">
          <label>Descripción *</label>
          <pv-textarea v-model="emergencyForm.description" rows="4" class="w-full" placeholder="Describe lo ocurrido..."/>
        </div>
      </div>

      <template #footer>
        <pv-button label="Volver" text @click="emergencyMode ? (emergencyMode = null) : (emergencyDialog = false)"/>
        <pv-button
          v-if="emergencyMode === 'urgent'"
          label="Llamar ahora"
          icon="pi pi-phone"
          severity="danger"
          @click="callEmergency"/>
        <pv-button
          v-else-if="emergencyMode === 'mild'"
          label="Enviar reporte"
          icon="pi pi-send"
          :disabled="!emergencyForm.description"
          @click="submitEmergencyReport"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.active-trip { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

/* Header */
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title   { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.2rem; }
.page-sub     { font-family: var(--sans); font-size: 0.875rem; color: var(--muted); margin: 0; }
.header-right { display: flex; align-items: center; gap: 0.6rem; }

/* Stats row */
.stats-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.65rem; margin-bottom: 1rem;
}
.stat-card {
  background: #fff; border-radius: 10px;
  padding: 0.7rem 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 0.2rem;
}
.stat-label { font-size: 0.68rem; text-transform: uppercase; font-weight: 700; color: var(--muted); }
.stat-value { font-size: 1rem; font-weight: 800; color: var(--dark); }
.stat-value.small { font-size: 0.82rem; }

/* Three-column grid */
.content-grid {
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  gap: 1rem;
  height: calc(100vh - 230px);
}

/* ── Left: trip-execution-and-monitoring list ──────────────────────────── */
.trips-panel {
  display: flex; flex-direction: column; gap: 0.5rem;
  overflow-y: auto;
}
.panel-label {
  font-size: 0.72rem; text-transform: uppercase; font-weight: 700;
  color: var(--muted); letter-spacing: 0.4px; margin: 0 0 0.25rem;
}
.empty-panel { color: var(--muted); font-size: 0.82rem; text-align: center; padding: 1.5rem 0; }

.trip-card {
  background: #fff; border: 2px solid #e5e7eb; border-radius: 10px;
  padding: 0.75rem; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.trip-card:hover  { border-color: var(--amber); box-shadow: 0 2px 6px rgba(0,0,0,.07); }
.trip-card.active { border-color: var(--amber); background: #fffbf2; }

.trip-card-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 0.4rem; margin-bottom: 0.35rem;
}
.trip-card-name { font-size: 0.82rem; font-weight: 700; color: var(--dark); line-height: 1.3; }
.status-dot     { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }

.trip-card-meta {
  display: flex; flex-direction: column; gap: 0.18rem;
  font-size: 0.75rem; color: var(--muted); margin-bottom: 0.4rem;
}
.meta-icon { color: var(--amber); font-size: 0.68rem; margin-right: 0.2rem; }

.trip-card-bottom { display: flex; justify-content: space-between; align-items: center; }
.type-chip {
  font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 20px;
}
.type-chip.recojo  { background: #dbeafe; color: #1d4ed8; }
.type-chip.retorno { background: #fce7f3; color: #be185d; }
.status-label { font-size: 0.72rem; font-weight: 700; }

/* ── Center: map ──────────────────────────────── */
.map-col    { display: flex; flex-direction: column; gap: 0.65rem; min-height: 0; }
.leaflet-map {
  flex: 1; min-height: 300px;
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.08);
}
.progress-card {
  background: #fff; border-radius: 10px; padding: 0.75rem 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); flex-shrink: 0;
}
.progress-header { display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: var(--dark); margin-bottom: 0.35rem; }
.progress-track  { height: 7px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.progress-fill   { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

/* ── Right: stops ─────────────────────────────── */
.stops-col {
  background: #fff; border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  display: flex; flex-direction: column; overflow: hidden;
}
.stops-header {
  padding: 0.85rem 1.1rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: space-between;
}
.stops-title {
  font-family: var(--heading); font-size: 0.9rem; font-weight: 700;
  color: var(--dark); margin: 0; display: flex; align-items: center; gap: 0.45rem;
}
.stops-count {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--amber); color: var(--dark);
  font-size: 0.62rem; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.sim-badge { font-size: 0.72rem; color: #92400e; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; }

.start-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.85rem; padding: 1.5rem; text-align: center;
}
.start-icon { font-size: 2.2rem; color: var(--amber); }
.start-state p { color: var(--muted); font-size: 0.82rem; line-height: 1.6; margin: 0; }

.stop-list { flex: 1; overflow-y: auto; padding: 0.6rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem; }

.stop-item {
  display: flex; align-items: center; gap: 0.55rem;
  padding: 0.5rem 0.65rem; border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: background 0.12s, border-color 0.12s;
}
.stop-item.done    { background: #f0fdf4; border-color: #bbf7d0; }
.stop-item.current { background: #fffbf2; border-color: var(--amber); }
.stop-item.clickable { cursor: pointer; }
.stop-item.clickable:hover { background: #f9fafb; border-color: #d1d5db; }

.stop-num {
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 9px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stop-info   { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.stop-name   { font-size: 0.8rem; font-weight: 600; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop-badge  { font-size: 0.65rem; font-weight: 700; }
.done-badge    { color: #15803d; }
.current-badge { color: #92400e; display: flex; align-items: center; gap: 0.25rem; }
.tap-hint    { color: #d1d5db; font-size: 0.65rem; }

/* ── US11.S1 Boarding Panel ───────────────────────────────── */
.boarding-panel { border-top: 1px solid #f3f4f6; padding: 0.6rem 0.85rem; flex-shrink: 0; }
.boarding-title { font-size: 0.75rem; font-weight: 700; color: var(--dark); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.45rem; }
.boarding-count { margin-left: auto; background: var(--amber); color: var(--dark); font-size: 0.65rem; font-weight: 800; padding: 1px 7px; border-radius: 20px; }
.boarding-list  { display: flex; flex-direction: column; gap: 0.3rem; }
.boarding-row   { display: flex; align-items: center; gap: 0.5rem; }
.boarding-name  { font-size: 0.78rem; color: var(--dark); flex: 1; }
.boarding-btns  { display: flex; gap: 0.25rem; }
.b-btn { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #f9fafb; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; transition: all 0.15s; }
.b-btn.aboard:hover, .b-btn.aboard.active { background: #dcfce7; border-color: #22c55e; color: #15803d; }
.b-btn.absent:hover, .b-btn.absent.active { background: #fee2e2; border-color: #ef4444; color: #dc2626; }

.action-row { padding: 0.75rem 0.85rem; border-top: 1px solid #f3f4f6; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.6rem; }

/* ── US13 SOS Button ──────────────────────────────────────── */
.sos-hold-btn {
  position: relative; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.65rem 1rem; border-radius: 10px; border: 2px solid #ef4444;
  background: #fff5f5; color: #dc2626; font-weight: 700; font-size: 0.8rem;
  cursor: pointer; user-select: none; font-family: inherit; width: 100%;
  transition: background 0.15s;
}
.sos-hold-btn:active, .sos-hold-btn:hover { background: #fee2e2; }
.sos-ring { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; flex-shrink: 0; }
.sos-icon { font-size: 0.85rem; }
.sos-active-banner {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  background: #fee2e2; border: 2px solid #ef4444; border-radius: 10px;
  padding: 0.6rem 0.85rem; font-size: 0.8rem; font-weight: 700; color: #dc2626;
}
.sos-blink { animation: sosBlink 0.8s ease-in-out infinite; }
@keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.sos-cancel-btn { margin-left: auto; background: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 3px 10px; font-size: 0.72rem; font-weight: 700; cursor: pointer; font-family: inherit; }

/* ── US17 Checklist Dialog ────────────────────────────────── */
.checklist-intro { font-size: 0.85rem; color: var(--muted); margin: 0 0 1rem; }
.checklist-items { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.checklist-row {
  display: flex; align-items: center; gap: 0.65rem;
  padding: 0.6rem 0.85rem; border-radius: 10px;
  border: 1.5px solid #e5e7eb; cursor: pointer; transition: all 0.15s;
  font-size: 0.875rem; color: var(--dark);
}
.checklist-row.checked { border-color: #22c55e; background: #f0fdf4; }
.checklist-icon { color: var(--amber); font-size: 0.9rem; }
.checklist-ok   { color: #22c55e; margin-left: auto; }
.checklist-ready { background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 700; color: #15803d; display: flex; align-items: center; gap: 0.5rem; }
.completed-banner {
  display: flex; align-items: center; justify-content: center; gap: 0.45rem;
  background: #f0fdf4; color: #15803d;
  border-radius: 8px; padding: 0.65rem; font-size: 0.82rem; font-weight: 600;
}

/* Status pills */
.status-pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px;
}
.status-pill.en-route  { background: #dcfce7; color: #15803d; }
.status-pill.scheduled { background: #fef9c3; color: #854d0e; }
.status-pill.completed { background: #e0f2fe; color: #0369a1; }
.status-pill.cancelled { background: #fee2e2; color: #dc2626; }

.blink { animation: blink 1.2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

.loading-state { text-align: center; padding: 4rem; }
.ors-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 600; color: #92400e; background: #fef3c7; padding: 0.3rem 0.75rem; border-radius: 20px; }
.offline-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 600; color: #dc2626; background: #fee2e2; padding: 0.3rem 0.75rem; border-radius: 20px; }

/* Emergency button */
.emergency-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  background: var(--amber, #ffb74d);
  border: none; border-radius: 8px;
  padding: 0.7rem 1rem;
  font-size: 0.95rem; font-weight: 800;
  color: #1a1a2e; cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
  letter-spacing: 0.3px;
}
.emergency-btn:hover  { filter: brightness(1.08); transform: translateY(-1px); }
.emergency-btn:active { filter: brightness(0.95); transform: translateY(0); }

/* Emergency dialog */
.em-mode-list { display: flex; flex-direction: column; gap: 0.75rem; }
.em-mode-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.1rem; border-radius: 10px; cursor: pointer; text-align: left;
  border: 2px solid transparent; width: 100%; background: none;
  transition: all 0.15s;
}
.em-mode-card strong { display: block; font-size: 0.95rem; color: var(--dark); }
.em-mode-card p      { margin: 3px 0 0; font-size: 0.78rem; color: var(--muted); }
.em-mode-card.urgent { background: #fee2e2; border-color: #fca5a5; }
.em-mode-card.urgent:hover { background: #fecaca; }
.em-mode-card.mild   { background: #fef9c3; border-color: #fde047; }
.em-mode-card.mild:hover { background: #fef08a; }
.em-mode-icon { font-size: 1.6rem; flex-shrink: 0; }
.em-mode-card.urgent .em-mode-icon { color: #dc2626; }
.em-mode-card.mild   .em-mode-icon { color: #92400e; }

.em-call-panel { text-align: center; padding: 1rem 0; }
.em-call-ring {
  width: 64px; height: 64px; border-radius: 50%;
  background: #fee2e2; color: #dc2626;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; margin: 0 auto 0.75rem;
}
.em-call-label  { font-size: 0.85rem; color: var(--muted); margin: 0 0 0.25rem; }
.em-call-number { font-size: 1.3rem; font-weight: 800; color: #dc2626; margin: 0; letter-spacing: 1px; }

.em-form { display: flex; flex-direction: column; gap: 0.85rem; }
.em-field { display: flex; flex-direction: column; gap: 0.3rem; }
.em-field label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }

/* ── US11.S2/S3 QR Scanner ──────────────────────────────────── */
.qr-scan-btn {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: #eff6ff; border: 1.5px solid #93c5fd;
  color: #1d4ed8; border-radius: 6px;
  padding: 2px 8px; font-size: 0.68rem; font-weight: 700;
  cursor: pointer; transition: background 0.15s; font-family: inherit;
}
.qr-scan-btn:hover { background: #dbeafe; }
.qr-reader-box {
  width: 100%; min-height: 300px;
  border-radius: 10px;
  /* NO overflow:hidden — html5-qrcode injects overlay divs that must be visible */
  background: #000;
  position: relative;
}
.qr-hint { font-size: 0.82rem; color: var(--muted); margin: 0 0 0.75rem; }
.qr-scanning-label {
  text-align: center; font-size: 0.78rem; font-weight: 600;
  color: #1d4ed8; margin: 0.5rem 0 0;
  display: flex; align-items: center; justify-content: center; gap: 0.35rem;
}
</style>
