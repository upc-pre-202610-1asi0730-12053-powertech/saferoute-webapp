<template>
  <div class="plan-selection-view">
    <!-- Vista para elegir una suscripción comercial -->
    <h2>Select a Plan</h2>
    <div class="plans-container">
      <div class="plan-card">Basic Plan</div>
      <div class="plan-card">Premium Plan</div>
    </div>
  </div>
</template>

<script setup>
/**
 * Componente para selección de planes.
 */
</script>

<style scoped>
.plan-selection-view {
  padding: 2rem;
}
.plans-container {
  display: flex;
  gap: 1rem;
}
.plan-card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 4px;
}
</style>
