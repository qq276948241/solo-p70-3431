<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">商品管理</h2>
        <p class="page-subtitle">管理团购商品、设置截团时间和起订量</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Upload" @click="importDemo">导入示例商品</el-button>
        <el-button type="primary" size="large" :icon="Plus" @click="openCreate">
          新增开团商品
        </el-button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-radio-group v-model="filterStatus" @change="loadList(1)">
          <el-radio-button label="active">开团中</el-radio-button>
          <el-radio-button label="offline">已下架</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>

        <el-switch v-model="onlyToday" active-text="仅今日开团" @change="loadList(1)" />

        <div class="filter-spacer" />

        <el-input
          v-model="keyword"
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px;"
          @keyup.enter="loadList(1)"
          @clear="loadList(1)"
        />
      </div>

      <el-table
        :data="filteredList"
        v-loading="loading"
        stripe
        style="width: 100%;"
        empty-text="暂无商品，点击右上角新增第一个开团商品吧~"
      >
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="product-cell">
              <div class="product-img">
                <img v-if="row.image" :src="row.image" />
                <span v-else>{{ pickEmoji(row.name) }}</span>
              </div>
              <div class="product-info">
                <div class="product-name">
                  {{ row.name }}
                  <el-tag v-if="row.status==='active' && row.is_expired" size="small" type="danger" effect="dark" style="margin-left:8px;">
                    已截团
                  </el-tag>
                  <el-tag v-else-if="row.status==='active'" size="small" type="success" effect="light" style="margin-left:8px;">
                    开团中
                  </el-tag>
                  <el-tag v-else size="small" type="info" effect="light" style="margin-left:8px;">
                    已下架
                  </el-tag>
                </div>
                <div class="product-desc" v-if="row.description">{{ row.description }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="单价" width="110" align="center">
          <template #default="{ row }">
            <div class="price-box">
              <span class="price">¥{{ row.price.toFixed(2) }}</span>
              <span class="unit">/{{ row.unit }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="起订量" width="90" align="center">
          <template #default="{ row }">{{ row.min_quantity }}{{ row.unit }}</template>
        </el-table-column>

        <el-table-column label="库存" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock <= 10 }">{{ row.stock }}{{ row.unit }}</span>
          </template>
        </el-table-column>

        <el-table-column label="截团时间" width="180" align="center">
          <template #default="{ row }">
            <div class="deadline-cell" :class="{ expired: row.is_expired }">
              <div class="countdown" v-if="!row.is_expired">
                <CountdownTimer :deadline="row.deadline" />
              </div>
              <div class="deadline-time">{{ formatTime(row.deadline) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openOrder(row)"
              :disabled="row.status==='offline' || row.is_expired">
              下单
            </el-button>
            <el-button size="small" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status==='active'"
              size="small"
              type="warning"
              link
              @click="handleOffline(row)"
            >下架</el-button>
            <el-button
              v-else
              size="small"
              type="success"
              link
              @click="handleOnline(row)"
              :disabled="row.is_expired"
            >上架</el-button>
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

    <product-dialog
      v-model="productDialogVisible"
      :edit-data="editingProduct"
      @success="onProductSuccess"
    />

    <order-dialog
      v-model="orderDialogVisible"
      :product="selectedProduct"
      @success="onOrderSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Upload } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getProducts, offlineProduct, onlineProduct, createProduct } from '@/api/products'
import ProductDialog from '@/components/ProductDialog.vue'
import OrderDialog from '@/components/OrderDialog.vue'
import CountdownTimer from '@/components/CountdownTimer.vue'

const route = useRoute()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('active')
const onlyToday = ref(false)
const keyword = ref('')

const productDialogVisible = ref(false)
const editingProduct = ref(null)
const orderDialogVisible = ref(false)
const selectedProduct = ref(null)

const emojiList = ['🥬', '🍅', '🥕', '🍎', '🥚', '🍊', '🥒', '🍌', '🥔', '🌽', '🥦', '🍇']
function pickEmoji(name) {
  if (!name) return '🥬'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return emojiList[Math.abs(hash) % emojiList.length]
}

function formatTime(iso) {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

const filteredList = computed(() => {
  if (!keyword.value) return list.value
  const kw = keyword.value.toLowerCase()
  return list.value.filter(p => p.name.toLowerCase().includes(kw))
})

async function loadList(p = page.value) {
  page.value = p
  loading.value = true
  try {
    const res = await getProducts({
      status: filterStatus.value,
      only_today: onlyToday.value ? 1 : 0,
      page: p,
      page_size: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingProduct.value = null
  productDialogVisible.value = true
}

function openEdit(row) {
  editingProduct.value = { ...row }
  productDialogVisible.value = true
}

function openOrder(row) {
  selectedProduct.value = row
  orderDialogVisible.value = true
}

async function handleOffline(row) {
  await ElMessageBox.confirm(`确定下架【${row.name}】吗？下架后将无法下单`, '确认下架', {
    type: 'warning', confirmButtonText: '确定下架'
  })
  await offlineProduct(row.id)
  ElMessage.success('已下架')
  loadList()
}

async function handleOnline(row) {
  await onlineProduct(row.id)
  ElMessage.success('已上架')
  loadList()
}

async function importDemo() {
  await ElMessageBox.confirm('将为您导入5条示例商品数据，确定吗？', '导入示例', {
    type: 'info'
  })
  const demos = [
    { name: '新鲜有机小白菜', price: 3.5, unit: '斤', min_quantity: 2, stock: 100, description: '基地直采，当日新鲜送达', deadlineHours: 8 },
    { name: '红富士苹果（大果）', price: 5.9, unit: '斤', min_quantity: 3, stock: 80, description: '脆甜多汁，陕西洛川产地', deadlineHours: 12 },
    { name: '农家散养土鸡蛋', price: 1.5, unit: '枚', min_quantity: 10, stock: 300, description: '谷饲散养，蛋黄绵密', deadlineHours: 6 },
    { name: '山东沙土胡萝卜', price: 2.8, unit: '斤', min_quantity: 3, stock: 120, description: '脆甜爽口，生吃炒菜皆宜', deadlineHours: 24 },
    { name: '海南千禧小番茄', price: 8.8, unit: '盒', min_quantity: 1, stock: 50, description: '每盒约500g，爆汁甜美', deadlineHours: 10 }
  ]
  for (const d of demos) {
    try {
      await createProduct({
        name: d.name, price: d.price, unit: d.unit,
        min_quantity: d.min_quantity, stock: d.stock,
        description: d.description,
        deadline: dayjs().add(d.deadlineHours, 'hour').toISOString()
      })
    } catch (e) {}
  }
  ElMessage.success('示例商品导入成功！')
  loadList()
}

function onProductSuccess() { loadList() }
function onOrderSuccess() { loadList() }

onMounted(() => {
  loadList()
  if (route.query.action === 'add') {
    setTimeout(() => openCreate(), 300)
  }
})
</script>

<style lang="scss" scoped>
.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin-top: 6px;
}

.header-actions { display: flex; gap: 10px; }

.filter-spacer { flex: 1; }

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
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  span {
    line-height: 1;
  }
}

.product-info {
  min-width: 0;
  flex: 1;

  .product-name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
  }

  .product-desc {
    font-size: 12px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.price-box {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;

  .price { color: #f56c6c; font-weight: 700; font-size: 16px; }
  .unit { color: #909399; font-size: 12px; }
}

.low-stock { color: #e6a23c; font-weight: 600; }

.deadline-cell {
  .countdown {
    font-size: 12px;
    color: #67c23a;
    font-weight: 600;
    margin-bottom: 3px;
  }

  .deadline-time {
    font-size: 12px;
    color: #909399;
  }

  &.expired {
    .countdown { color: #f56c6c; }
    .deadline-time { color: #f56c6c; }
  }
}

.pagination-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
