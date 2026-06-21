<script setup>
import { ref, computed, onMounted } from "vue";
import { useIamStore } from "../../../identity-and-access-management/application/iam.store.js";
import { TripApi } from "../../infrastructure/trip-api.js";
import { StakeholderApi } from "../../../stakeholder-and-asset-management/infrastructure/stakeholder-api.js";

const iamStore = useIamStore();
const tripApi = new TripApi();
const stakeholderApi = new StakeholderApi();

// ── Resolve current parent's children ────────────────────────────────────────
const myChildren = ref([]);
const trips = ref([]);

function getCurrentUser() {
  if (iamStore.currentUser) return iamStore.currentUser;
  try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}'); }
  catch { return {}; }
}

function sameId(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function personName(person) {
  return person?.fullName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim();
}

function isCurrentParent(parent, user) {
  return sameId(parent.email, user?.email) || sameId(parent.userId, user?.id) || sameId(parent.id, user?.parentId);
}

async function loadAttendanceData() {
  try {
    const user = getCurrentUser();
    const orgId = user?.organizationId;
    const [parentsRes, tripsRes] = await Promise.all([
      stakeholderApi.getParentsByOrganization(orgId),
      tripApi.getTrips(orgId),
    ]);

    const parents = parentsRes.data || [];
    const currentParent = parents.find(parent => isCurrentParent(parent, user)) ||
      (user?.roleTier === 'PARENT' ? parents[0] : null);

    myChildren.value = (currentParent?.children || []).map(child => ({
      ...child,
      parentId: currentParent.id,
      childName: personName(child),
    }));
    trips.value = tripsRes.data || [];
  } catch (error) {
    console.warn('Attendance history could not be loaded:', error);
    myChildren.value = [];
    trips.value = [];
  }
}

onMounted(loadAttendanceData);

// ── Calendar state ────────────────────────────────────────────────────────────
const today      = new Date();
const viewYear   = ref(today.getFullYear());
const viewMonth  = ref(today.getMonth()); // 0-indexed

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const DAY_HEADERS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ── Attendance data built from persisted trip records ────────────────────────
function formatDateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function parseTripDate(trip, attendanceRecord) {
  const raw = attendanceRecord?.boardedAt || trip.startTime || trip.scheduledDate || trip.endTime;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

function attendanceStatus(boardingState) {
  if (boardingState === 'BOARDED' || boardingState === 'ABORDADO') return 'PRESENT';
  if (boardingState === 'MISSING' || boardingState === 'AUSENTE') return 'ABSENT';
  return 'LATE';
}

function buildAttendance() {
  const records = {};
  const childById = new Map(myChildren.value.map(child => [String(child.id), child]));

  trips.value.forEach(trip => {
    (trip.attendances || []).forEach(attendanceRecord => {
      const child = childById.get(String(attendanceRecord.childId));
      if (!child) return;

      const date = parseTripDate(trip, attendanceRecord);
      const key = formatDateKey(date);
      if (!key) return;

      const status = attendanceStatus(attendanceRecord.boardingState);
      if (!records[key]) records[key] = [];
      records[key].push({
        childId: child.id,
        childName: child.childName || personName(child) || 'Alumno',
        status,
        checkIn: status !== 'ABSENT' ? formatTime(attendanceRecord.boardedAt || trip.startTime) : null,
        checkOut: status !== 'ABSENT' ? formatTime(trip.endTime) : null,
      });
    });
  });
  return records;
}

const attendance = computed(() => buildAttendance());

// ── Calendar grid ─────────────────────────────────────────────────────────────
const calendarDays = computed(() => {
  const year  = viewYear.value;
  const month = viewMonth.value;
  const firstDow  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  return cells;
});

function dayKey(d) {
  if (!d) return null;
  return `${viewYear.value}-${String(viewMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function dayDots(d) {
  const recs = attendance.value[dayKey(d)] || [];
  const statuses = [...new Set(recs.map(r => r.status))];
  return statuses;
}

function dotColor(status) {
  if (status === 'PRESENT') return 'var(--green, #22c55e)';
  if (status === 'LATE')    return '#f59e0b';
  return '#ef4444';
}

function isToday(d) {
  return d === today.getDate() && viewMonth.value === today.getMonth() && viewYear.value === today.getFullYear();
}


const selectedDay = ref(today.getDate());

const selectedKey = computed(() => dayKey(selectedDay.value));
const selectedRecords = computed(() => attendance.value[selectedKey.value] || []);

function selectDay(d) {
  if (!d) return;
  selectedDay.value = d;
}

// ── Month navigation ──────────────────────────────────────────────────────────
function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value--; }
  else viewMonth.value--;
  selectedDay.value = 1;
}
function nextMonth() {
  const now = new Date();
  if (viewYear.value > now.getFullYear() || (viewYear.value === now.getFullYear() && viewMonth.value >= now.getMonth())) return;
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++; }
  else viewMonth.value++;
  selectedDay.value = 1;
}

const canGoNext = computed(() => {
  const now = new Date();
  return !(viewYear.value === now.getFullYear() && viewMonth.value >= now.getMonth());
});

// ── Summary stats ─────────────────────────────────────────────────────────────
const stats = computed(() => {
  const allRecs = Object.values(attendance.value).flat();
  const total    = allRecs.length;
  const present  = allRecs.filter(r => r.status === 'PRESENT').length;
  const late     = allRecs.filter(r => r.status === 'LATE').length;
  const absent   = allRecs.filter(r => r.status === 'ABSENT').length;
  const presentRate = total ? Math.round(((present + late) / total) * 100) : 0;
  return [
    { icon: 'pi pi-calendar',          value: Object.keys(attendance.value).length, label: 'Días registrados', color: '#16305a' },
    { icon: 'pi pi-check-circle',      value: `${presentRate}%`,                   label: 'Tasa de presencia',  color: '#22c55e' },
    { icon: 'pi pi-clock',             value: late,                                 label: 'Llegadas tarde',     color: '#f59e0b' },
    { icon: 'pi pi-times-circle',      value: absent,                               label: 'Ausencias',          color: '#ef4444' },
  ];
});

// ── Table all-records for selected month ──────────────────────────────────────
const tableRecords = computed(() => {
  const rows = [];
  Object.entries(attendance.value)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([date, recs]) => {
      recs.forEach(r => rows.push({ date, ...r }));
    });
  return rows;
});
</script>

<template>
  <div class="attendance-page">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="att-header">
      <div>
        <p class="att-eyebrow">Historial de asistencia</p>
        <h1 class="att-title">Check Assistance</h1>
        <p class="att-sub">Seguimiento de abordaje y asistencia de tus hijos</p>
      </div>
    </div>

    <!-- ── Stat cards ──────────────────────────────────────────── -->
    <div class="stats-row">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="stat-icon-wrap" :style="{ background: s.color + '18', color: s.color }">
          <i :class="s.icon"/>
        </div>
        <div class="stat-info">
          <span class="stat-value" :style="{ color: s.color }">{{ s.value }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <!-- ── Calendar + Detail row ───────────────────────────────── -->
    <div class="cal-detail-row">

      <!-- Calendar -->
      <div class="cal-card">
        <!-- Month nav -->
        <div class="cal-nav">
          <button class="cal-nav-btn" @click="prevMonth">
            <i class="pi pi-chevron-left"/>
          </button>
          <span class="cal-month-label">{{ MONTH_NAMES[viewMonth] }} {{ viewYear }}</span>
          <button class="cal-nav-btn" :disabled="!canGoNext" @click="nextMonth">
            <i class="pi pi-chevron-right"/>
          </button>
        </div>

        <!-- Day headers -->
        <div class="cal-grid">
          <div v-for="h in DAY_HEADERS" :key="h" class="cal-day-header">{{ h }}</div>

          <!-- Cells -->
          <div
            v-for="(d, idx) in calendarDays"
            :key="idx"
            class="cal-cell"
            :class="{
              empty:    !d,
              today:    isToday(d),
              selected: d === selectedDay,
              hasData:  d && (attendance[dayKey(d)]?.length > 0),
            }"
            @click="selectDay(d)">
            <span v-if="d" class="cal-day-num">{{ d }}</span>
            <!-- status dots -->
            <div v-if="d" class="cal-dots">
              <span
                v-for="status in dayDots(d)"
                :key="status"
                class="cal-dot"
                :style="{ background: dotColor(status) }"/>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="cal-legend">
          <span class="leg-item"><span class="leg-dot" style="background:#22c55e"/>Presente</span>
          <span class="leg-item"><span class="leg-dot" style="background:#f59e0b"/>Tarde</span>
          <span class="leg-item"><span class="leg-dot" style="background:#ef4444"/>Ausente</span>
        </div>
      </div>

      <!-- Day detail -->
      <div class="detail-card">
        <h3 class="detail-title">
          <i class="pi pi-list-check mr-2"/>
          {{ selectedDay ? `${String(selectedDay).padStart(2,'0')} ${MONTH_NAMES[viewMonth]}` : 'Selecciona un día' }}
        </h3>

        <div v-if="selectedRecords.length === 0" class="detail-empty">
          <i class="pi pi-calendar-times detail-empty-icon"/>
          <p>Sin registros para este día</p>
          <span>(fin de semana o día sin datos)</span>
        </div>

        <div v-else class="detail-list">
          <div v-for="rec in selectedRecords" :key="rec.childId" class="detail-row">
            <div class="detail-avatar">
              <i class="pi pi-user"/>
            </div>
            <div class="detail-info">
              <span class="detail-name">{{ rec.childName }}</span>
              <div class="detail-times">
                <span v-if="rec.checkIn"  class="time-chip in"><i class="pi pi-sign-in"/>{{ rec.checkIn }}</span>
                <span v-if="rec.checkOut" class="time-chip out"><i class="pi pi-sign-out"/>{{ rec.checkOut }}</span>
                <span v-if="!rec.checkIn && !rec.checkOut" class="time-chip absent">Sin registro</span>
              </div>
            </div>
            <span class="status-badge" :class="rec.status.toLowerCase()">
              {{ rec.status === 'PRESENT' ? 'Presente' : rec.status === 'LATE' ? 'Tarde' : 'Ausente' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Monthly table ───────────────────────────────────────── -->
    <div class="table-card">
      <h3 class="table-title">
        <i class="pi pi-table mr-2"/>
        Registro del mes — {{ MONTH_NAMES[viewMonth] }} {{ viewYear }}
      </h3>

      <div class="att-table-wrap">
        <table class="att-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Alumno</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="tableRecords.length === 0">
              <td colspan="5" class="table-empty">Sin datos este mes</td>
            </tr>
            <tr v-for="rec in tableRecords" :key="rec.date + rec.childId">
              <td class="td-date">{{ rec.date }}</td>
              <td class="td-name">{{ rec.childName }}</td>
              <td class="td-time">{{ rec.checkIn  || '—' }}</td>
              <td class="td-time">{{ rec.checkOut || '—' }}</td>
              <td>
                <span class="status-badge" :class="rec.status.toLowerCase()">
                  {{ rec.status === 'PRESENT' ? 'Presente' : rec.status === 'LATE' ? 'Tarde' : 'Ausente' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Page ────────────────────────────────────────────────────── */
.attendance-page {
  padding: 2rem 2rem 3rem;
  background: var(--bg);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* ── Header ──────────────────────────────────────────────────── */
.att-eyebrow {
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--amber); margin: 0 0 0.3rem;
}
.att-title {
  font-family: var(--heading); font-size: 2rem; font-weight: 800;
  color: var(--dark); margin: 0 0 0.3rem;
}
.att-sub { font-size: 0.9rem; color: var(--muted); margin: 0; }

/* ── Stat cards ──────────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.stat-icon-wrap {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; flex-shrink: 0;
}
.stat-info { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-value { font-size: 1.75rem; font-weight: 800; line-height: 1; }
.stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

/* ── Calendar + detail ───────────────────────────────────────── */
.cal-detail-row {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 1.25rem;
  align-items: start;
}

/* ── Calendar card ───────────────────────────────────────────── */
.cal-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.cal-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem;
}
.cal-nav-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--dark); transition: background 0.15s;
}
.cal-nav-btn:hover:not(:disabled) { background: var(--amber); color: #fff; border-color: var(--amber); }
.cal-nav-btn:disabled { opacity: 0.35; cursor: default; }
.cal-month-label { font-weight: 700; font-size: 0.95rem; color: var(--dark); }

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.cal-day-header {
  text-align: center; font-size: 0.7rem; font-weight: 700;
  color: var(--muted); padding: 0.25rem 0; text-transform: uppercase;
}
.cal-cell {
  aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 8px; cursor: pointer; position: relative;
  transition: background 0.12s;
  padding: 2px;
  min-width: 0;
}
.cal-cell:not(.empty):hover { background: #f1f5f9; }
.cal-cell.empty { cursor: default; }
.cal-cell.today { background: #eff6ff; }
.cal-cell.today .cal-day-num { color: #2563eb; font-weight: 800; }
.cal-cell.selected { background: var(--navy); }
.cal-cell.selected .cal-day-num { color: #fff !important; font-weight: 800; }
.cal-day-num { font-size: 0.82rem; line-height: 1; }
.cal-dots {
  display: flex; gap: 2px; margin-top: 2px;
  flex-wrap: wrap; justify-content: center;
}
.cal-dot {
  width: 5px; height: 5px; border-radius: 50%;
}

.cal-legend {
  display: flex; gap: 1rem; margin-top: 0.85rem;
  justify-content: center; flex-wrap: wrap;
}
.leg-item {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.72rem; color: var(--muted);
}
.leg-dot { width: 8px; height: 8px; border-radius: 50%; }

/* ── Detail card ─────────────────────────────────────────────── */
.detail-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  min-height: 300px;
}
.detail-title {
  font-size: 1rem; font-weight: 700; color: var(--dark);
  margin: 0 0 1rem;
  display: flex; align-items: center;
}
.detail-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 0.4rem;
  padding: 2.5rem 1rem; text-align: center;
}
.detail-empty-icon { font-size: 2.5rem; color: #cbd5e1; }
.detail-empty p { color: var(--muted); font-size: 0.9rem; margin: 0; }
.detail-empty span { color: #cbd5e1; font-size: 0.78rem; }

.detail-list { display: flex; flex-direction: column; gap: 0.75rem; }
.detail-row {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.75rem; border-radius: 10px; background: #f8fafc;
  border: 1px solid #f1f5f9;
}
.detail-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: var(--navy); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; flex-shrink: 0;
}
.detail-info { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.detail-name { font-size: 0.875rem; font-weight: 600; color: var(--dark); }
.detail-times { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.time-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.75rem; font-weight: 600; padding: 2px 8px;
  border-radius: 99px;
}
.time-chip.in     { background: #d1fae5; color: #065f46; }
.time-chip.out    { background: #dbeafe; color: #1d4ed8; }
.time-chip.absent { background: #fee2e2; color: #991b1b; }

/* ── Status badge ────────────────────────────────────────────── */
.status-badge {
  font-size: 0.72rem; font-weight: 700; padding: 3px 10px;
  border-radius: 99px; white-space: nowrap; flex-shrink: 0;
}
.status-badge.present { background: #d1fae5; color: #065f46; }
.status-badge.late    { background: #fef3c7; color: #92400e; }
.status-badge.absent  { background: #fee2e2; color: #991b1b; }

/* ── Monthly table ───────────────────────────────────────────── */
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.table-title {
  font-size: 1rem; font-weight: 700; color: var(--dark);
  margin: 0 0 1rem;
  display: flex; align-items: center;
}
.att-table-wrap { overflow-x: auto; }
.att-table {
  width: 100%; border-collapse: collapse; font-size: 0.85rem;
}
.att-table th {
  background: #f8fafc; text-align: left;
  padding: 0.65rem 0.9rem;
  font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--muted); border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
.att-table td {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid #f1f5f9;
  color: var(--dark);
  vertical-align: middle;
}
.att-table tbody tr:hover td { background: #f8fafc; }
.td-date { font-size: 0.78rem; color: var(--muted); white-space: nowrap; }
.td-name { font-weight: 600; }
.td-time { font-size: 0.82rem; font-family: monospace; }
.table-empty { text-align: center; color: var(--muted); padding: 2rem; }

/* ══ Responsive ══════════════════════════════════════════════════ */
@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .cal-detail-row { grid-template-columns: 1fr; }
}
@media (max-width: 540px) {
  .attendance-page { padding: 1rem 1rem 2rem; }
  .stats-row { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .att-title { font-size: 1.5rem; }
}
</style>
