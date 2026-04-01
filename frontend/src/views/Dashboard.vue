<template>
  <el-row :gutter="20">
    <el-col :span="6">
      <el-card>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalSessions || 0 }}</div>
          <div class="stat-label">总会话数</div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card>
        <div class="stat-card">
          <div class="stat-value">{{ stats.activeSessions || 0 }}</div>
          <div class="stat-label">活跃会话</div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalMessages || 0 }}</div>
          <div class="stat-label">消息总数</div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card>
        <div class="stat-card">
          <div class="stat-value">{{ stats.onlineAgents || 0 }}</div>
          <div class="stat-label">在线客服</div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const stats = ref({});

onMounted(async () => {
  try {
    const res = await axios.get('/admin/statistics?days=7');
    console.log('Statistics:', res.data);
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
});
</script>
