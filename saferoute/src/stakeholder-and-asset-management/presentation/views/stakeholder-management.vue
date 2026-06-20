<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import { StakeholderApi } from '../../infrastructure/stakeholder-api.js';
import { RouteApi } from '../../../fleet-and-route-planning/infrastructure/route-api.js';
import seedData from '../../../server/db.json';

const route    = useRoute();
const confirm  = useConfirm();
const toast    = useToast();
const iamStore = useIamStore();
const stakeholderApi = new StakeholderApi();
const routeApi = new RouteApi();

/* ── Org-scoped localStorage helpers ────────────────────────── */
const orgId = iamStore.currentUser?.organizationId;

// Seed data comes from db.json, filtered to the current org
const SEED_PARENTS  = seedData.parents.filter(p => p.organizationId === orgId);
const SEED_CHILDREN = seedData.children.filter(c => c.organizationId === orgId);

const PARENTS_KEY  = `saferoute.mock.parents.${orgId  || 'default'}`;
const CHILDREN_KEY = `saferoute.mock.children.${orgId || 'default'}`;

function loadParents()  {
  const stored = localStorage.getItem(PARENTS_KEY);
  return stored ? JSON.parse(stored) : [...SEED_PARENTS];
}
function loadChildren() {
  const stored = localStorage.getItem(CHILDREN_KEY);
  return stored ? JSON.parse(stored) : [...SEED_CHILDREN];
}
function saveParents(list)  { localStorage.setItem(PARENTS_KEY,  JSON.stringify(list)); }
function saveChildren(list) { localStorage.setItem(CHILDREN_KEY, JSON.stringify(list)); }

/* ── top-level section ───────────────────────────────────── */
const section = ref('users'); // 'users' | 'logistics'

/* ── USERS section ───────────────────────────────────────── */
const userTab      = ref('parents');
const expandedRows = ref({});

const parents  = ref(loadParents());
const children = ref(loadChildren());

const boardingLabel    = { ABORDADO: 'Abordado', EN_ESPERA: 'En Espera', AUSENTE: 'Ausente' };
const boardingSeverity = { ABORDADO: 'success', EN_ESPERA: 'warn', AUSENTE: 'danger' };

const getChildrenByParent = (parentId) => children.value.filter(c => c.parentId === parentId);

/* ── Parent CRUD ─────────────────────────────────────────── */
const emptyParentForm = () => ({ id: null, name: '', email: '', phone: '', status: true, password: '', formChildren: [] });
const parentForm   = ref(emptyParentForm());
const parentDrawer = ref(false);
const parentDrawerTitle = ref('Nuevo Padre / Madre');

const openAddParent = () => {
  parentForm.value = emptyParentForm();
  parentDrawerTitle.value = 'Nuevo Padre / Madre';
  parentDrawer.value = true;
};

const openEditParent = (p) => {
  parentForm.value = {
    id: p.id, name: p.name, email: p.email, phone: p.phone,
    status: p.status, password: p.password || '',
    formChildren: getChildrenByParent(p.id).map(c => ({ ...c })),
  };
  parentDrawerTitle.value = 'Editar Padre / Madre';
  parentDrawer.value = true;
};

const addFormChild    = () => parentForm.value.formChildren.push({ id: null, name: '', grade: '', status: true });
const removeFormChild = (i)  => parentForm.value.formChildren.splice(i, 1);

watch(() => parentForm.value.email, (email) => {
  if (!parentForm.value.id && email) {
    parentForm.value.password = email.split('@')[0];
  }
});

const saveParent = () => {
  if (!parentForm.value.name || !parentForm.value.email) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete los campos obligatorios.', life: 3000 });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(parentForm.value.email)) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Formato no soportado en el correo electrónico.', life: 3000 });
    return;
  }
  const isDuplicate = parents.value.some(p => p.email === parentForm.value.email && p.id !== parentForm.value.id);
  if (isDuplicate) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Usuario ya existe con este correo.', life: 3000 });
    return;
  }
  if (parentForm.value.id) {
    // Edit
    const idx = parents.value.findIndex(p => p.id === parentForm.value.id);
    if (idx !== -1) parents.value[idx] = { ...parents.value[idx], ...parentForm.value };
    // Sync children: remove old ones for this parent, add updated list
    const kept = children.value.filter(c => c.parentId !== parentForm.value.id);
    const updated = parentForm.value.formChildren.map((c, i) => ({
      id: c.id || `c-${Date.now() + i}`,
      name: c.name, grade: c.grade, parentId: parentForm.value.id,
      boardingStatus: c.boardingStatus || 'EN_ESPERA', status: c.status,
    }));
    children.value = [...kept, ...updated];
    saveParents(parents.value);
    saveChildren(children.value);
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Padre actualizado correctamente.', life: 3000 });
  } else {
    // Add
    const newId = `p-${Date.now()}`;
    parents.value.push({ id: newId, name: parentForm.value.name, email: parentForm.value.email, phone: parentForm.value.phone, status: parentForm.value.status, password: parentForm.value.password });
    parentForm.value.formChildren.forEach((c, i) =>
      children.value.push({ id: `c-${Date.now() + i}`, name: c.name, grade: c.grade, parentId: newId, boardingStatus: 'EN_ESPERA', status: c.status, hasPhoto: c.hasPhoto })
    );
    saveParents(parents.value);
    saveChildren(children.value);
    toast.add({ severity: 'success', summary: 'Registrado', detail: 'Padre registrado correctamente.', life: 3000 });
    toast.add({ severity: 'info', summary: 'Invitación enviada', detail: `Se ha enviado un enlace de acceso al correo ${parentForm.value.email}`, life: 5000 });
  }
  parentDrawer.value = false;
};

const deleteParent = (p) => {
  confirm.require({
    message: `¿Eliminar a ${p.name} y todos sus hijos?`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    accept: () => {
      parents.value  = parents.value.filter(x => x.id !== p.id);
      children.value = children.value.filter(c => c.parentId !== p.id);
      saveParents(parents.value);
      saveChildren(children.value);
      toast.add({ severity: 'warn', summary: 'Eliminado', detail: `${p.name} eliminado.`, life: 3000 });
    },
  });
};

/* ── Child CRUD (standalone) ─────────────────────────────── */
const emptyChildForm = () => ({ id: null, name: '', grade: '', parentId: null, boardingStatus: 'EN_ESPERA', status: true, hasPhoto: false });
const childForm   = ref(emptyChildForm());
const childDialog = ref(false);
const childDialogTitle = ref('Nuevo Alumno');

const carneDialog = ref(false);
const carneData = ref({});
const showCarne = (c) => { carneData.value = c; carneDialog.value = true; };
const uploadPhotoMock = () => {
  toast.add({ severity: 'info', summary: 'Subiendo foto...', life: 1000 });
  setTimeout(() => {
    childForm.value.hasPhoto = true;
    toast.add({ severity: 'success', summary: 'Foto guardada', life: 2000 });
  }, 1000);
};

const openAddChild = () => {
  childForm.value = emptyChildForm();
  childDialogTitle.value = 'Nuevo Alumno';
  childDialog.value = true;
};

const openEditChild = (c) => {
  childForm.value = { ...c };
  childDialogTitle.value = 'Editar Alumno';
  childDialog.value = true;
};

const saveChild = () => {
  if (!childForm.value.name) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El nombre del alumno es obligatorio.', life: 3000 });
    return;
  }
  const isDuplicate = children.value.some(c => c.name === childForm.value.name && c.id !== childForm.value.id);
  if (isDuplicate) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El alumno ya existe.', life: 3000 });
    return;
  }
  if (childForm.value.id) {
    const idx = children.value.findIndex(c => c.id === childForm.value.id);
    if (idx !== -1) children.value[idx] = { ...childForm.value };
    toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Alumno actualizado.', life: 3000 });
  } else {
    children.value.push({ ...childForm.value, id: `c-${Date.now()}` });
    toast.add({ severity: 'success', summary: 'Registrado', detail: 'Alumno registrado.', life: 3000 });
  }
  saveChildren(children.value);
  childDialog.value = false;
};

const deleteChild = (c) => {
  confirm.require({
    message: `¿Eliminar al alumno ${c.name}?`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    accept: () => {
      children.value = children.value.filter(x => x.id !== c.id);
      saveChildren(children.value);
      toast.add({ severity: 'warn', summary: 'Eliminado', detail: `${c.name} eliminado.`, life: 3000 });
    },
  });
};

/* ── Header button action ────────────────────────────────── */
const onAddClick = () => {
  if (section.value === 'users') {
    if (userTab.value === 'children') openAddChild();
    else openAddParent();
  } else {
    openLogDrawer();
  }
};

function fullNameOf(item) {
  return item?.fullName || item?.name || `${item?.firstName || ''} ${item?.lastName || ''}`.trim();
}

function normalizeParent(parent) {
  return {
    ...parent,
    name: fullNameOf(parent),
    phone: parent.phone || parent.phoneNumber || '',
    status: parent.status ?? true,
  };
}

function normalizeChild(child, parent) {
  return {
    ...child,
    name: fullNameOf(child),
    grade: child.grade || child.age || '',
    parentId: child.parentId || parent?.id || null,
    boardingStatus: child.boardingStatus || 'EN_ESPERA',
    status: child.status ?? true,
  };
}

function normalizeDriver(driver) {
  return {
    ...driver,
    name: fullNameOf(driver),
    license: driver.license || driver.licenseNumber || '',
    vehicle_id: driver.vehicle_id || driver.vehicleId || null,
    status: driver.status === undefined ? true : driver.status === true || driver.status === 'ACTIVE',
  };
}

function normalizeVehicle(vehicle) {
  return {
    ...vehicle,
    status: vehicle.status === undefined ? true : vehicle.status === true || vehicle.status === 'ACTIVE',
  };
}

async function loadBackendData() {
  if (!orgId) return;
  try {
    const [parentsRes, driversRes, fleetRes] = await Promise.all([
      stakeholderApi.getParentsByOrganization(orgId),
      stakeholderApi.getDriversByOrganization(orgId),
      routeApi.getVehiclesByOrganization(orgId),
    ]);
    const backendParents = parentsRes.data || [];
    parents.value = backendParents.map(normalizeParent);
    children.value = backendParents.flatMap(parent => (parent.children || []).map(child => normalizeChild(child, parent)));
    drivers.value = (driversRes.data || []).map(normalizeDriver);
    fleet.value = (fleetRes.data || []).map(normalizeVehicle);
  } catch (error) {
    console.warn('Stakeholder backend data could not be loaded:', error);
  }
}

/* ── Deep-link via query param ───────────────────────────── */
onMounted(async () => {
  await loadBackendData();
  const tab = String(route.query.tab || '').toLowerCase();
  if (tab === 'parents'  || tab === 'children') { section.value = 'users';     userTab.value = tab; }
  if (tab === 'drivers'  || tab === 'fleet')    { section.value = 'logistics'; logTab.value  = tab; }
});

/* ── LOGISTICS section ───────────────────────────────────── */
const logTab = ref('drivers');

const DRIVERS_KEY = `saferoute.drivers.${orgId || 'default'}`;
const FLEET_KEY   = `saferoute.fleet.${orgId || 'default'}`;

function loadDrivers() {
  const stored = localStorage.getItem(DRIVERS_KEY);
  if (stored !== null) return JSON.parse(stored);
  if (!orgId) return [];
  return seedData.profiles
    .filter(p => p.organizationId === orgId && p.role === 'driver')
    .map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, license: p.license || '', vehicle_id: p.vehicleId || null, status: p.status === 'ACTIVE' }));
}
function loadFleet() {
  const stored = localStorage.getItem(FLEET_KEY);
  if (stored !== null) return JSON.parse(stored);
  if (!orgId) return [];
  return seedData.vehicles
    .filter(v => v.organizationId === orgId)
    .map(v => ({ id: v.id, plate: v.plate, model: v.model, capacity: v.capacity, status: v.status === 'ACTIVE' }));
}
function saveDrivers(list) { localStorage.setItem(DRIVERS_KEY, JSON.stringify(list)); }
function saveFleet(list)   { localStorage.setItem(FLEET_KEY,   JSON.stringify(list)); }

const drivers = ref(loadDrivers());
const fleet   = ref(loadFleet());

const emptyLogForm = () => ({ id: null, nameOrPlate: '', licenseOrModel: '', vehicle_id: null, capacity: 0, status: true, licenseVerified: false });
const logForm    = ref(emptyLogForm());
const logDrawer  = ref(false);
const logDrawerTitle = ref('Nuevo Conductor');

const uploadLicenseMock = () => {
  toast.add({ severity: 'info', summary: 'Subiendo archivo...', detail: 'Validando documento con MTC', life: 2000 });
  setTimeout(() => {
    logForm.value.licenseVerified = true;
    toast.add({ severity: 'success', summary: 'Verificado', detail: 'Licencia validada exitosamente.', life: 3000 });
  }, 2000);
};

const openLogDrawer = () => {
  logForm.value = emptyLogForm();
  logDrawerTitle.value = logTab.value === 'drivers' ? 'Nuevo Conductor' : 'Nuevo Vehículo';
  logDrawer.value = true;
};

const openEditLog = (item) => {
  if (logTab.value === 'drivers') {
    logForm.value = { id: item.id, nameOrPlate: item.name, licenseOrModel: item.license, vehicle_id: item.vehicle_id, capacity: 0, status: item.status };
    logDrawerTitle.value = 'Editar Conductor';
  } else {
    logForm.value = { id: item.id, nameOrPlate: item.plate, licenseOrModel: item.model, vehicle_id: null, capacity: item.capacity, status: item.status };
    logDrawerTitle.value = 'Editar Vehículo';
  }
  logDrawer.value = true;
};

const saveLog = () => {
  if (!logForm.value.nameOrPlate) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Complete los campos obligatorios.', life: 3000 });
    return;
  }
  if (logTab.value === 'drivers') {
    const isDuplicate = drivers.value.some(d => (d.license === logForm.value.licenseOrModel || d.name === logForm.value.nameOrPlate) && d.id !== logForm.value.id);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Usuario ya existe (nombre o licencia duplicada).', life: 3000 });
      return;
    }
    if (logForm.value.id) {
      const idx = drivers.value.findIndex(d => d.id === logForm.value.id);
      if (idx !== -1) drivers.value[idx] = { id: logForm.value.id, name: logForm.value.nameOrPlate, license: logForm.value.licenseOrModel, vehicle_id: logForm.value.vehicle_id, status: logForm.value.status };
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Conductor actualizado.', life: 3000 });
    } else {
      drivers.value.push({ id: Date.now(), name: logForm.value.nameOrPlate, license: logForm.value.licenseOrModel, vehicle_id: logForm.value.vehicle_id, status: logForm.value.status });
      toast.add({ severity: 'success', summary: 'Registrado', detail: 'Conductor registrado.', life: 3000 });
    }
    saveDrivers(drivers.value);
  } else {
    const isDuplicate = fleet.value.some(f => f.plate === logForm.value.nameOrPlate && f.id !== logForm.value.id);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Vehículo ya existe con esta placa.', life: 3000 });
      return;
    }
    if (logForm.value.id) {
      const idx = fleet.value.findIndex(f => f.id === logForm.value.id);
      if (idx !== -1) fleet.value[idx] = { id: logForm.value.id, plate: logForm.value.nameOrPlate, model: logForm.value.licenseOrModel, capacity: logForm.value.capacity, status: logForm.value.status };
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Vehículo actualizado.', life: 3000 });
    } else {
      fleet.value.push({ id: Date.now(), plate: logForm.value.nameOrPlate, model: logForm.value.licenseOrModel, capacity: logForm.value.capacity, status: logForm.value.status });
      toast.add({ severity: 'success', summary: 'Registrado', detail: 'Vehículo registrado.', life: 3000 });
    }
    saveFleet(fleet.value);
  }
  logDrawer.value = false;
};

const deleteLog = (item) => {
  const isDriver = logTab.value === 'drivers';
  confirm.require({
    message: `¿Eliminar ${isDriver ? 'al conductor' : 'el vehículo'} ${isDriver ? item.name : item.plate}?`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    accept: () => {
      if (isDriver) { drivers.value = drivers.value.filter(d => d.id !== item.id); saveDrivers(drivers.value); }
      else          { fleet.value   = fleet.value.filter(f => f.id !== item.id);   saveFleet(fleet.value);     }
      toast.add({ severity: 'warn', summary: 'Eliminado', detail: 'Registro eliminado.', life: 3000 });
    },
  });
};
</script>

<template>
  <div class="community-mgmt">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Comunidad</h1>
        <p class="page-sub">Administra usuarios, conductores y flota</p>
      </div>
      <pv-button
        :label="section === 'users' ? (userTab === 'children' ? 'Agregar Alumno' : 'Agregar Padre') : (logTab === 'drivers' ? 'Agregar Conductor' : 'Agregar Vehículo')"
        icon="pi pi-plus"
        @click="onAddClick"/>
    </div>

    <!-- Section tabs -->
    <div class="section-tabs">
      <button class="section-tab" :class="{ active: section === 'users' }" @click="section = 'users'">
        <i class="pi pi-users"/> Usuarios
      </button>
      <button class="section-tab" :class="{ active: section === 'logistics' }" @click="section = 'logistics'">
        <i class="pi pi-car"/> Logística
      </button>
    </div>

    <!-- ══════════════ USERS SECTION ══════════════ -->
    <template v-if="section === 'users'">
      <div class="sub-tabs">
        <button class="sub-tab" :class="{ active: userTab === 'parents' }" @click="userTab = 'parents'">
          Padres ({{ parents.length }})
        </button>
        <button class="sub-tab" :class="{ active: userTab === 'children' }" @click="userTab = 'children'">
          Alumnos ({{ children.length }})
        </button>
      </div>

      <!-- Parents with expandable children -->
      <div v-if="userTab === 'parents'" class="table-card">
        <pv-data-table
          :value="parents"
          v-model:expandedRows="expandedRows"
          dataKey="id"
          class="p-datatable-sm">

          <pv-column :expander="true" style="width: 3rem"/>

          <pv-column header="Padre / Madre">
            <template #body="{ data }">
              <div class="name-cell">
                <div class="avatar">{{ data.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }}</div>
                <span>{{ data.name }}</span>
              </div>
            </template>
          </pv-column>

          <pv-column field="email" header="Email"/>
          <pv-column field="phone" header="Teléfono"/>

          <pv-column header="Hijos">
            <template #body="{ data }">
              <span class="count-badge">{{ getChildrenByParent(data.id).length }}</span>
            </template>
          </pv-column>

          <pv-column header="Estado">
            <template #body="{ data }">
              <pv-tag :severity="data.status ? 'success' : 'danger'" :value="data.status ? 'Activo' : 'Inactivo'"/>
            </template>
          </pv-column>

          <pv-column header="" style="width: 7rem">
            <template #body="{ data }">
              <div class="row-actions">
                <pv-button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditParent(data)"/>
                <pv-button icon="pi pi-trash"  text rounded size="small" severity="danger" @click.stop="deleteParent(data)"/>
              </div>
            </template>
          </pv-column>

          <template #expansion="{ data }">
            <div class="expansion-panel">
              <div class="expansion-header">
                <h5 class="expansion-title">
                  <i class="pi pi-users"/> Alumnos de {{ data.name }}
                </h5>
              </div>
              <p v-if="getChildrenByParent(data.id).length === 0" class="empty-note">
                No hay alumnos registrados.
              </p>
              <pv-data-table
                v-else
                :value="getChildrenByParent(data.id)"
                class="p-datatable-sm"
                responsive-layout="scroll">
                <pv-column field="name"  header="Nombre del Alumno"/>
                <pv-column field="grade" header="Grado/Sección"/>
                <pv-column header="Abordaje">
                  <template #body="s">
                    <pv-tag :severity="boardingSeverity[s.data.boardingStatus]" :value="boardingLabel[s.data.boardingStatus]"/>
                  </template>
                </pv-column>
                <pv-column header="Estado">
                  <template #body="s">
                    <pv-tag :severity="s.data.status ? 'success' : 'danger'" :value="s.data.status ? 'Activo' : 'Inactivo'"/>
                  </template>
                </pv-column>
                <pv-column header="" style="width: 7rem">
                  <template #body="s">
                    <div class="row-actions">
                      <pv-button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditChild(s.data)"/>
                      <pv-button icon="pi pi-trash"  text rounded size="small" severity="danger" @click.stop="deleteChild(s.data)"/>
                    </div>
                  </template>
                </pv-column>
              </pv-data-table>
            </div>
          </template>
        </pv-data-table>
      </div>

      <!-- All children -->
      <div v-if="userTab === 'children'" class="table-card">
        <pv-data-table :value="children" dataKey="id" class="p-datatable-sm">
          <pv-column field="name"  header="Nombre del Alumno"/>
          <pv-column field="grade" header="Grado/Sección"/>
          <pv-column header="Padre/Madre">
            <template #body="{ data }">
              <div class="name-cell">
                <div class="avatar sm">{{ parents.find(p => p.id === data.parentId)?.name?.charAt(0) || '?' }}</div>
                <span>{{ parents.find(p => p.id === data.parentId)?.name || '—' }}</span>
              </div>
            </template>
          </pv-column>
          <pv-column header="Abordaje">
            <template #body="{ data }">
              <pv-tag :severity="boardingSeverity[data.boardingStatus]" :value="boardingLabel[data.boardingStatus]"/>
            </template>
          </pv-column>
          <pv-column header="Estado">
            <template #body="{ data }">
              <pv-tag :severity="data.status ? 'success' : 'danger'" :value="data.status ? 'Activo' : 'Inactivo'"/>
            </template>
          </pv-column>
          <pv-column header="" style="width: 9rem">
            <template #body="{ data }">
              <div class="row-actions">
                <pv-button icon="pi pi-id-card" text rounded size="small" @click="showCarne(data)"/>
                <pv-button icon="pi pi-pencil" text rounded size="small" @click="openEditChild(data)"/>
                <pv-button icon="pi pi-trash"  text rounded size="small" severity="danger" @click="deleteChild(data)"/>
              </div>
            </template>
          </pv-column>
        </pv-data-table>
      </div>

      <!-- ── Parent Drawer (add / edit) ──────────────────── -->
      <pv-drawer v-model:visible="parentDrawer" :header="parentDrawerTitle" position="right" style="width: 42vw; min-width: 340px">
        <div class="drawer-form">
          <div class="field">
            <label>Nombre Completo *</label>
            <pv-input-text v-model="parentForm.name" class="w-full" placeholder="Ej: Juan Pérez"/>
          </div>
          <div class="field">
            <label>Email *</label>
            <pv-input-text v-model="parentForm.email" type="email" class="w-full" placeholder="correo@ejemplo.com"/>
          </div>
          <div class="field">
            <label>Contraseña</label>
            <pv-input-text v-model="parentForm.password" class="w-full" placeholder="Se auto-completa con el correo"/>
            <small class="field-hint">Se genera automáticamente desde el email. Puede modificarse.</small>
          </div>
          <div class="field">
            <label>Teléfono</label>
            <pv-input-text v-model="parentForm.phone" class="w-full" placeholder="Ej: 999-888-777"/>
          </div>
          <div class="field field-switch">
            <label>Estado Activo</label>
            <pv-input-switch v-model="parentForm.status"/>
          </div>

          <div class="children-section">
            <div class="children-header">
              <h3 class="children-title">Alumnos</h3>
              <pv-button label="Añadir Alumno" icon="pi pi-plus" size="small" outlined @click="addFormChild"/>
            </div>
            <p v-if="parentForm.formChildren.length === 0" class="empty-note">No hay alumnos registrados para este padre.</p>
            <div v-for="(child, i) in parentForm.formChildren" :key="i" class="child-row">
              <div class="child-row-header">
                <span class="child-label">Alumno #{{ i + 1 }}</span>
                <pv-button icon="pi pi-trash" severity="danger" text rounded @click="removeFormChild(i)"/>
              </div>
              <div class="child-fields">
                <div class="field">
                  <label>Nombre</label>
                  <pv-input-text v-model="child.name" class="w-full"/>
                </div>
                <div class="field">
                  <label>Grado / Sección</label>
                  <pv-input-text v-model="child.grade" class="w-full"/>
                </div>
              </div>
            </div>
          </div>

          <pv-button label="Guardar" icon="pi pi-check" class="w-full mt-4" @click="saveParent"/>
        </div>
      </pv-drawer>

      <!-- ── Child Dialog (add / edit standalone) ────────── -->
      <pv-dialog v-model:visible="childDialog" :header="childDialogTitle" modal style="width: 400px">
        <div class="drawer-form" style="padding: 0.5rem 0">
          <div class="field">
            <label>Nombre del Alumno *</label>
            <pv-input-text v-model="childForm.name" class="w-full"/>
          </div>
          <div class="field">
            <label>Grado / Sección</label>
            <pv-input-text v-model="childForm.grade" class="w-full"/>
          </div>
          <div class="field">
            <label>Padre / Madre</label>
            <pv-select
              v-model="childForm.parentId"
              :options="parents"
              option-label="name"
              option-value="id"
              placeholder="Seleccionar padre..."
              class="w-full"
              show-clear/>
          </div>
          <div class="field mt-2">
            <label>Fotografía del Alumno</label>
            <pv-button icon="pi pi-camera" :label="childForm.hasPhoto ? 'Foto Subida' : 'Tomar / Subir Foto'" @click="uploadPhotoMock" :severity="childForm.hasPhoto ? 'success' : 'secondary'" class="w-full" />
          </div>
          <div class="field">
            <label>Estado de Abordaje</label>
            <pv-select
              v-model="childForm.boardingStatus"
              :options="[{ label: 'En Espera', value: 'EN_ESPERA' }, { label: 'Abordado', value: 'ABORDADO' }, { label: 'Ausente', value: 'AUSENTE' }]"
              option-label="label"
              option-value="value"
              class="w-full"/>
          </div>
          <div class="field field-switch">
            <label>Estado Activo</label>
            <pv-input-switch v-model="childForm.status"/>
          </div>
        </div>
        <template #footer>
          <pv-button label="Cancelar" text @click="childDialog = false"/>
          <pv-button label="Guardar" icon="pi pi-check" @click="saveChild"/>
        </template>
      </pv-dialog>

      <!-- ── Digital ID Card Dialog ────────── -->
      <pv-dialog v-model:visible="carneDialog" header="Carné Digital" modal style="width: 320px; text-align:center">
        <div class="carne-card">
          <div class="carne-photo">
            <img v-if="carneData.hasPhoto" src="https://ui-avatars.com/api/?name=Student&background=random&color=fff&size=100" style="border-radius:50%; width:100px; height:100px" />
            <div v-else style="width:100px; height:100px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; margin: 0 auto">
              <i class="pi pi-user" style="font-size: 3rem; color: #9ca3af"/>
            </div>
          </div>
          <h2 style="margin: 1rem 0 0.5rem; color:var(--dark)">{{ carneData.name }}</h2>
          <p style="margin: 0 0 1rem; color:var(--muted)">Grado: {{ carneData.grade }}</p>
          <pv-tag severity="success" value="ESTUDIANTE ACTIVO" icon="pi pi-check" style="width:100%"/>
        </div>
      </pv-dialog>
    </template>

    <!-- ══════════════ LOGISTICS SECTION ══════════════ -->
    <template v-if="section === 'logistics'">
      <div class="sub-tabs">
        <button class="sub-tab" :class="{ active: logTab === 'drivers' }" @click="logTab = 'drivers'">
          Conductores ({{ drivers.length }})
        </button>
        <button class="sub-tab" :class="{ active: logTab === 'fleet' }" @click="logTab = 'fleet'">
          Flota ({{ fleet.length }})
        </button>
      </div>

      <!-- Drivers -->
      <div v-if="logTab === 'drivers'" class="table-card">
        <pv-data-table :value="drivers" dataKey="id" class="p-datatable-sm">
          <pv-column header="Nombre">
            <template #body="{ data }">
              <div class="name-cell">
                <div class="avatar">{{ data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }}</div>
                <span>{{ data.name }}</span>
              </div>
            </template>
          </pv-column>
          <pv-column field="license" header="Licencia"/>
          <pv-column header="Vehículo Asignado">
            <template #body="{ data }">
              <span v-if="fleet.find(f => f.id === data.vehicle_id)" class="vehicle-badge">
                <i class="pi pi-car"/> {{ fleet.find(f => f.id === data.vehicle_id)?.plate }}
              </span>
              <span v-else class="empty-note">Sin asignar</span>
            </template>
          </pv-column>
          <pv-column header="Estado">
            <template #body="{ data }">
              <pv-tag :severity="data.status ? 'success' : 'danger'" :value="data.status ? 'Activo' : 'Inactivo'"/>
            </template>
          </pv-column>
          <pv-column header="" style="width: 7rem">
            <template #body="{ data }">
              <div class="row-actions">
                <pv-button icon="pi pi-pencil" text rounded size="small" @click="openEditLog(data)"/>
                <pv-button icon="pi pi-trash"  text rounded size="small" severity="danger" @click="deleteLog(data)"/>
              </div>
            </template>
          </pv-column>
        </pv-data-table>
      </div>

      <!-- Fleet -->
      <div v-if="logTab === 'fleet'" class="table-card">
        <pv-data-table :value="fleet" dataKey="id" class="p-datatable-sm">
          <pv-column field="plate"    header="Placa"/>
          <pv-column field="model"    header="Modelo"/>
          <pv-column field="capacity" header="Capacidad">
            <template #body="{ data }">{{ data.capacity }} pasajeros</template>
          </pv-column>
          <pv-column header="Estado">
            <template #body="{ data }">
              <pv-tag :severity="data.status ? 'success' : 'danger'" :value="data.status ? 'Activo' : 'Inactivo'"/>
            </template>
          </pv-column>
          <pv-column header="" style="width: 7rem">
            <template #body="{ data }">
              <div class="row-actions">
                <pv-button icon="pi pi-pencil" text rounded size="small" @click="openEditLog(data)"/>
                <pv-button icon="pi pi-trash"  text rounded size="small" severity="danger" @click="deleteLog(data)"/>
              </div>
            </template>
          </pv-column>
        </pv-data-table>
      </div>

      <!-- Logistics Drawer (add / edit) -->
      <pv-drawer
        v-model:visible="logDrawer"
        :header="logDrawerTitle"
        position="right"
        style="width: 40vw; min-width: 320px">
        <div class="drawer-form">
          <div class="field">
            <label>{{ logTab === 'drivers' ? 'Nombre Completo' : 'Placa del Vehículo' }}</label>
            <pv-input-text v-model="logForm.nameOrPlate" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ logTab === 'drivers' ? 'Licencia de Conducir' : 'Modelo' }}</label>
            <pv-input-text v-model="logForm.licenseOrModel" class="w-full"/>
          </div>
          <div v-if="logTab === 'drivers'" class="field mt-2">
            <label>Documento de Licencia</label>
            <div style="display:flex; gap:0.5rem; align-items:center">
              <pv-button icon="pi pi-upload" :label="logForm.licenseVerified ? 'Licencia Subida' : 'Subir PDF/Foto'" :severity="logForm.licenseVerified ? 'success' : 'secondary'" @click="uploadLicenseMock" :disabled="logForm.licenseVerified"/>
              <pv-tag v-if="logForm.licenseVerified" severity="success" value="Verificado" icon="pi pi-check"/>
              <pv-tag v-else severity="warn" value="Pendiente"/>
            </div>
          </div>
          <div v-if="logTab === 'fleet'" class="field">
            <label>Capacidad (pasajeros)</label>
            <pv-input-text v-model.number="logForm.capacity" class="w-full" type="number"/>
          </div>
          <div v-if="logTab === 'drivers'" class="field">
            <label>Asignar Vehículo (Opcional)</label>
            <pv-select
              v-model="logForm.vehicle_id"
              :options="fleet"
              option-label="plate"
              option-value="id"
              placeholder="Seleccionar vehículo..."
              class="w-full"
              show-clear>
              <template #option="{ option }">
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-car"/>
                  <span>{{ option.plate }} — {{ option.model }}</span>
                </div>
              </template>
            </pv-select>
          </div>
          <div class="field field-switch">
            <label>Estado Activo</label>
            <pv-input-switch v-model="logForm.status"/>
          </div>
          <pv-button label="Guardar" icon="pi pi-check" class="w-full mt-4" @click="saveLog"/>
        </div>
      </pv-drawer>
    </template>

  </div>
</template>

<style scoped>
.community-mgmt { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.page-title { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-family: var(--sans); font-size: 0.875rem; color: var(--muted); margin: 0; }

/* Section tabs (Users / Logistics) */
.section-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid #e5e7eb;
}
.section-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.4rem;
  border: none;
  background: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.section-tab:hover  { color: var(--dark); }
.section-tab.active { color: var(--dark); border-bottom-color: var(--amber); }

/* Sub tabs */
.sub-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
}
.sub-tab {
  padding: 0.4rem 1rem;
  border: 2px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.15s;
}
.sub-tab:hover  { border-color: var(--amber); color: var(--dark); }
.sub-tab.active { border-color: var(--amber); background: #fffbf2; color: var(--dark); font-weight: 600; }

/* Table */
.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }

.name-cell { display: flex; align-items: center; gap: 0.65rem; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--amber); color: var(--dark);
  font-size: 0.72rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.avatar.sm { width: 26px; height: 26px; font-size: 0.65rem; }

.count-badge {
  background: #e0f2fe; color: #0369a1;
  font-size: 0.72rem; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
}
.vehicle-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: #f0fdf4; color: #15803d;
  font-size: 0.78rem; font-weight: 600;
  padding: 2px 8px; border-radius: 20px;
}

.row-actions { display: flex; gap: 0.25rem; align-items: center; }

/* Expansion */
.expansion-panel { padding: 1rem 1.5rem; background: #f9fafb; }
.expansion-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.expansion-title {
  font-size: 0.875rem; font-weight: 700; color: var(--dark);
  margin: 0; display: flex; align-items: center; gap: 0.4rem;
}
.empty-note { font-size: 0.82rem; color: var(--muted); font-style: italic; margin: 0; }

/* Drawer / Dialog form */
.drawer-form { display: flex; flex-direction: column; gap: 1rem; padding: 0.25rem 0; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }
.field-switch { flex-direction: row; align-items: center; justify-content: space-between; }
.field-hint { font-size: 0.75rem; color: var(--muted); margin-top: 0.15rem; }

.children-section { border-top: 1px solid #e5e7eb; padding-top: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.children-header  { display: flex; align-items: center; justify-content: space-between; }
.children-title   { font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0; }

.child-row { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.85rem; background: #f9fafb; }
.child-row-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.child-label      { font-size: 0.82rem; font-weight: 700; color: var(--dark); }
.child-fields     { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
