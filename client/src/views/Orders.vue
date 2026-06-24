<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">订单管理</h2>
        <p class="page-subtitle">查看并处理所有团购订单</p>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="s in statTabs" :key="s.status" @click="switchStatus(s.status)">
        <div class="stat-card-clickable" :class="{ active: currentStatus === s.status }" :style="{ borderLeft: `4px solid ${s.color}` }">
          <div class="stat-label">
            <el-icon><component :is="s.icon" /></el-icon>
            <span>{{ s.label }}</span>
          </div>
          <div class="stat-value-row">
            <span class="stat-value" :style="{ color: s.color }">{{ statsMap[s.status] || 0 }}</span>
            <span class="stat-unit">单</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="card">
      <div class="filter-bar">
        <el-radio-group v-model="currentStatus" @change="loadList(1)" size="default">
          <el-radio-button label="all">全部订单</el-radio-button>
          <el-radio-button label="pending_payment">待付款</el-radio-button>
          <el-radio-button label="pending_pickup">待提货</el-radio-button>
          <el-radio-button label="completed">已完成</el-radio-button>
        </el-radio-group>

        <div class="filter-spacer" />

        <el-input
          v-model="keyword"
          placeholder="搜索商品名/客户名/电话"
          :prefix-icon="Search"
          clearable
          style="width: 260px;"
          @keyup.enter="loadList(1)"
          @clear="loadList(1)"
        />
      </div>

      <el-table
        :data="filteredList"
        v-loading="loading"
        stripe
        row-key="id"
        style="width: 100%;"
        :expand-row-keys="expandKeys"
        @expand-change="onExpandChange"
        empty-text="暂无订单"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-panel">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="订单编号">{{ row.id }}</el-descriptions-item>
                <el-descriptions-item label="下单时间">{{ formatTime(row.created_at) }}</el-descriptions-item>
                <el-descriptions-item label="客户姓名">{{ row.customer_name }}</el-descriptions-item>
                <el-descriptions-item label="联系电话">
                  <a :href="`tel:${row.customer_phone}`" class="phone-link">{{ row.customer_phone }}</a>
                  <el-button size="small" text type="primary" style="margin-left: 8px;" @click="copyPhone(row.customer_phone)">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                </el-descriptions-item>
                <el-descriptions-item label="配送地址" :span="2">{{ row.customer_address || '未填写' }}</el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">{{ row.remark || '无' }}</el-descriptions-item>
                <el-descriptions-item label="支付时间">{{ row.paid_at ? formatTime(row.paid_at) : '-' }}</el-descriptions-item>
                <el-descriptions-item label="提货时间">{{ row.picked_at ? formatTime(row.picked_at) : '-' }}</el-descriptions-item>
              </el-descriptions>

              <div class="expand-actions" v-if="row.status==='pending_payment' || row.status==='pending_pickup'">
                <el-button v-if="row.status==='pending_payment'" type="primary" :icon="Wallet" @click="handlePay(row)">
                  模拟支付
                </el-button>
                <el-button v-if="row.status==='pending_pickup'" type="success" :icon="Box" size="large" @click="handlePickup(row)">
                  确认提货
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="订单号" width="180" prop="id" show-overflow-tooltip />

        <el-table-column label="商品信息" min-width="220">
          <template #default="{ row }">
            <div class="product-cell">
              <div class="p-name">{{ row.product_name }}</div>
              <div class="p-meta">
                <span class="p-price">¥{{ row.product_price.toFixed(2) }}</span>
                <span class="p-mul">×</span>
                <span class="p-qty">{{ row.quantity }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="客户" width="140">
          <template #default="{ row }">
            <div class="customer-cell">
              <div class="c-name">
                <el-avatar :size="28" style="background:#85ce61;width:28px;height:28px;font-size:13px;">
                  {{ row.customer_name.charAt(0) }}
                </el-avatar>
                <span>{{ row.customer_name }}</span>
              </div>
              <div class="c-phone">{{ row.customer_phone }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="订单金额" width="120" align="center">
          <template #default="{ row }">
            <span class="total-amount">¥{{ row.total_amount.toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <div class="status-cell" :class="row.status">
              <span class="status-dot" />
              <span>{{ statusText(row.status) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="下单时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="toggleExpand(row)">详情</el-button>
            <el-button v-if="row.status==='pending_payment'" size="small" type="primary" link @click="handlePay(row)">
              模拟支付
            </el-button>
            <el-button v-if="row.status==='pending_pickup'" size="small" type="success" link @click="handlePickup(row)">
              标记提货
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-area">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Wallet, Box, CopyDocument, Money, ShoppingCart, Goods, CircleCheck } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getOrders, getOrderStats, payOrder, pickupOrder } from '@/api/orders'

const route = useRoute()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const currentStatus = ref(route.query.status || 'all')
const keyword = ref('')
const expandKeys = ref([])

const statsMap = reactive({
  all: 0,
  pending_payment: 0,
  pending_pickup: 0,
  completed: 0
})

const statTabs = [
  { status: 'all', label: '全部订单', icon: 'ShoppingCart', color: '#409eff' },
  { status: 'pending_payment', label: '待付款', icon: 'Money', color: '#f56c6c' },
  { status: 'pending_pickup', label: '待提货', icon: 'Goods', color: '#e6a23c' },
  { status: 'completed', label: '已完成', icon: 'CircleCheck', color: '#67c23a' }
]

const filteredList = computed(() => {
  if (!keyword.value) return list.value
  const kw = keyword.value.toLowerCase()
  return list.value.filter(o =>
    o.product_name.toLowerCase().includes(kw) ||
    o.customer_name.toLowerCase().includes(kw) ||
    o.customer_phone.includes(kw)
  )
})

function formatTime(iso) {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

function statusText(s) {
  return { pending_payment: '待付款', pending_pickup: '待提货', completed: '已完成' }[s] || s
}

function switchStatus(s) {
  currentStatus.value = s
  loadList(1)
}

function toggleExpand(row) {
  const idx = expandKeys.value.indexOf(row.id)
  if (idx > -1) expandKeys.value.splice(idx, 1)
  else expandKeys.value.push(row.id)
}

function onExpandChange(row, expanded) {
  if (expanded && !expandKeys.value.includes(row.id)) expandKeys.value.push(row.id)
  else if (!expanded) expandKeys.value = expandKeys.value.filter(k => k !== row.id)
}

function copyPhone(phone) {
  navigator.clipboard.writeText(phone)
  ElMessage.success('电话号码已复制')
}

async function loadList(p = page.value) {
  page.value = p
  loading.value = true
  try {
    const res = await getOrders({
      status: currentStatus.value,
      page: p,
      page_size: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await getOrderStats()
    const d = res.data
    statsMap.pending_payment = d.pending_payment
    statsMap.pending_pickup = d.pending_pickup
    statsMap.completed = d.completed
    statsMap.all = d.pending_payment + d.pending_pickup + d.completed
  } catch (e) {}
}

async function handlePay(row) {
  await ElMessageBox.confirm(`确认模拟支付订单【${row.id}】¥${row.total_amount.toFixed(2)}？`, '模拟支付', {
    type: 'warning', confirmButtonText: '确认支付'
  })
  try {
    await payOrder(row.id)
    ElMessage.success('支付成功！订单已进入待提货')
    await Promise.all([loadList(), loadStats()])
  } catch (e) {}
}

async function handlePickup(row) {
  await ElMessageBox.confirm(
    `确认客户【${row.customer_name}】已提货？\n商品：${row.product_name} × ${row.quantity}`,
    '确认提货',
    { type: 'success', confirmButtonText: '确认提货' }
  )
  try {
    await pickupOrder(row.id)
    ElMessage.success('已标记提货完成')
    await Promise.all([loadList(), loadStats()])
  } catch (e) {}
}

watch(() => route.query.status, (val) => {
  if (val) {
    currentStatus.value = val
    loadList(1)
  }
})

onMounted(() => {
  loadStats()
  loadList()
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

.stat-card-clickable {
  background: #fff;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }

  &.active {
    border-color: #67c23a;
    background: #f0f9eb;
  }

  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #606266;
    margin-bottom: 8px;
  }

  .stat-value-row {
    display: flex;
    align-items: baseline;
    gap: 4px;

    .stat-value {
      font-size: 26px;
      font-weight: 700;
    }

    .stat-unit {
      font-size: 13px;
      color: #909399;
    }
  }
}

.filter-spacer { flex: 1; }

.expand-panel {
  padding: 10px 20px 20px 50px;

  .expand-actions {
    margin-top: 16px;
    display: flex;
    gap: 12px;
  }
}

.phone-link {
  color: #409eff;
  text-decoration: none;
}

.product-cell {
  .p-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }

  .p-meta {
    font-size: 12px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 4px;

    .p-price { color: #f56c6c; }
    .p-mul { color: #c0c4cc; }
  }
}

.customer-cell {
  .c-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 2px;
  }

  .c-phone {
    font-size: 12px;
    color: #909399;
    padding-left: 34px;
  }
}

.total-amount {
  color: #f56c6c;
  font-weight: 700;
  font-size: 15px;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  &.pending_payment {
    background: #fef0f0;
    color: #f56c6c;
    .status-dot { background: #f56c6c; }
  }

  &.pending_pickup {
    background: #fdf6ec;
    color: #e6a23c;
    .status-dot { background: #e6a23c; }
  }

  &.completed {
    background: #f0f9eb;
    color: #67c23a;
    .status-dot { background: #67c23a; }
  }
}

.pagination-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
