<template>
  <el-card>
    <el-table :data="agents" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="agentId" label="客服账号" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="100" />
      <el-table-column prop="isOnline" label="在线状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.isOnline ? 'success' : 'info'">
            {{ scope.row.isOnline ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="currentConcurrent" label="当前会话" width="100" />
      <el-table-column prop="maxConcurrent" label="最大会话" width="100" />
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const agents = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await axios.get('/admin/agents');
    agents.value = res.data.agents;
  } catch (e) {
    console.error('Failed to load agents:', e);
  } finally {
    loading.value = false;
  }
});
</script>
