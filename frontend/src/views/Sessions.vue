<template>
  <el-card>
    <el-table :data="sessions" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="sessionId" label="会话ID" width="120" />
      <el-table-column prop="user.name" label="用户" />
      <el-table-column prop="agent.name" label="客服" />
      <el-table-column prop="status" label="状态">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastMessageAt" label="最后消息">
        <template #default="scope">{{ formatDate(scope.row.lastMessageAt) }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const sessions = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await axios.get('/admin/sessions');
    sessions.value = res.data.sessions;
  } catch (e) {
    console.error('Failed to load sessions:', e);
  } finally {
    loading.value = false;
  }
});

const statusType = (status) => {
  const map = { active: 'success', closed: 'info', transferred: 'warning' };
  return map[status] || '';
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleString();
</script>
