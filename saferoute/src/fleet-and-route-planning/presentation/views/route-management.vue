<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n }   from 'vue-i18n';
import { useToast }  from 'primevue/usetoast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { RouteApi } from '../../infrastructure/route-api.js';
import { TripApi }  from '../../../trip-execution-and-monitoring/infrastructure/trip-api.js';
import { fetchRoadRoute } from '../../../shared/infrastructure/ors.js';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import { useSubscriptionStore } from '../../../subscription-and-plan-management/application/subscription.store.js';
import { StakeholderApi } from '../../../stakeholder-and-asset-management/infrastructure/stakeholder-api.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const { t }    = useI18n();
const toast    = useToast();
const api      = new RouteApi();
const tripApi  = new TripApi();
const stakeholderApi = new StakeholderApi();
const iamStore = useIamStore();
const subscriptionStore = useSubscriptionStore();

// Driver-scope: drivers only see their own routes; admins see all.
const isDriver = computed(() => iamStore.currentUser?.roleTier === 'DRIVER');
const userId   = computed(() => iamStore.currentUser?.id);
const currentDriverId = ref(null);

// ── Reference data — loaded per-org in onMounted ──────────────────────────────
const driverOptions  = ref([]);
const vehicleOptions = ref([]);
const studentOptions = ref([]);
const studentGroupOptions = ref([]);

function normalizeGroupChildIds(group) {
  return (group?.childIds || group?.childrenIds || []).map(id => String(id));
}

async function loadStudentGroups(orgId) {
  try {
    const groupsRes = await stakeholderApi.getGroupsByOrganization(orgId);
    studentGroupOptions.value = (groupsRes.data || [])
      .map(group => ({
        label: `${group.name} (${normalizeGroupChildIds(group).length})`,
        value: String(group.id),
        name: group.name,
        childIds: normalizeGroupChildIds(group),
        isFinalized: Boolean(group.isFinalized ?? group.isFinalizedValue),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Student groups failed to load:', error);
    studentGroupOptions.value = [];
  }
}

async function loadOrgOptions() {
  const orgId = iamStore.currentUser?.organizationId || null;

  try {
    const [driversRes, vehiclesRes, childrenRes] = await Promise.all([
      api.getDriversByOrganization(orgId),
      api.getVehiclesByOrganization(orgId),
      api.getChildrenByOrganization(orgId),
    ]);

    driverOptions.value = (driversRes.data || [])
        .map(p => ({ label: p.fullName || `${p.firstName} ${p.lastName}`, value: String(p.id), name: p.fullName || `${p.firstName} ${p.lastName}`, userId: p.userId, email: p.email }));
    currentDriverId.value = driverOptions.value.find(d => d.userId === userId.value || d.email === iamStore.currentUser?.email)?.value || null;

    vehicleOptions.value = (vehiclesRes.data || [])
        .map(v => ({ label: `${v.plate} - ${v.model}`, value: String(v.id), plate: v.plate, model: v.model, capacity: v.capacity, status: v.status }));

    studentOptions.value = (childrenRes.data || [])
        .map(c => ({ label: `${c.fullName || `${c.firstName} ${c.lastName}`} (${c.age ?? '-'})`, value: String(c.id), name: c.fullName || `${c.firstName} ${c.lastName}`, grade: c.age ?? '' }));
    await loadStudentGroups(orgId);
    return;
  } catch (error) {
    console.warn('Backend reference data failed, using locally stored data:', error);
  }

  // Fallback: locally stored data only (backend unreachable).
  const extraDrivers = JSON.parse(localStorage.getItem(`saferoute.mock.profiles.${orgId || 'default'}`) || '[]')
      .filter(p => p.role === 'driver');
  driverOptions.value = extraDrivers
      .map(p => ({ label: `${p.firstName} ${p.lastName}`, value: String(p.id), name: `${p.firstName} ${p.lastName}`, userId: p.userId, email: p.email }));
  currentDriverId.value = driverOptions.value.find(d => d.userId === userId.value || d.email === iamStore.currentUser?.email)?.value || null;

  const extraVehicles = JSON.parse(localStorage.getItem(`saferoute.mock.vehicles.${orgId || 'default'}`) || '[]');
  vehicleOptions.value = extraVehicles
      .map(v => ({ label: `${v.plate} — ${v.model}`, value: v.id, plate: v.plate }));

  const extraChildren = JSON.parse(localStorage.getItem(`saferoute.mock.children.${orgId || 'default'}`) || '[]');
  studentOptions.value = extraChildren
      .filter(c => c.status !== false)
      .map(c => ({ label: `${c.name} (${c.grade})`, value: c.id, name: c.name, grade: c.grade }));

  const extraGroups = JSON.parse(localStorage.getItem(`saferoute.mock.groups.${orgId || 'default'}`) || '[]');
  studentGroupOptions.value = extraGroups
      .map(group => ({
        label: `${group.name} (${normalizeGroupChildIds(group).length})`,
        value: String(group.id),
        name: group.name,
        childIds: normalizeGroupChildIds(group),
        isFinalized: Boolean(group.isFinalized ?? group.isFinalizedValue),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Route state ────────────────────────────────────────────────────────────────
const routes        = ref([]);
const selected      = ref(null);
const showDialog    = ref(false);
const isEdit        = ref(false);
const loading       = ref(false);
const savingTrip    = ref(false);
const previewOrsLoading = ref(false);
const formOrsLoading    = ref(false);

const TYPE_OPTIONS = [
  { label: 'Recojo (Ida — mañana)',  value: 'OUTBOUND' },
  { label: 'Retorno (Vuelta — tarde)', value: 'RETURN'   },
];

const emptyForm = () => ({
  name:               '',
  type:               'OUTBOUND',
  driverId:           null,
  driverName:         '',
  vehicleId:          null,
  vehiclePlate:       '',
  studentIds:         [],
  studentGroupId:     null,
  groupTargetStopIndex: 0,
  scheduledStartTime: '',
  status:             'ACTIVE',
  organizationId:     iamStore.currentUser?.organizationId || 'default',
  waypoints:          [],
  origin:             '',
  destination:        '',
  stops:              0,
});

const form = ref(emptyForm());

const groupStopOptions = computed(() =>
  form.value.waypoints.map((wp, index) => ({
    label: `${index + 1}. ${wp.name || `Parada ${index + 1}`}`,
    value: index,
  }))
);

function applyStudentGroupToStop() {
  const group = studentGroupOptions.value.find(item => item.value === form.value.studentGroupId);
  if (!group) return;
  if (!form.value.waypoints.length) {
    toast.add({ severity: 'warn', summary: 'Agrega una parada', detail: 'Crea al menos una parada para asignar el grupo.', life: 3500 });
    return;
  }
  const targetIndex = Number.isInteger(form.value.groupTargetStopIndex)
    ? form.value.groupTargetStopIndex
    : 0;
  const waypoint = form.value.waypoints[targetIndex] || form.value.waypoints[0];
  const current = new Set((waypoint.studentIds || []).map(String));
  group.childIds.forEach(id => current.add(String(id)));
  waypoint.studentIds = [...current];
  syncStudentIdsFromWaypoints();
  toast.add({
    severity: 'success',
    summary: 'Grupo asignado',
    detail: `${group.name}: ${group.childIds.length} alumno${group.childIds.length === 1 ? '' : 's'}`,
    life: 3000,
  });
}

function syncStudentIdsFromWaypoints() {
  const all = new Set();
  form.value.waypoints.forEach(w => (w.studentIds || []).forEach(id => all.add(String(id))));
  form.value.studentIds = [...all];
}

/** Sync form.studentIds = union of all waypoint studentIds */
watch(
  () => form.value.waypoints.map(w => w.studentIds),
  syncStudentIdsFromWaypoints,
  { deep: true }
);

/** Route is "complete" when all required fields are filled and has ≥ 2 stops */
const isRouteComplete = computed(() => {
  const f = form.value;
  return !!(
    f.type &&
    f.driverId &&
    f.vehicleId &&
    f.studentIds?.length > 0 &&
    f.waypoints?.length >= 2 &&
    f.scheduledStartTime
  );
});

const completionReasons = computed(() => {
  const f   = form.value;
  const missing = [];
  if (!f.type)                    missing.push('tipo de ruta');
  if (!f.driverId)                missing.push('conductor');
  if (!f.vehicleId)               missing.push('vehículo');
  if (!f.studentIds?.length)      missing.push('estudiantes');
  if (f.waypoints?.length < 2)    missing.push('mín. 2 paradas');
  if (!f.scheduledStartTime)      missing.push('horario de salida');
  return missing;
});

// Sync driver / vehicle names when their IDs change
watch(() => form.value.driverId, (id) => {
  const d = driverOptions.value.find(o => o.value === id);
  form.value.driverName = d?.name || '';
});
watch(() => form.value.vehicleId, (id) => {
  const v = vehicleOptions.value.find(o => o.value === id);
  form.value.vehiclePlate = v?.plate || '';
  form.value.vehicleModel = v?.model || '';
  form.value.vehicleCapacity = v?.capacity || 0;
});

/* ─────────────────────────────────────────────────────────────
   PREVIEW MAP  (main panel — shows selected fleet-and-route-planning)
───────────────────────────────────────────────────────────── */
const LIMA = [-12.046374, -77.042793];
let map = null;
let pvMarkers = [];

function stopDivIcon(n, isFirst, isLast) {
  const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#16305a';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2.5px solid #ffb74d;box-shadow:0 2px 8px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  });
}

function initPreviewMap() {
  if (map) return;
  map = L.map('route-map').setView(LIMA, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
}

function clearPvMarkers() {
  pvMarkers.forEach(l => map.removeLayer(l));
  pvMarkers = [];
}

async function showRouteOnMap(route) {
  if (!map) return;
  clearPvMarkers();
  const wps = route.waypoints || [];
  if (!wps.length) { map.setView(LIMA, 12); return; }

  const coords = wps.map(w => [w.lat, w.lng]);

  wps.forEach((wp, i) => {
    const m = L.marker(coords[i], { icon: stopDivIcon(i + 1, i === 0, i === wps.length - 1) })
      .addTo(map)
      .bindPopup(`<b>Parada ${i + 1}</b><br>${wp.name}`);
    pvMarkers.push(m);
  });

  if (coords.length === 1) { map.setView(coords[0], 14); return; }

  const placeholder = L.polyline(coords, { color: '#ffb74d', weight: 4, opacity: 0.4, dashArray: '6 6' }).addTo(map);
  pvMarkers.push(placeholder);
  map.fitBounds(placeholder.getBounds(), { padding: [40, 40] });

  previewOrsLoading.value = true;
  try {
    const { path } = await fetchRoadRoute(wps);
    map.removeLayer(placeholder);
    pvMarkers = pvMarkers.filter(l => l !== placeholder);
    const roadPoly = L.polyline(path, { color: '#ffb74d', weight: 4, opacity: 0.85 }).addTo(map);
    pvMarkers.push(roadPoly);
    map.fitBounds(roadPoly.getBounds(), { padding: [40, 40] });
  } catch (e) {
    console.warn('ORS preview failed, keeping straight line:', e);
    toast.add({ severity: 'error', summary: 'Ruta no transitable', detail: 'No es posible trazar vía terrestre entre estas paradas.', life: 4000 });
  } finally {
    previewOrsLoading.value = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   FORM MAP  (inside dialog — interactive stop placement)
───────────────────────────────────────────────────────────── */
let fMap      = null;
let fMarkers  = [];
let fPolyline = null;

async function rebuildFormMap() {
  if (!fMap) return;
  fMarkers.forEach(m => fMap.removeLayer(m));
  fMarkers = [];
  if (fPolyline) { fMap.removeLayer(fPolyline); fPolyline = null; }

  const wps = form.value.waypoints;
  if (!wps.length) return;

  const coords = wps.map(w => [w.lat, w.lng]);

  wps.forEach((wp, i) => {
    const marker = L.marker(coords[i], {
      icon: stopDivIcon(i + 1, i === 0, i === wps.length - 1),
      draggable: true,
    })
      .addTo(fMap)
      .bindTooltip(wp.name || `Parada ${i + 1}`, { permanent: true, direction: 'top', offset: [0, -14] });

    marker.on('dragend', (e) => {
      const latlng = e.target.getLatLng();
      wps[i].lat = parseFloat(latlng.lat.toFixed(6));
      wps[i].lng = parseFloat(latlng.lng.toFixed(6));
      syncOriginDest();
      rebuildFormMap();
    });
    fMarkers.push(marker);
  });

  if (coords.length < 2) return;

  fPolyline = L.polyline(coords, { color: '#ffb74d', weight: 4, opacity: 0.35, dashArray: '8 6' }).addTo(fMap);
  fMap.fitBounds(fPolyline.getBounds(), { padding: [60, 60] });

  formOrsLoading.value = true;
  try {
    const { path } = await fetchRoadRoute(wps);
    if (fPolyline) { fMap.removeLayer(fPolyline); }
    fPolyline = L.polyline(path, { color: '#ffb74d', weight: 4, opacity: 0.9 }).addTo(fMap);
    fMap.fitBounds(fPolyline.getBounds(), { padding: [60, 60] });
  } catch (e) {
    console.warn('ORS form fleet-and-route-planning failed, keeping straight line:', e);
    toast.add({ severity: 'error', summary: 'Ruta no transitable', detail: 'No es posible trazar vía terrestre entre estas paradas.', life: 4000 });
  } finally {
    formOrsLoading.value = false;
  }
}

function initFormMap() {
  if (fMap) {
    setTimeout(() => fMap.invalidateSize(), 50);
    if (form.value.waypoints.length) rebuildFormMap();
    return;
  }
  fMap = L.map('form-map', { zoomControl: true }).setView(LIMA, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(fMap);

  fMap.on('click', (e) => {
    const order = form.value.waypoints.length + 1;
    form.value.waypoints.push({
      order,
      name:       order === 1 ? 'Origen' : `Parada ${order}`,
      lat:        parseFloat(e.latlng.lat.toFixed(6)),
      lng:        parseFloat(e.latlng.lng.toFixed(6)),
      studentIds: [],
    });
    if (form.value.waypoints.length === 1) form.value.groupTargetStopIndex = 0;
    syncOriginDest();
    rebuildFormMap();
  });

  if (form.value.waypoints.length) rebuildFormMap();
  setTimeout(() => fMap && fMap.invalidateSize(), 50);
}

function destroyFormMap() {
  if (fMap) { fMap.remove(); fMap = null; fMarkers = []; fPolyline = null; }
}

/* ─────────────────────────────────────────────────────────────
   WAYPOINT HELPERS
───────────────────────────────────────────────────────────── */
function syncOriginDest() {
  const wps = form.value.waypoints;
  if (wps.length >= 1) form.value.origin      = wps[0].name;
  if (wps.length >= 2) form.value.destination = wps[wps.length - 1].name;
  else form.value.destination = '';
  form.value.stops = wps.length;
}

function removeWaypoint(i) {
  form.value.waypoints.splice(i, 1);
  form.value.waypoints.forEach((w, idx) => (w.order = idx + 1));
  if (form.value.groupTargetStopIndex >= form.value.waypoints.length) {
    form.value.groupTargetStopIndex = Math.max(form.value.waypoints.length - 1, 0);
  }
  syncOriginDest();
  rebuildFormMap();
}

// ── US-5.S2 TSP Nearest-Neighbor ──────────────────────────────────────────
function haversineM(a, b) {
  const R = 6371000, toR = d => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function optimizeWaypoints() {
  const wps = form.value.waypoints;
  if (wps.length < 3) {
    toast.add({ severity: 'info', summary: 'Se necesitan al menos 3 paradas', detail: 'Agrega más paradas para optimizar el orden.', life: 3000 });
    return;
  }
  const origin  = wps[0];
  const dest    = wps[wps.length - 1];
  const middle  = wps.slice(1, -1);

  // Nearest-neighbor: start from origin, always pick the closest unvisited stop
  const unvisited = [...middle];
  const ordered   = [];
  let current = origin;
  while (unvisited.length) {
    let bestIdx = 0, bestDist = Infinity;
    unvisited.forEach((wp, i) => {
      const d = haversineM(current, wp);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    ordered.push(unvisited.splice(bestIdx, 1)[0]);
    current = ordered[ordered.length - 1];
  }

  form.value.waypoints = [origin, ...ordered, dest].map((w, i) => ({ ...w, order: i + 1 }));
  syncOriginDest();
  rebuildFormMap();
  toast.add({ severity: 'success', summary: '¡Ruta optimizada!', detail: `${ordered.length} paradas reordenadas con el camino más corto.`, life: 3500 });
}

function onWaypointNameChange() { syncOriginDest(); rebuildFormMap(); }
function clearWaypoints()       { form.value.waypoints = []; form.value.groupTargetStopIndex = 0; syncOriginDest(); rebuildFormMap(); }

/* ─────────────────────────────────────────────────────────────
   DIALOG LIFECYCLE
───────────────────────────────────────────────────────────── */
watch(showDialog, (val) => {
  if (val) setTimeout(() => initFormMap(), 250);
  else     destroyFormMap();
});

/* ─────────────────────────────────────────────────────────────
   CRUD
───────────────────────────────────────────────────────── */
async function loadRoutes() {
  loading.value = true;
  const res = await api.getRoutes(iamStore.currentUser?.organizationId);
  const all  = (res.data || []).map(normalizeLoadedRoute);
  // DRIVER only sees their own routes; ADMIN/others see all.
  routes.value = isDriver.value
    ? all.filter(r => r.driverId === currentDriverId.value)
    : all;
  loading.value = false;
}

function normalizeLoadedRoute(route) {
  const driver = driverOptions.value.find(driver => driver.value === String(route.driverId));
  const vehicle = vehicleOptions.value.find(vehicle => vehicle.value === String(route.vehicleId));
  const studentIds = (route.studentIds || []).map(String);
  const waypoints = (route.waypoints || []).map((waypoint, index) => ({
    ...waypoint,
    studentIds: waypoint.studentIds?.length
      ? waypoint.studentIds.map(String)
      : index === 0
        ? studentIds
        : [],
  }));

  return {
    ...route,
    type: route.type || (route.scheduledStartTime >= '12:00' ? 'RETURN' : 'OUTBOUND'),
    driverId: route.driverId ? String(route.driverId) : null,
    driverName: route.driverName || driver?.name || '',
    vehicleId: route.vehicleId ? String(route.vehicleId) : null,
    vehiclePlate: route.vehiclePlate || vehicle?.plate || '',
    studentIds,
    waypoints,
  };
}

function selectRoute(route) {
  selected.value = route;
  showRouteOnMap(route);
}

function openCreate() {
  const plan = subscriptionStore.currentPlan;
  if (plan && routes.value.length >= plan.maxRoutes) {
    toast.add({ severity: 'error', summary: 'Límite alcanzado', detail: `Tu plan ${plan.name} permite un máximo de ${plan.maxRoutes} rutas.`, life: 5000 });
    return;
  }
  isEdit.value     = false;
  form.value       = emptyForm();
  // Pre-fill driver if user is a driver
  if (isDriver.value && currentDriverId.value) {
    const me = driverOptions.value.find(d => d.value === currentDriverId.value);
    if (me) {
      form.value.driverId   = me.value;
      form.value.driverName = me.name;
    }
  }
  showDialog.value = true;
}

function openEdit(route) {
  isEdit.value     = true;
  form.value       = {
    ...route,
    waypoints:  (route.waypoints  || []).map(w => ({ ...w, studentIds: w.studentIds || [] })),
    studentIds: [...(route.studentIds || [])],
    studentGroupId: null,
    groupTargetStopIndex: 0,
  };
  showDialog.value = true;
}

async function saveRoute() {
  if (!form.value.name) return;
  syncOriginDest();
  savingTrip.value = true;

  try {
    let savedRoute;
    const conflict = routes.value.some(r => r.driverId === form.value.driverId && r.scheduledStartTime === form.value.scheduledStartTime && r.id !== form.value.id);
    if (conflict) {
      toast.add({ severity: 'error', summary: 'Conductor ocupado', detail: 'El conductor ya tiene una ruta asignada en este mismo horario.', life: 4000 });
      return;
    }

    if (isEdit.value) {
      const res = await api.updateRoute(form.value);
      savedRoute = res.data || { ...form.value };
      const idx = routes.value.findIndex(r => r.id === form.value.id);
      if (idx !== -1) routes.value[idx] = savedRoute;
      if (selected.value?.id === form.value.id) {
        selected.value = savedRoute;
        showRouteOnMap(selected.value);
      }
      toast.add({ severity: 'success', summary: 'Ruta actualizada', detail: savedRoute.name, life: 3000 });
    } else {
      const res = await api.createRoute(form.value);
      savedRoute = res.data;
      routes.value.push(savedRoute);
      selectRoute(savedRoute);
      toast.add({ severity: 'success', summary: 'Ruta creada', detail: savedRoute.name, life: 3000 });
    }
    toast.add({ severity: 'info', summary: 'Alerta enviada', detail: `Se notificó al conductor de su asignación.`, life: 4000 });

    // ── Auto-generate trip-execution-and-monitoring if fleet-and-route-planning is complete ───────────────────────────────
    if (isRouteComplete.value) {
      const tripRes = await tripApi.autoCreateTripForRoute(savedRoute);
      if (tripRes.status === 201) {
        toast.add({
          severity: 'info',
          summary:  '¡Viaje programado!',
          detail:   `Se generó un viaje SCHEDULED para hoy a las ${savedRoute.scheduledStartTime}.`,
          life:     5000,
        });
      } else if (tripRes.reason === 'synced') {
        toast.add({
          severity: 'success',
          summary:  'Viaje actualizado',
          detail:   'El viaje existente quedo sincronizado con la ruta.',
          life:     3500,
        });
      } else if (tripRes.reason === 'duplicate') {
        toast.add({
          severity: 'warn',
          summary:  'Viaje ya existe',
          detail:   `Ya hay un viaje programado para esta ruta hoy a las ${savedRoute.scheduledStartTime}.`,
          life:     4000,
        });
      } else if (tripRes.reason === 'conflict') {
        toast.add({
          severity: 'error',
          summary:  'Conflicto de horario',
          detail:   `El conductor o vehículo ya tienen otro viaje activo en ese horario.`,
          life:     5000,
        });
      }
    }

    showDialog.value = false;
  } catch (error) {
    console.error('Route save failed:', error);
    toast.add({ severity: 'error', summary: 'No se pudo guardar la ruta', detail: 'Revisa los datos e intenta nuevamente.', life: 4500 });
  } finally {
    savingTrip.value = false;
  }
}

async function deleteRoute(id) {
  await api.deleteRoute(id);
  routes.value = routes.value.filter(r => r.id !== id);
  if (selected.value?.id === id) { selected.value = null; clearPvMarkers(); }
}

// ── Helpers for display ────────────────────────────────────────────────────────
const typeLabel = (t) => t === 'OUTBOUND' ? 'Recojo' : t === 'RETURN' ? 'Retorno' : t;
const typeClass = (t) => t === 'OUTBOUND' ? 'outbound' : 'return';

function routeCompleteStatus(route) {
  const ok = route.type && route.driverId && route.vehicleId &&
             route.studentIds?.length > 0 &&
             route.waypoints?.length >= 2 &&
             route.scheduledStartTime;
  return ok;
}

onMounted(async () => {
  await loadOrgOptions();
  await loadRoutes();
  await nextTick();
  initPreviewMap();
  if (routes.value.length) selectRoute(routes.value[0]);

  if (!subscriptionStore.plansLoaded) await subscriptionStore.loadPlans();
  if (iamStore.currentUser?.organizationId) {
    await subscriptionStore.loadSubscription(iamStore.currentUser.organizationId);
  }
});

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
  destroyFormMap();
});
</script>

<template>
  <div class="route-mgmt">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('fleet-and-route-planning.management.title') }}</h1>
        <p class="page-sub">{{ t('fleet-and-route-planning.management.subtitle') }}</p>
      </div>
      <pv-button :label="t('fleet-and-route-planning.management.new')" icon="pi pi-plus" @click="openCreate"/>
    </div>

    <!-- Main grid: list + preview map -->
    <div class="content-grid">

      <!-- Route list -->
      <div class="route-list-panel">
        <div v-if="loading" class="state-msg">
          <i class="pi pi-spin pi-spinner"/> Cargando…
        </div>

        <div
          v-for="route in routes" :key="route.id"
          class="route-card" :class="{ active: selected?.id === route.id }"
          @click="selectRoute(route)">

          <div class="route-card-header">
            <span class="route-name">{{ route.name }}</span>
            <span class="complete-dot" :title="routeCompleteStatus(route) ? 'Ruta completa' : 'Ruta incompleta'"
                  :style="{ background: routeCompleteStatus(route) ? '#22c55e' : '#f59e0b' }"/>
          </div>

          <div class="route-meta-row">
            <span class="type-chip" :class="typeClass(route.type)">
              <i :class="route.type === 'OUTBOUND' ? 'pi pi-arrow-right' : 'pi pi-arrow-left'"/>
              {{ typeLabel(route.type) }}
            </span>
            <span v-if="route.scheduledStartTime" class="meta-tag">
              <i class="pi pi-clock"/> {{ route.scheduledStartTime }}
            </span>
          </div>

          <div class="route-info-row">
            <i class="pi pi-map-marker info-icon"/>
            <span>{{ route.origin || '—' }} → {{ route.destination || '—' }}</span>
          </div>
          <div class="route-info-row">
            <i class="pi pi-user info-icon"/>
            <span>{{ route.driverName || route.driver || '—' }}</span>
          </div>
          <div class="route-info-row" v-if="route.vehiclePlate">
            <i class="pi pi-truck info-icon"/>
            <span>{{ route.vehiclePlate }}</span>
          </div>
          <div class="route-info-row" v-if="route.studentIds?.length">
            <i class="pi pi-users info-icon"/>
            <span>{{ route.studentIds.length }} estudiante{{ route.studentIds.length !== 1 ? 's' : '' }}</span>
          </div>

          <div class="route-card-actions">
            <pv-button icon="pi pi-pencil" size="small" text @click.stop="openEdit(route)"/>
            <pv-button icon="pi pi-trash"  size="small" text severity="danger" @click.stop="deleteRoute(route.id)"/>
          </div>
        </div>

        <div v-if="!loading && routes.length === 0" class="state-msg">
          {{ t('fleet-and-route-planning.management.empty') }}
        </div>
      </div>

      <!-- Preview map -->
      <div class="map-panel">
        <div id="route-map" class="leaflet-map"/>
        <div v-if="selected" class="map-info-bar">
          <i class="pi pi-info-circle" style="color:var(--amber)"/>
          <span>{{ selected.name }}</span>
          <span class="type-chip" :class="typeClass(selected.type)" style="margin-left:.5rem">{{ typeLabel(selected.type) }}</span>
          <span v-if="previewOrsLoading" class="ors-loading" style="margin-left:auto">
            <i class="pi pi-spin pi-spinner"/> Trazando ruta…
          </span>
        </div>
        <div v-else class="map-info-bar muted-hint">
          <i class="pi pi-hand-pointer"/> Selecciona una ruta para ver su recorrido
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════
         CREATE / EDIT DIALOG
    ═════════════════════════════════════════════════════════ -->
    <pv-dialog
      v-model:visible="showDialog"
      :header="isEdit ? t('fleet-and-route-planning.management.edit') : t('fleet-and-route-planning.management.new')"
      modal :closable="true" :draggable="false"
      class="route-dialog"
      style="width:96vw;max-width:1600px"
      :pt="{ content: { style: 'padding:0;overflow:hidden;' } }">

      <div class="dialog-body">

        <!-- LEFT: form -->
        <div class="dialog-form-col">
          <div class="form-scroll">

            <!-- ── Información básica ── -->
            <p class="form-section-title"><i class="pi pi-info-circle"/> Información</p>

            <div class="field">
              <label>Nombre de la ruta <span class="req">*</span></label>
              <pv-input-text v-model="form.name" class="w-full" placeholder="Ej: Ruta Norte — Comas"/>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Tipo de ruta</label>
                <pv-select
                  v-model="form.type"
                  :options="TYPE_OPTIONS"
                  option-label="label" option-value="value"
                  class="w-full"/>
              </div>
              <div class="field">
                <label>Hora de salida <span class="req">*</span></label>
                <pv-input-text
                  v-model="form.scheduledStartTime"
                  type="time"
                  class="w-full"
                  placeholder="06:00"/>
              </div>
            </div>

            <!-- ── Asignación ── -->
            <p class="form-section-title" style="margin-top:.5rem"><i class="pi pi-users"/> Asignación</p>

            <div class="field-row">
              <div class="field">
                <label>Conductor <span class="req">*</span></label>
                <pv-select
                  v-model="form.driverId"
                  :options="driverOptions"
                  option-label="label" option-value="value"
                  placeholder="Seleccionar conductor"
                  :disabled="isDriver"
                  class="w-full"/>
              </div>
              <div class="field">
                <label>Vehículo <span class="req">*</span></label>
                <pv-select
                  v-model="form.vehicleId"
                  :options="vehicleOptions"
                  option-label="label" option-value="value"
                  placeholder="Seleccionar vehículo"
                  class="w-full"/>
              </div>
            </div>

            <div class="group-assignment">
              <div class="group-assignment-head">
                <span><i class="pi pi-sitemap"/> Asignar grupo</span>
                <small>{{ form.studentIds.length }} alumno{{ form.studentIds.length === 1 ? '' : 's' }} en ruta</small>
              </div>
              <div class="group-assignment-row">
                <pv-select
                  v-model="form.studentGroupId"
                  :options="studentGroupOptions"
                  option-label="label" option-value="value"
                  placeholder="Seleccionar grupo"
                  class="group-select"/>
                <pv-select
                  v-model="form.groupTargetStopIndex"
                  :options="groupStopOptions"
                  option-label="label" option-value="value"
                  placeholder="Parada"
                  :disabled="!form.waypoints.length"
                  class="stop-select"/>
                <pv-button
                  label="Aplicar"
                  icon="pi pi-user-plus"
                  outlined
                  :disabled="!form.studentGroupId || !form.waypoints.length"
                  @click="applyStudentGroupToStop"/>
              </div>
            </div>

            <!-- ── Paradas (mapa interactivo) ── -->
            <div class="wps-header">
              <p class="form-section-title" style="margin:0">
                <i class="pi pi-map-marker"/> Paradas
                <span class="wps-count">{{ form.waypoints.length }}</span>
              </p>
              <pv-button
                v-if="form.waypoints.length"
                label="Limpiar"
                icon="pi pi-trash"
                size="small" text severity="danger"
                @click="clearWaypoints"/>
            </div>

            <div class="map-hint">
              <i class="pi pi-hand-pointer hint-icon"/>
              <span>Haz clic en el mapa para agregar paradas. Arrastra los marcadores para reposicionarlos.</span>
              <pv-button
                v-if="form.waypoints.length >= 3"
                label="Optimizar orden"
                icon="pi pi-bolt"
                size="small"
                severity="secondary"
                class="ml-auto"
                v-tooltip.top="'Reordena las paradas intermedias para la ruta más corta (TSP)'"
                @click="optimizeWaypoints"/>
            </div>

            <div v-if="form.waypoints.length" class="wp-list">
              <div v-for="(wp, i) in form.waypoints" :key="i" class="wp-item">
                <div class="wp-num"
                  :style="{ background: i === 0 ? '#16a34a' : i === form.waypoints.length - 1 ? '#dc2626' : '#16305a' }">
                  {{ i + 1 }}
                </div>
                <div class="wp-content">
                  <pv-input-text
                    v-model="wp.name"
                    class="w-full wp-name-input"
                    :placeholder="`Parada ${i + 1}`"
                    @input="onWaypointNameChange"/>
                  <span class="wp-coords">{{ wp.lat }}, {{ wp.lng }}</span>
                  <!-- Per-stop student assignment -->
                  <div class="wp-students">
                    <span class="wp-students-label">
                      <i class="pi pi-users"/> Alumnos en esta parada:
                    </span>
                    <div class="wp-student-chips">
                      <label
                        v-for="s in studentOptions" :key="s.value"
                        class="wp-student-chip"
                        :class="{ selected: (wp.studentIds || []).includes(s.value) }">
                        <input type="checkbox" :value="s.value" v-model="wp.studentIds" style="display:none"/>
                        {{ s.name }}
                      </label>
                    </div>
                  </div>
                </div>
                <pv-button icon="pi pi-times" text rounded severity="danger" size="small" @click="removeWaypoint(i)"/>
              </div>
            </div>
            <div v-else class="wp-empty">
              <i class="pi pi-map" style="font-size:1.8rem;color:#d1d5db"/>
              <p>Sin paradas.<br>Haz clic en el mapa para comenzar.</p>
            </div>

            <!-- Origin/Destination summary -->
            <div v-if="form.waypoints.length >= 2" class="od-summary">
              <div class="od-item">
                <span class="od-dot origin-dot"/>
                <div><span class="od-label">Origen</span><span class="od-value">{{ form.origin }}</span></div>
              </div>
              <div class="od-line"/>
              <div class="od-item">
                <span class="od-dot dest-dot"/>
                <div><span class="od-label">Destino</span><span class="od-value">{{ form.destination }}</span></div>
              </div>
            </div>

            <!-- ── Completeness banner ── -->
            <div class="completeness-banner" :class="isRouteComplete ? 'complete' : 'incomplete'">
              <i :class="isRouteComplete ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"/>
              <div>
                <strong>{{ isRouteComplete ? 'Ruta completa' : 'Ruta incompleta' }}</strong>
                <p v-if="!isRouteComplete" style="margin:0;font-size:0.73rem">
                  Faltan: {{ completionReasons.join(', ') }}
                </p>
                <p v-else style="margin:0;font-size:0.73rem">
                  Al guardar se generará un viaje programado para hoy.
                </p>
              </div>
            </div>

          </div><!-- /form-scroll -->

          <!-- Footer -->
          <div class="dialog-footer">
            <pv-button label="Cancelar" text @click="showDialog = false"/>
            <pv-button
              :label="isEdit ? 'Guardar cambios' : 'Crear Ruta'"
              icon="pi pi-check"
              :loading="savingTrip"
              :disabled="!form.name"
              @click="saveRoute"/>
          </div>
        </div>

        <!-- RIGHT: map -->
        <div class="dialog-map-col">
          <div id="form-map" class="form-leaflet-map"/>
          <div class="form-map-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#16a34a"/> Origen</span>
            <span class="legend-item"><span class="legend-dot" style="background:#16305a"/> Parada</span>
            <span class="legend-item"><span class="legend-dot" style="background:#dc2626"/> Destino</span>
            <span v-if="formOrsLoading" class="ors-loading">
              <i class="pi pi-spin pi-spinner"/> Calculando ruta real…
            </span>
          </div>
        </div>

      </div>
    </pv-dialog>

  </div>
</template>

<style scoped>
.route-mgmt { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 1.5rem;
}
.page-title { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-family: var(--sans); font-size: 0.875rem; color: var(--muted); margin: 0; }

/* Main grid */
.content-grid {
  display: grid; grid-template-columns: 340px 1fr;
  gap: 1.25rem; height: calc(100vh - 160px);
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    height: auto;
    gap: 1rem;
  }
  .route-list-panel { max-height: 40vh; }
  .map-panel        { height: 320px; }
}

/* Route list */
.route-list-panel { display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; padding-right: 0.25rem; }
.state-msg { color: var(--muted); text-align: center; padding: 2rem; font-size: 0.875rem; }

.route-card {
  background: #fff; border: 2px solid #e5e7eb; border-radius: 12px;
  padding: 1rem; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.route-card:hover  { border-color: var(--amber); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.route-card.active { border-color: var(--amber); background: #fffbf2; }

.route-card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.45rem;
}
.route-name { font-family: var(--heading); font-weight: 700; font-size: 0.9rem; color: var(--dark); }
.complete-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
}

.route-meta-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.type-chip {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
}
.type-chip.outbound { background: #dbeafe; color: #1d4ed8; }
.type-chip.return   { background: #fce7f3; color: #be185d; }
.meta-tag {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.7rem; font-weight: 600; color: var(--muted);
}

.route-info-row {
  display: flex; align-items: flex-start; gap: 0.45rem;
  font-size: 0.8rem; color: var(--muted); margin-bottom: 0.25rem;
}
.info-icon { color: var(--amber); font-size: 0.78rem; margin-top: 2px; flex-shrink: 0; }
.route-card-actions { display: flex; gap: 0.2rem; justify-content: flex-end; margin-top: 0.4rem; }

/* Preview map */
.map-panel { display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
.leaflet-map  { flex: 1; min-height: 400px; }
.map-info-bar {
  display: flex; align-items: center; gap: 0.5rem;
  background: #fff; padding: 0.65rem 1rem;
  font-size: 0.875rem; color: var(--dark);
  border-top: 1px solid #e5e7eb;
}
.muted-hint { color: var(--muted); font-size: 0.82rem; }

/* ── Dialog ─────────────────────────────────────────────────── */
.dialog-body {
  display: grid; grid-template-columns: minmax(480px, 560px) 1fr;
  height: min(82vh, calc(100vh - 7rem));
  max-height: calc(100vh - 7rem);
  overflow: hidden;
}

.dialog-form-col {
  display: flex; flex-direction: column;
  border-right: 1px solid #e5e7eb;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.form-scroll {
  flex: 1; overflow-y: auto;
  padding: 1.5rem 1.75rem 0.75rem;
  display: flex; flex-direction: column; gap: 1rem;
  min-height: 0;
}

@media (max-width: 900px) {
  .dialog-body {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
    height: min(92vh, calc(100vh - 5rem));
    max-height: calc(100vh - 5rem);
  }
  .dialog-form-col {
    height: 100%; min-height: 0; border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
  .dialog-map-col { display: none; }
}

.form-section-title {
  font-family: var(--heading); font-size: 0.8rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted);
  display: flex; align-items: center; gap: 0.4rem; margin: 0.25rem 0 0;
}

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }
.req { color: #ef4444; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.group-assignment {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  padding: 0.75rem;
}

.group-assignment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.group-assignment-head span {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--dark);
  font-size: 0.82rem;
  font-weight: 800;
}

.group-assignment-head small {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.group-assignment-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px auto;
  gap: 0.5rem;
  align-items: center;
}

.group-select,
.stop-select {
  width: 100%;
}

@media (max-width: 640px) {
  .group-assignment-head,
  .group-assignment-row {
    display: flex;
    align-items: stretch;
    flex-direction: column;
  }
}

/* Students */
.students-section { display: flex; flex-direction: column; gap: 0.4rem; }
.students-header  { display: flex; align-items: center; justify-content: space-between; }
.students-count   {
  font-size: 0.72rem; font-weight: 700;
  background: var(--amber); color: var(--dark);
  padding: 2px 8px; border-radius: 20px;
}
.students-list {
  border: 1px solid #e5e7eb; border-radius: 8px;
  max-height: 140px; overflow-y: auto;
}
.student-row {
  display: flex; align-items: center; gap: 0.55rem;
  padding: 0.45rem 0.7rem; cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
}
.student-row:last-child { border-bottom: none; }
.student-row:hover      { background: #f9fafb; }
.student-row.selected   { background: #fffbf2; }
.student-checkbox { accent-color: var(--amber); width: 15px; height: 15px; cursor: pointer; flex-shrink: 0; }
.student-name  { font-size: 0.82rem; font-weight: 600; color: var(--dark); flex: 1; }
.student-grade { font-size: 0.72rem; color: var(--muted); }

/* Waypoints */
.wps-header { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
.wps-count  {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--amber); color: var(--dark);
  font-size: 0.7rem; font-weight: 800; margin-left: 0.4rem;
}
.map-hint {
  display: flex; align-items: flex-start; gap: 0.5rem;
  background: #fffbf2; border: 1px solid #fed7aa;
  border-radius: 8px; padding: 0.6rem 0.75rem;
  font-size: 0.78rem; color: #92400e; line-height: 1.4;
}
.hint-icon { color: var(--amber); font-size: 0.9rem; margin-top: 1px; flex-shrink: 0; }

.wp-list { display: flex; flex-direction: column; gap: 0.45rem; }
.wp-item {
  display: flex; align-items: flex-start; gap: 0.6rem;
  background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 0.5rem 0.6rem;
}
.wp-num {
  width: 24px; height: 24px; border-radius: 50%;
  color: #fff; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border: 2px solid #ffb74d;
}
.wp-content   { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.wp-name-input { font-size: 0.82rem !important; padding: 0.3rem 0.5rem !important; height: auto !important; }
.wp-coords    { font-size: 0.68rem; color: var(--muted); font-family: monospace; }

.wp-students { margin-top: 0.25rem; }
.wp-students-label { font-size: 0.7rem; color: var(--muted); display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.25rem; }
.wp-student-chips  { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.wp-student-chip {
  font-size: 0.7rem; padding: 2px 8px; border-radius: 20px;
  border: 1px solid #e5e7eb; background: #f9fafb; color: var(--muted);
  cursor: pointer; transition: all 0.12s; user-select: none;
}
.wp-student-chip:hover   { border-color: var(--amber); color: var(--dark); }
.wp-student-chip.selected { background: var(--amber); border-color: var(--amber); color: var(--dark); font-weight: 700; }

.wp-empty {
  text-align: center; padding: 1.5rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
}
.wp-empty p { font-size: 0.82rem; color: var(--muted); line-height: 1.5; margin: 0; }

/* Origin/Destination */
.od-summary {
  background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 10px; padding: 0.75rem 0.9rem;
  display: flex; flex-direction: column; gap: 0;
}
.od-item  { display: flex; align-items: center; gap: 0.6rem; padding: 0.25rem 0; }
.od-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.origin-dot { background: #16a34a; }
.dest-dot   { background: #dc2626; }
.od-label { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--muted); display: block; }
.od-value { font-size: 0.82rem; font-weight: 600; color: var(--dark); }
.od-line  { width: 1px; height: 12px; background: #d1d5db; margin-left: 4px; }

/* Completeness banner */
.completeness-banner {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.75rem 0.9rem; border-radius: 10px;
  font-size: 0.82rem; font-weight: 600;
}
.completeness-banner.complete   { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.completeness-banner.incomplete { background: #fffbf2; color: #92400e; border: 1px solid #fed7aa; }
.completeness-banner i { font-size: 1rem; margin-top: 1px; flex-shrink: 0; }

/* Footer */
.dialog-footer {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid #e5e7eb; background: #fff;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 2;
}

/* Map column */
.dialog-map-col {
  display: flex; flex-direction: column;
  height: 100%;
  min-height: 0;
}
.form-leaflet-map {
  flex: 1;
  min-height: 0;
}
.form-map-legend {
  display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
  padding: 0.55rem 1rem;
  background: rgba(255,255,255,0.95);
  border-top: 1px solid #e5e7eb;
  font-size: 0.75rem; color: var(--dark);
}
.legend-item { display: flex; align-items: center; gap: 0.35rem; font-weight: 600; }
.legend-dot  { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #ffb74d; }
.ors-loading { display: flex; align-items: center; gap: 0.3rem; color: #92400e; font-size: 0.72rem; font-weight: 600; margin-left: auto; }
</style>
