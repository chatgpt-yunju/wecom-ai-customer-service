<template>
  <el-card>
    <el-table :data="stats" v-loading="loading">
      <el-table-column prop="statDate" label="日期" width="120">
        <template #default="scope">{{ formatDate(scope.row.statDate) }}</template>
      </el-table-column>
      <el-table-column prop="statType" label="统计类型" width="120" />
      <el-table-column prop="metricKey" label="指标" width="150" />
      <el-table-column prop="metricValue" label="数值">
        <template #default="scope">{{ Number(scope.row.metricValue).toLocaleString() }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const stats = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await axios.get('/admin/statistics?days=30');
    stats.value = res.data.statistics;
  } catch (e) {
    console.error('Failed to load statistics:', e);
  } finally {
    loading.value = false;
  }
});

const formatDate = (date) => new Date(date).toLocaleDateString();
</script>
