<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑商品' : '新增开团商品'"
    width="580px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="商品名称" prop="name">
        <el-input v-model="form.name" placeholder="如：新鲜有机小白菜" maxlength="50" />
      </el-form-item>

      <el-form-item label="商品图片">
        <div class="upload-area">
          <div class="preview-box" v-if="form.image">
            <img :src="form.image" class="preview-img" @click="previewImage" />
            <div class="preview-mask">
              <el-icon size="18" @click.stop="previewImage"><ZoomIn /></el-icon>
              <el-icon size="18" style="margin-left:10px;" @click.stop="removeImage"><Delete /></el-icon>
            </div>
          </div>
          <el-upload
            v-else
            class="uploader"
            drag
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="handleUpload"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          >
            <el-icon class="uploader-icon" size="28"><Plus /></el-icon>
            <div class="uploader-text">点击或拖拽上传</div>
            <div class="uploader-tip">支持 jpg/png/webp，≤5MB</div>
          </el-upload>
          <div class="uploading-tip" v-if="uploading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>上传中...</span>
          </div>
        </div>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="单价" prop="price">
            <el-input-number v-model="form.price" :min="0.01" :precision="2" :step="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计量单位" prop="unit">
            <el-select v-model="form.unit" style="width: 100%;">
              <el-option label="斤" value="斤" />
              <el-option label="份" value="份" />
              <el-option label="盒" value="盒" />
              <el-option label="枚" value="枚" />
              <el-option label="袋" value="袋" />
              <el-option label="个" value="个" />
              <el-option label="包" value="包" />
              <el-option label="瓶" value="瓶" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="起订量" prop="min_quantity">
            <el-input-number v-model="form.min_quantity" :min="1" :step="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="总库存" prop="stock">
            <el-input-number v-model="form.stock" :min="1" :step="10" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="截团时间" prop="deadline">
        <el-date-picker
          v-model="form.deadline"
          type="datetime"
          placeholder="选择截团时间"
          style="width: 100%;"
          :disabled-date="disabledDate"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
        <div class="quick-times">
          <el-tag size="small" effect="plain" class="qt-tag" @click="setQuick(2)">2小时后</el-tag>
          <el-tag size="small" effect="plain" class="qt-tag" @click="setQuick(6)">6小时后</el-tag>
          <el-tag size="small" effect="plain" class="qt-tag" @click="setQuick(12)">12小时后</el-tag>
          <el-tag size="small" effect="plain" class="qt-tag" @click="setQuick(24)">24小时后</el-tag>
          <el-tag size="small" effect="plain" class="qt-tag" @click="setQuickDay(1)">明天20:00</el-tag>
        </div>
      </el-form-item>

      <el-form-item label="商品描述">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="商品特点、产地等（选填）" maxlength="200" show-word-limit />
      </el-form-item>

      <el-form-item v-if="!isEdit">
        <div class="tip-box">
          <el-icon><InfoFilled /></el-icon>
          <span>提示：设置截团时间后，超过该时间将自动禁止下单和支付</span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存修改' : '确认开团' }}
      </el-button>
    </template>
  </el-dialog>

  <el-image-viewer
    v-if="viewerVisible"
    :url-list="[viewerUrl]"
    :initial-index="0"
    @close="viewerVisible = false"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElImageViewer } from 'element-plus'
import { InfoFilled, Plus, ZoomIn, Delete, Loading } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { createProduct, updateProduct, uploadImage } from '@/api/products'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.editData)

const formRef = ref(null)
const submitting = ref(false)
const uploading = ref(false)
const viewerVisible = ref(false)
const viewerUrl = ref('')

const defaultForm = () => ({
  name: '',
  image: '',
  price: 9.9,
  unit: '份',
  min_quantity: 1,
  stock: 100,
  description: '',
  deadline: dayjs().add(12, 'hour').toISOString()
})

const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择计量单位', trigger: 'change' }],
  min_quantity: [{ required: true, message: '请输入起订量', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截团时间', trigger: 'change' }]
}

function beforeUpload(file) {
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(file.name)
  if (!isImage) {
    ElMessage.error('仅支持 jpg/png/gif/webp 格式图片')
    return false
  }
  if (file.size / 1024 / 1024 > 5) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleUpload({ file }) {
  uploading.value = true
  try {
    const res = await uploadImage(file)
    form.image = res.data.url
    ElMessage.success('图片上传成功')
  } catch (e) {
    // handled by interceptor
  } finally {
    uploading.value = false
  }
}

function removeImage() {
  form.image = ''
}

function previewImage() {
  if (form.image) {
    viewerUrl.value = form.image
    viewerVisible.value = true
  }
}

function disabledDate(time) {
  return time.getTime() < Date.now() - 86400000
}

function setQuick(hours) {
  form.deadline = dayjs().add(hours, 'hour').toISOString()
}

function setQuickDay(days) {
  form.deadline = dayjs().add(days, 'day').hour(20).minute(0).second(0).toISOString()
}

async function handleSubmit() {
  await formRef.value.validate()

  const deadlineMs = dayjs(form.deadline).valueOf()
  if (deadlineMs <= Date.now()) {
    ElMessage.warning('截团时间必须晚于当前时间')
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form,
      deadline: dayjs(form.deadline).toISOString()
    }

    if (isEdit.value) {
      await updateProduct(props.editData.id, payload)
      ElMessage.success('商品已更新')
    } else {
      await createProduct(payload)
      ElMessage.success('开团成功！快去分享给邻居吧~')
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

watch(() => props.editData, (val) => {
  if (val) {
    Object.assign(form, {
      name: val.name,
      image: val.image || '',
      price: val.price,
      unit: val.unit,
      min_quantity: val.min_quantity,
      stock: val.stock,
      description: val.description,
      deadline: val.deadline
    })
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.upload-area {
  width: 100%;
  position: relative;
}

.uploader {
  :deep(.el-upload-dragger) {
    width: 100%;
    padding: 24px 20px;
    border-radius: 10px;
    background: #fafbfc;
    transition: all 0.2s;

    &:hover {
      border-color: #67c23a;
      background: #f0f9eb;
    }
  }

  .uploader-icon {
    color: #67c23a;
    margin-bottom: 6px;
  }

  .uploader-text {
    font-size: 14px;
    color: #606266;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .uploader-tip {
    font-size: 12px;
    color: #909399;
  }
}

.preview-box {
  width: 140px;
  height: 140px;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  position: relative;
  cursor: zoom-in;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .preview-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;

    .el-icon {
      cursor: pointer;
      transition: transform 0.2s;

      &:hover { transform: scale(1.2); }
    }
  }

  &:hover .preview-mask { opacity: 1; }
}

.uploading-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-times {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.qt-tag {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
    border-color: #b3d8ff;
  }
}

.tip-box {
  padding: 10px 14px;
  background: #f4f4f5;
  border-radius: 8px;
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
