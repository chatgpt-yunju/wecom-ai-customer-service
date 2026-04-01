<template>
  <el-card>
    <el-upload
      action="/admin/kb/upload"
      :show-file-list="false"
      :on-success="onUpload"
      :before-upload="beforeUpload"
      accept=".pdf,.doc,.docx,.txt,.md"
    >
      <el-button type="primary">上传文档</el-button>
    </el-upload>
    <el-table :data="docs" style="margin-top: 20px" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="文件名" />
      <el-table-column prop="fileType" label="类型" width="100" />
      <el-table-column prop="fileSize" label="大小" width="100">
        <template #default="scope">{{ formatSize(scope.row.fileSize) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="chunkCount" label="分块数" width="100" />
      <el-table-column prop="createdAt" label="上传时间">
        <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const docs = ref([]);
const loading = ref(false);

onMounted(loadDocs);

const loadDocs = async () => {
  loading.value = true;
  try {
    const res = await axios.get('/admin/kb/list');
    docs.value = res.data.knowledge_base;
  } catch (e) {
    console.error('Failed to load knowledge base:', e);
  } finally {
    loading.value = false;
  }
};

const onUpload = () => {
  ElMessage.success('文档上传成功');
  loadDocs();
};

const beforeUpload = (file) => {
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) ElMessage.error('文件大小不能超过10MB');
  return isLt10M;
};

const statusType = (status) => {
  const map = { processing: 'warning', ready: 'success', error: 'danger' };
  return map[status] || '';
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleString();
const formatSize = (bytes) => bytes ? (bytes / 1024).toFixed(2) + ' KB' : '-';
</script>
