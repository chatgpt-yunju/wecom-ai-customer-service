<template>
  <el-card>
    <el-table :data="users" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="wecomUserId" label="企业微信ID" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="mobile" label="手机号" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="createdAt" label="创建时间">
        <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
      </el-table-column>
    </el-table>
    <el-pagination
      layout="prev, pager, next"
      :total="total"
      :page-size="limit"
      v-model:current-page="page"
      @current-change="loadUsers"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const users = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const limit = ref(20);

const loadUsers = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/admin/users?page=${page.value}&limit=${limit.value}`);
    users.value = res.data.users;
    total.value = res.data.total;
  } catch (e) {
    console.error('Failed to load users:', e);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

onMounted(loadUsers);
</script>
