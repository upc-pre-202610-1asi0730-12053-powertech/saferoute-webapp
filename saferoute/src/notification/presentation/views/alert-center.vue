<template>
  <div class="alert-center-view">
    <!-- Vista del centro de notificaciones y alertas -->
    <h2>Alert Center</h2>
    <ul class="alert-list">
      <li>Bus is 5 minutes away.</li>
    </ul>
  </div>
</template>

<script setup>
/**
 * Componente principal para el centro de notificaciones.
 */
</script>

<style scoped>
.alert-center-view {
  padding: 2rem;
}
.alert-list {
  list-style: none;
  padding: 0;
}
.alert-list li {
  padding: 0.5rem;
  border-bottom: 1px solid #ccc;
}
</style>
