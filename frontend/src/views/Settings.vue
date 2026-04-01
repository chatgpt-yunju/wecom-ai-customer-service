<template>
  <el-card>
    <el-form :model="config" label-width="200px">
      <el-divider content-position="left">AI配置</el-divider>
      <el-form-item label="AI API Base URL">
        <el-input v-model="config.ai_api_base_url" placeholder="https://api.anthropic.com/v1" />
      </el-form-item>
      <el-form-item label="API Key">
        <el-input v-model="config.ai_api_key" type="password" show-password />
      </el-form-item>
      <el-form-item label="模型名称">
        <el-input v-model="config.ai_model" placeholder="claude-3-opus-20240229" />
      </el-form-item>

      <el-divider content-position="left">企业微信配置</el-divider>
      <el-form-item label="Corp ID">
        <el-input v-model="config.wecom_corp_id" />
      </el-form-item>
      <el-form-item label="Corp Secret">
        <el-input v-model="config.wecom_corp_secret" type="password" show-password />
      </el-form-item>
      <el-form-item label="Callback Token">
        <el-input v-model="config.wecom_token" />
      </el-form-item>
      <el-form-item label="Encoding AES Key">
        <el-input v-model="config.wecom_encoding_aes_key" />
      </el-form-item>
      <el-form-item label="Agent ID">
        <el-input v-model.number="config.wecom_agent_id" type="number" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const config = ref({
  ai_api_base_url: '',
  ai_api_key: '',
  ai_model: '',
  wecom_corp_id: '',
  wecom_corp_secret: '',
  wecom_token: '',
  wecom_encoding_aes_key: '',
  wecom_agent_id: 0,
});

onMounted(async () => {
  try {
    const res = await axios.get('/admin/configs');
    // Assuming API returns configs
  } catch (e) {
    console.error('Failed to load config:', e);
  }
});

const saveConfig = async () => {
  try {
    await axios.post('/admin/configs', config.value);
    ElMessage.success('配置已保存');
  } catch (e) {
    ElMessage.error('保存失败');
  }
};
</script>
