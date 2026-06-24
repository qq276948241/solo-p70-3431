<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">工作台</h2>
        <p class="page-subtitle">你好，{{ userStore.leaderName }}！今天也是充满活力的一天 🌿</p>
      </div>
      <el-button type="primary" size="large" :icon="Plus" @click="goAddProduct">
        新增开团商品
      </el-button>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="stat in statsList" :key="stat.key">
        <div class="stat-card" :style="{ borderLeft: `4px solid ${stat.color}` }">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value" :style="{ color: stat.color }">
            {{ stat.prefix }}{{ stat.value }}{{ stat.suffix }}
          </div>
          <div class="stat-sub">{{ stat.tip }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :md="16">
        <div class="card section-card">
          <div class="section-header">
            <h3 class="section-title"><el-icon :size="18" color="#67c23a"><Bell /></el-icon>今日开团商品</h3>
            <el-button type="primary" link @click="router.push('/products')">查看全部 →</el-button>
          </div>

          <el-table :data="todayProducts" v-loading="productLoading" empty-text="今日暂无开团商品，快去新增吧~" stripe>
            <el-table-column label="商品" min-width="220">
              <template #default="{ row }">
                <div class="product-cell">
                  <div class="product-img">
                    {{ row.image ? '' : '🥬' }}
                  </div>
                  <div class="product-info">
                    <div class="product-name">{{ row.name }}</div>
                    <div class="product-meta">
                      <el-tag size="small" type="danger" effect="light" v-if="row.is_expired">已截团</el-tag>
                      <el-tag size="small" type="warning" effect="light" v-else-if="row.status==='offline'">已下架</el-tag>
                      <el-tag size="small" type="success" effect="light" v-else>开团中</el-tag>
                      <span class="deadline" :class="{ expired: row.is_expired }">
                        截止 {{ formatTime(row.deadline) }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100" align="center">
              <template #default="{ row }">
                <span class="price">¥{{ row.price.toFixed(2) }}</span>
                <span class="unit">/{{ row.unit }}</span>
              </template>
            </el-table-column>
            <el-table-column label="起订" width="80" align="center">
              <template #default="{ row }">{{ row.min_quantity }}{{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="剩余库存" width="100" align="center">
              <template #default="{ row }">
                <el-progress :percentage="Math.min(row.stock / 50 * 100, 100)" :stroke-width="8" />
                <div class="stock-text">{{ row.stock }}{{ row.unit }}</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="goAddOrder(row)" :disabled="row.is_expired || row.status==='offline'">
                  快捷下单
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <el-col :md="8">
        <div class="card section-card" style="margin-bottom: 20px;">
          <div class="section-header">
            <h3 class="section-title"><el-icon :size="18" color="#e6a23c"><Warning /></el-icon>待处理</h3>
          </div>

          <div class="todo-list">
            <div class="todo-item" @click="goOrders('pending_payment')">
              <div class="todo-icon pp">
                <el-icon><Wallet /></el-icon>
              </div>
              <div class="todo-text">
                <div class="todo-label">待付款订单</div>
                <div class="todo-desc">请提醒客户完成支付</div>
              </div>
              <el-badge :value="stats.pending_payment" :max="99" class="todo-badge" />
            </div>

            <div class="todo-item" @click="goOrders('pending_pickup')">
              <div class="todo-icon pu">
                <el-icon><Box /></el-icon>
              </div>
              <div class="todo-text">
                <div class="todo-label">待提货订单</div>
                <div class="todo-desc">客户到店后标记提货</div>
              </div>
              <el-badge :value="stats.pending_pickup" :max="99" class="todo-badge" type="warning" />
            </div>
          </div>
        </div>

        <div class="card section-card">
          <div class="section-header">
            <h3 class="section-title"><el-icon :size="18" color="#409eff"><DataLine /></el-icon>最近订单</h3>
            <el-button type="primary" link @click="router.push('/orders')">全部订单 →</el-button>
          </div>

          <el-table :data="recentOrders" v-loading="orderLoading" size="small" empty-text="暂无订单">
            <el-table-column label="商品" prop="product_name" show-overflow-tooltip />
            <el-table-column label="数量" width="70" align="center" prop="quantity" />
            <el-table-column label="金额" width="90" align="center">
              <template #default="{ row }">
                <span class="price-sm">¥{{ row.total_amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="statusTag(row.status).type">
                  {{ statusTag(row.status).text }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <order-dialog
      v-model="orderDialogVisible"
      :product="selectedProduct"
      @success="onOrderSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Bell, Warning, Wallet, Box, DataLine
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { getProducts } from '@/api/products'
import { getOrders, getOrderStats } from '@/api/orders'
import OrderDialog from '@/components/OrderDialog.vue'

const router = useRouter()
const userStore = useUserStore()

const stats = reactive({
  pending_payment: 0,
  pending_pickup: 0,
  completed: 0,
  total_amount: 0
})

const todayProducts = ref([])
const recentOrders = ref([])
const productLoading = ref(false)
const orderLoading = ref(false)

const orderDialogVisible = ref(false)
const selectedProduct = ref(null)

const statsList = computed(() => ([
  { key: 'today', label: '今日开团商品', value: todayProducts.value.length, suffix: ' 件', prefix: '', color: '#67c23a', tip: '今日新上架的团购商品' },
  { key: 'pending_payment', label: '待付款', value: stats.pending_payment, suffix: ' 单', prefix: '', color: '#f56c6c', tip: '客户未完成支付' },
  { key: 'pending_pickup', label: '待提货', value: stats.pending_pickup, suffix: ' 单', prefix: '', color: '#e6a23c', tip: '等待客户到店自提' },
  { key: 'total_amount', label: '累计成交', value: stats.total_amount.toFixed(2), suffix: '', prefix: '¥ ', color: '#409eff', tip: '已完成+待提货订单总额' }
]))

function formatTime(iso) {
  return dayjs(iso).format('MM-DD HH:mm')
}

function statusTag(status) {
  const map = {
    pending_payment: { type: 'danger', text: '待付款' },
    pending_pickup: { type: 'warning', text: '待提货' },
    completed: { type: 'success', text: '已完成' }
  }
  return map[status] || { type: 'info', text: status }
}

function goAddProduct() {
  router.push('/products?action=add')
}

function goAddOrder(product) {
  selectedProduct.value = product
  orderDialogVisible.value = true
}

function goOrders(status) {
  router.push({ path: '/orders', query: { status } })
}

function onOrderSuccess() {
  loadStats()
  loadRecentOrders()
}

async function loadStats() {
  try {
    const res = await getOrderStats()
    Object.assign(stats, res.data)
  } catch (e) {}
}

async function loadTodayProducts() {
  productLoading.value = true
  try {
    const res = await getProducts({ only_today: 1, page_size: 10 })
    todayProducts.value = res.data.list
    // 如果今日没有，取最近活跃的
    if (todayProducts.value.length === 0) {
      const res2 = await getProducts({ status: 'active', page_size: 5 })
      todayProducts.value = res2.data.list
    }
  } finally {
    productLoading.value = false
  }
}

async function loadRecentOrders() {
  orderLoading.value = true
  try {
    const res = await getOrders({ page_size: 5 })
    recentOrders.value = res.data.list
  } finally {
    orderLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadTodayProducts()
  loadRecentOrders()
})
</script>

<style lang="scss" scoped>
.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin-top: 6px;
}

.stats-row {
  margin-bottom: 20px;
}

.content-row {
  margin-bottom: 20px;
}

.section-card {
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f2f5;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-cell {
  display: flex;
  gap: 12px;
  align-items: center;
}

.product-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.product-info {
  min-width: 0;
  flex: 1;

  .product-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.deadline {
  font-size: 12px;
  color: #909399;

  &.expired {
    color: #f56c6c;
  }
}

.price {
  color: #f56c6c;
  font-weight: 700;
  font-size: 15px;
}

.unit {
  color: #909399;
  font-size: 12px;
}

.stock-text {
  font-size: 12px;
  color: #606266;
  margin-top: 2px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    border-color: #67c23a;
    background: #f0f9eb;
    transform: translateX(4px);
  }
}

.todo-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;

  &.pp { background: linear-gradient(135deg, #f56c6c, #f78989); }
  &.pu { background: linear-gradient(135deg, #e6a23c, #ebb563); }
}

.todo-text {
  flex: 1;
  min-width: 0;

  .todo-label {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 2px;
  }

  .todo-desc {
    font-size: 12px;
    color: #909399;
  }
}

.price-sm {
  color: #f56c6c;
  font-weight: 600;
  font-size: 13px;
}
</style>
