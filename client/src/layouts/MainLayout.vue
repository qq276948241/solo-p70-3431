<template>
  <el-container class="main-layout">
    <el-aside class="sidebar" :width="isCollapse ? '64px' : '220px'">
      <div class="logo-bar">
        <span class="logo-emoji">🥬</span>
        <transition name="fade">
          <span v-if="!isCollapse" class="logo-text">团长后台</span>
        </transition>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#1f3a20"
        text-color="#c8e6c9"
        active-text-color="#fff"
        class="side-menu"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-button
          text
          :icon="isCollapse ? 'Expand' : 'Fold'"
          @click="isCollapse = !isCollapse"
          style="color: #a5d6a7;"
        >
          {{ isCollapse ? '' : '收起菜单' }}
        </el-button>
      </div>
    </el-aside>

    <el-container>
      <el-header class="top-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tag type="success" effect="light" size="default" class="community-tag">
            <el-icon><OfficeBuilding /></el-icon>
            <span>{{ userStore.leader?.community_name || '未设置小区' }}</span>
          </el-tag>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-area">
              <el-avatar :size="36" style="background: #67c23a;">
                {{ (userStore.leaderName || '?').charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <div class="user-name">{{ userStore.leaderName || '团长' }}</div>
                <div class="user-role">{{ userStore.leader?.username }}</div>
              </div>
              <el-icon class="arrow-down"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled, Goods, List, OfficeBuilding, ArrowDown,
  User, SwitchButton, Expand, Fold
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)

const menuItems = [
  { path: '/dashboard', title: '工作台', icon: 'HomeFilled' },
  { path: '/products', title: '商品管理', icon: 'Goods' },
  { path: '/orders', title: '订单管理', icon: 'List' }
]

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '')

function handleCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定退出',
      cancelButtonText: '取消'
    }).then(() => {
      userStore.logout()
      ElMessage.success('已安全退出')
      router.replace('/login')
    }).catch(() => {})
  } else if (cmd === 'profile') {
    ElMessage.info('个人信息模块开发中')
  }
}
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  width: 100%;
}

.sidebar {
  background: #1f3a20;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.logo-bar {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;

  .logo-emoji {
    font-size: 28px;
    flex-shrink: 0;
  }

  .logo-text {
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
    white-space: nowrap;
  }
}

.side-menu {
  flex: 1;
  border-right: none;
  padding-top: 12px;

  :deep(.el-menu-item) {
    height: 50px;
    line-height: 50px;
    margin: 4px 10px;
    border-radius: 8px;

    &.is-active {
      background: linear-gradient(90deg, #67c23a, #85ce61) !important;
    }

    &:hover {
      background: rgba(103, 194, 58, 0.2) !important;
    }
  }
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.top-header {
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.community-tag {
  padding: 4px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }
}

.user-info {
  line-height: 1.2;

  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .user-role {
    font-size: 12px;
    color: #909399;
  }
}

.arrow-down {
  font-size: 12px;
  color: #c0c4cc;
}

.main-content {
  background: #f5f7fa;
  padding: 0;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
