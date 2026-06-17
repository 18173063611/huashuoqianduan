<template>
  <section class="workbench-info-page">
    <header class="workbench-info-head">
      <div>
        <span>{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
    </header>

    <div class="workbench-info-grid">
      <article v-for="card in cards" :key="card.title" class="workbench-info-card">
        <div class="workbench-info-card-main">
          <strong>{{ card.title }}</strong>
          <p>{{ card.description }}</p>
          <small v-if="card.note">{{ card.note }}</small>
        </div>
        <RouterLink v-if="card.to" class="workbench-info-action" :to="card.to">
          {{ card.actionLabel || '查看' }}
        </RouterLink>
        <span v-else class="workbench-info-status">{{ card.status || '规划中' }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
interface WorkbenchInfoCard {
  title: string
  description: string
  note?: string
  status?: string
  to?: string
  actionLabel?: string
}

defineProps<{
  eyebrow: string
  title: string
  description: string
  cards: WorkbenchInfoCard[]
}>()
</script>

<style scoped>
.workbench-info-page {
  display: grid;
  gap: 16px;
}

.workbench-info-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 20px;
}

.workbench-info-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.workbench-info-head h2 {
  margin: 6px 0;
  color: #172033;
  font-size: 20px;
  font-weight: 900;
}

.workbench-info-head p {
  max-width: 760px;
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.7;
}

.workbench-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.workbench-info-card {
  display: grid;
  min-height: 148px;
  grid-template-rows: 1fr auto;
  gap: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}

.workbench-info-card-main {
  display: grid;
  gap: 8px;
}

.workbench-info-card strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.workbench-info-card p {
  margin: 0;
  color: #475467;
  font-size: 13px;
  line-height: 1.65;
}

.workbench-info-card small {
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.workbench-info-action,
.workbench-info-status {
  display: inline-flex;
  min-height: 32px;
  width: fit-content;
  align-items: center;
  border-radius: 7px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 850;
}

.workbench-info-action {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
  text-decoration: none;
}

.workbench-info-status {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #667085;
}

@media (max-width: 640px) {
  .workbench-info-head {
    padding: 16px;
  }

  .workbench-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
