<template>
  <el-dialog
    v-model="visible"
    :title="product ? `为【${product.name}】下单` : '下单'"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="商品信息">
        <div v-if="product" class="product-summary">
          <div class="ps-img">
            <img v-if="product.image" :src="product.image" />
            <span v-else>🥬</span>
          </div>
          <div class="ps-info">
            <div class="ps-name">{{ product.name }}</div>
            <div class="ps-meta">
              <span class="price">¥{{ product.price.toFixed(2) }}</span>
              <span class="unit">/{{ product.unit }}</span>
              <span class="divider">·</span>
              <span>起订 {{ product.min_quantity }}{{ product.unit }}</span>
              <span class="divider">·</span>
              <span>库存 {{ product.stock }}{{ product.unit }}</span>
            </div>
            <div class="ps-deadline">
              <el-icon><Clock /></el-icon>
              <span>截团时间：{{ formatTime(product.deadline) }}</span>
              <el-tag v-if="product.is_expired" size="small" type="danger" style="margin-left: 8px;">已过截团</el-tag>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="购买数量" prop="quantity">
        <el-input-number
          v-model="form.quantity"
          :min="product?.min_quantity || 1"
          :max="product?.stock || 999"
          :step="1"
          style="width: 100%;"
          @change="calcTotal"
        />
        <div class="unit-label">（{{ product?.unit || '份' }}）</div>
      </el-form-item>

      <el-form-item label="客户姓名" prop="customer_name">
        <el-input v-model="form.customer_name" placeholder="请输入客户姓名" maxlength="20" />
      </el-form-item>

      <el-form-item label="联系电话" prop="customer_phone">
        <el-input v-model="form.customer_phone" placeholder="请输入手机号码" maxlength="11" />
      </el-form-item>

      <el-form-item label="配送地址">
        <el-input v-model="form.customer_address" type="textarea" :rows="2" placeholder="楼栋门牌号等（选填）" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="其他要求（选填）" />
      </el-form-item>

      <el-form-item label="订单总额">
        <div class="total-row">
          <span class="total-label">合计</span>
          <span class="total-price">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确认下单
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { createOrder, payOrder } from '@/api/orders'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const formRef = ref(null)
const submitting = ref(false)

const defaultForm = () => ({
  quantity: props.product?.min_quantity || 1,
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  remark: ''
})

const form = reactive(defaultForm())

const rules = {
  quantity: [{ required: true, message: '请填写数量', trigger: 'blur' }],
  customer_name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  customer_phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码', trigger: 'blur' }
  ]
}

const totalAmount = computed(() => {
  if (!props.product) return 0
  return Number(((props.product.price || 0) * (form.quantity || 0)).toFixed(2))
})

function calcTotal() {}

function formatTime(iso) {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    const res = await createOrder({
      product_id: props.product.id,
      quantity: form.quantity,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_address: form.customer_address.trim(),
      remark: form.remark.trim()
    })

    await ElMessage({
      message: '下单成功！现在模拟支付...',
      type: 'success',
      duration: 1200
    })

    try {
      await payOrder(res.data.id)
      ElMessage.success('支付成功！订单已进入待提货状态')
    } catch (e) {
      ElMessage.warning('下单成功，支付环节可稍后在订单页完成')
    }

    emit('success')
    visible.value = false
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  Object.assign(form, defaultForm())
  formRef.value?.clearValidate()
}

watch(() => props.product, (val) => {
  if (val) {
    form.quantity = val.min_quantity || 1
  }
})
</script>

<style lang="scss" scoped>
.product-summary {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: #f7faf5;
  border-radius: 10px;
  border: 1px solid #e5f2d9;
  width: 100%;
}

.ps-img {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
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

.ps-info {
  flex: 1;
  min-width: 0;

  .ps-name {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 6px;
  }

  .ps-meta {
    font-size: 13px;
    color: #606266;
    margin-bottom: 6px;

    .price { color: #f56c6c; font-weight: 700; font-size: 16px; }
    .unit { color: #909399; }
    .divider { color: #dcdfe6; margin: 0 6px; }
  }

  .ps-deadline {
    font-size: 12px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.unit-label {
  display: inline-block;
  margin-left: 10px;
  color: #909399;
  font-size: 13px;
  line-height: 32px;
  vertical-align: middle;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff8e6, #fff3cd);
  border-radius: 8px;
  width: 100%;

  .total-label {
    font-size: 14px;
    color: #e6a23c;
    font-weight: 500;
  }

  .total-price {
    font-size: 22px;
    font-weight: 700;
    color: #f56c6c;
  }
}
</style>
