<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="bg-decor decor-1">🥬</div>
      <div class="bg-decor decor-2">🍅</div>
      <div class="bg-decor decor-3">🥕</div>
      <div class="bg-decor decor-4">🍎</div>
      <div class="bg-decor decor-5">🥚</div>
      <div class="bg-decor decor-6">🍊</div>
    </div>

    <div class="login-card">
      <div class="brand-area">
        <div class="logo-circle">
          <span class="logo-emoji">🥬</span>
        </div>
        <h1 class="brand-title">社区生鲜团购</h1>
        <p class="brand-subtitle">团长管理后台</p>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs" stretch>
        <el-tab-pane label="登 录" name="login">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" size="large" placeholder="请输入账号" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" size="large" type="password" placeholder="请输入密码"
                :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
            <div class="test-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>测试账号：leader01 / 123456</span>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注 册" name="register">
          <el-form ref="regFormRef" :model="regForm" :rules="regRules" class="login-form">
            <el-form-item prop="username">
              <el-input v-model="regForm.username" size="large" placeholder="设置登录账号" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="regForm.password" size="large" type="password" placeholder="设置密码（至少6位）"
                :prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="regForm.confirmPassword" size="large" type="password" placeholder="确认密码"
                :prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item prop="real_name">
              <el-input v-model="regForm.real_name" size="large" placeholder="团长姓名（选填）" :prefix-icon="Avatar" />
            </el-form-item>
            <el-form-item prop="community_name">
              <el-input v-model="regForm.community_name" size="large" placeholder="服务小区名称（选填）"
                :prefix-icon="OfficeBuilding" />
            </el-form-item>
            <el-button type="success" size="large" class="submit-btn" :loading="regLoading" @click="handleRegister">
              立即注册
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Avatar, OfficeBuilding, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const regLoading = ref(false)
const loginFormRef = ref(null)
const regFormRef = ref(null)

const loginForm = reactive({
  username: '',
  password: ''
})

const regForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  real_name: '',
  community_name: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const validateConfirm = (rule, value, callback) => {
  if (value !== regForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const regRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度3-20位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

async function handleLogin() {
  await loginFormRef.value.validate()
  loading.value = true
  try {
    await userStore.login(loginForm.username.trim(), loginForm.password)
    ElMessage.success('登录成功，欢迎回来！')
    const redirect = route.query.redirect || '/dashboard'
    router.replace(redirect)
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  await regFormRef.value.validate()
  regLoading.value = true
  try {
    await userStore.register({
      username: regForm.username.trim(),
      password: regForm.password,
      real_name: regForm.real_name,
      community_name: regForm.community_name
    })
    await ElMessageBox.success('注册成功！是否立即登录？', '提示', {
      confirmButtonText: '去登录',
      showCancelButton: true,
      cancelButtonText: '继续注册'
    })
    loginForm.username = regForm.username
    loginForm.password = regForm.password
    activeTab.value = 'login'
  } catch (e) {
    // handled
  } finally {
    regLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-decor {
  position: absolute;
  font-size: 80px;
  opacity: 0.25;
  animation: floatY 6s ease-in-out infinite;

  &.decor-1 { top: 8%; left: 6%; animation-delay: 0s; }
  &.decor-2 { top: 15%; right: 10%; font-size: 100px; animation-delay: 1s; }
  &.decor-3 { bottom: 20%; left: 8%; font-size: 90px; animation-delay: 2s; }
  &.decor-4 { top: 50%; right: 5%; animation-delay: 1.5s; }
  &.decor-5 { bottom: 10%; right: 15%; font-size: 110px; animation-delay: 0.5s; }
  &.decor-6 { top: 40%; left: 3%; font-size: 70px; animation-delay: 2.5s; }
}

@keyframes floatY {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(10deg); }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 440px;
  max-width: 92%;
  background: #fff;
  border-radius: 20px;
  padding: 40px 40px 30px;
  box-shadow: 0 20px 60px rgba(103, 194, 58, 0.25);
}

.brand-area {
  text-align: center;
  margin-bottom: 28px;

  .logo-circle {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #85ce61, #67c23a);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(103, 194, 58, 0.4);
  }

  .logo-emoji {
    font-size: 46px;
  }

  .brand-title {
    font-size: 26px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 6px;
    letter-spacing: 2px;
  }

  .brand-subtitle {
    font-size: 14px;
    color: #909399;
    letter-spacing: 1px;
  }
}

.login-tabs {
  :deep(.el-tabs__item) {
    font-size: 16px;
    font-weight: 500;
    height: 48px;
  }

  :deep(.el-tabs__active-bar) {
    height: 3px;
    background: #67c23a;
  }
}

.login-form {
  margin-top: 20px;

  .submit-btn {
    width: 100%;
    margin-top: 8px;
    height: 46px;
    font-size: 16px;
    letter-spacing: 4px;
    font-weight: 600;
  }
}

.test-tip {
  margin-top: 16px;
  padding: 10px 14px;
  background: #f0f9eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #67c23a;
}
</style>
