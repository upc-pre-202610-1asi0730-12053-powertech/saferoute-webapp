<script setup>
import { ref, computed } from 'vue';
import { useIamStore } from '../../application/iam.store.js';

const iamStore = useIamStore();

const roleMap = { ADMIN: 'Administrador del Sistema', DRIVER: 'Conductor', PARENT: 'Padre / Madre' };

const profileData = ref({
  firstName: iamStore.currentUser?.firstName || '',
  lastName:  iamStore.currentUser?.lastName  || '',
  email:     iamStore.currentUser?.email     || '',
  phone:     '',
  role:      roleMap[iamStore.currentUser?.roleTier] || 'Usuario'
});

const securityData = ref({
  currentPassword: '',
  newPassword:     '',
  confirmPassword: ''
});

const notifications = ref({
  emailAlerts:   true,
  smsAlerts:     false,
  systemUpdates: true
});

const initials = computed(() =>
  `${profileData.value.firstName.charAt(0)}${profileData.value.lastName.charAt(0)}`.toUpperCase()
);

const saveProfile = () => {
  console.log('Profile saved:', profileData.value);
};

const saveSecurity = () => {
  console.log('Security saved');
};
</script>

<template>
  <div class="admin-profile">
    <div class="page-header">
      <h1 class="page-title">Mi Perfil</h1>
    </div>

    <div class="profile-grid">
      <!-- Left column -->
      <div class="left-col">
        <!-- Avatar card -->
        <div class="profile-card">
          <div class="avatar-circle">{{ initials }}</div>
          <h3 class="profile-name">{{ profileData.firstName }} {{ profileData.lastName }}</h3>
          <p class="profile-role">{{ profileData.role }}</p>
          <span class="active-badge">
            <i class="pi pi-check-circle"/> Cuenta Activa
          </span>
        </div>

        <!-- Notifications card -->
        <div class="pref-card">
          <h4 class="pref-title">Preferencias de Notificación</h4>
          <div class="pref-list">
            <div class="pref-row">
              <label for="emailAlerts">Alertas por Email</label>
              <pv-input-switch id="emailAlerts" v-model="notifications.emailAlerts"/>
            </div>
            <div class="pref-row">
              <label for="smsAlerts">Alertas por SMS</label>
              <pv-input-switch id="smsAlerts" v-model="notifications.smsAlerts"/>
            </div>
            <div class="pref-row">
              <label for="systemUpdates">Actualizaciones del Sistema</label>
              <pv-input-switch id="systemUpdates" v-model="notifications.systemUpdates"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <!-- Personal info -->
        <div class="form-card">
          <h4 class="form-card-title">Información Personal</h4>
          <div class="form-grid">
            <div class="field">
              <label>Nombre</label>
              <pv-input-text v-model="profileData.firstName" class="w-full"/>
            </div>
            <div class="field">
              <label>Apellidos</label>
              <pv-input-text v-model="profileData.lastName" class="w-full"/>
            </div>
            <div class="field">
              <label>Correo Electrónico</label>
              <pv-input-text v-model="profileData.email" type="email" class="w-full"/>
            </div>
            <div class="field">
              <label>Teléfono</label>
              <pv-input-text v-model="profileData.phone" class="w-full"/>
            </div>
          </div>
          <div class="card-footer">
            <pv-button label="Guardar Cambios" icon="pi pi-save" @click="saveProfile"/>
          </div>
        </div>

        <!-- Security -->
        <div class="form-card">
          <h4 class="form-card-title">Seguridad</h4>
          <div class="form-grid">
            <div class="field">
              <label>Contraseña Actual</label>
              <pv-input-text v-model="securityData.currentPassword" type="password" class="w-full"/>
            </div>
            <div class="field"></div>
            <div class="field">
              <label>Nueva Contraseña</label>
              <pv-input-text v-model="securityData.newPassword" type="password" class="w-full"/>
            </div>
            <div class="field">
              <label>Confirmar Nueva Contraseña</label>
              <pv-input-text v-model="securityData.confirmPassword" type="password" class="w-full"/>
            </div>
          </div>
          <div class="card-footer">
            <pv-button label="Actualizar Contraseña" icon="pi pi-lock" severity="warning" @click="saveSecurity"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-profile { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header { margin-bottom: 1.5rem; }
.page-title  { font-size: 1.5rem; font-weight: 700; color: var(--dark); margin: 0; }

.profile-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* Left col */
.left-col { display: flex; flex-direction: column; gap: 1.25rem; }

.profile-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: var(--navy);
  color: var(--amber);
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.profile-name { font-size: 1.1rem; font-weight: 700; color: var(--dark); margin: 0 0 0.25rem; }
.profile-role { font-size: 0.82rem; color: var(--muted); margin: 0 0 1rem; }

.active-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
}

.pref-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.25rem 1.5rem;
}
.pref-title { font-size: 0.95rem; font-weight: 700; color: var(--dark); margin: 0 0 1rem; }

.pref-list { display: flex; flex-direction: column; gap: 0.85rem; }
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--dark);
}

/* Right col */
.right-col { display: flex; flex-direction: column; gap: 1.25rem; }

.form-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.25rem 1.5rem 1rem;
}
.form-card-title { font-size: 0.95rem; font-weight: 700; color: var(--dark); margin: 0 0 1.25rem; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label { font-size: 0.82rem; font-weight: 600; color: var(--dark); }

.card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}
</style>
