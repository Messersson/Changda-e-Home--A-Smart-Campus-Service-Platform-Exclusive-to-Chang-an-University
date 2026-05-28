<template>
  <div class="image-drop-input">
    <div
      class="image-drop-input__zone"
      :class="{ 'image-drop-input__zone--dragging': dragging }"
      tabindex="0"
      role="button"
      :aria-label="emptyText"
      @click="openPicker"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
      @paste="handlePaste"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
    >
      <input
        ref="fileInputRef"
        class="image-drop-input__file"
        type="file"
        accept="image/*"
        :multiple="multiple"
        @change="handleFileSelect"
      />

      <div v-if="items.length === 0" class="image-drop-input__empty">
        <el-icon :size="28"><UploadFilled /></el-icon>
        <span>{{ emptyText }}</span>
      </div>

      <div v-else class="image-drop-input__grid">
        <div v-for="(item, index) in items" :key="`${item.slice(0, 48)}-${index}`" class="image-drop-input__thumb">
          <img :src="item" alt="" />
          <button class="image-drop-input__remove" type="button" @click.stop="removeAt(index)" :aria-label="removeText">
            <el-icon><Close /></el-icon>
          </button>
        </div>
        <button
          v-if="multiple && items.length < max"
          class="image-drop-input__add"
          type="button"
          @click.stop="openPicker"
          :aria-label="addText"
        >
          <el-icon><Plus /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Plus, UploadFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: [String, Array],
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  },
  max: {
    type: Number,
    default: 9
  }
})

const emit = defineEmits(['update:modelValue'])

const fileInputRef = ref(null)
const dragging = ref(false)

const emptyText = computed(() => (
  props.multiple
    ? '\u62d6\u5165\u6216\u7c98\u8d34\u56fe\u7247\uff0c\u53ef\u6dfb\u52a0\u591a\u5f20'
    : '\u62d6\u5165\u6216\u7c98\u8d34\u56fe\u7247'
))
const addText = '\u6dfb\u52a0\u56fe\u7247'
const removeText = '\u5220\u9664\u56fe\u7247'

const items = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue.filter(Boolean) : []
  }
  return props.modelValue ? [props.modelValue] : []
})

const openPicker = () => {
  fileInputRef.value?.click()
}

const updateItems = (nextItems) => {
  if (props.multiple) {
    emit('update:modelValue', nextItems.slice(0, props.max))
    return
  }
  emit('update:modelValue', nextItems[0] || '')
}

const removeAt = (index) => {
  const nextItems = items.value.slice()
  nextItems.splice(index, 1)
  updateItems(nextItems)
}

const handleFileSelect = async (event) => {
  await addEntries({ files: Array.from(event.target.files || []) })
  event.target.value = ''
}

const handleDrop = async (event) => {
  dragging.value = false
  await addEntries({
    files: Array.from(event.dataTransfer?.files || []),
    sources: getImageSourcesFromTransfer(event.dataTransfer)
  })
}

const handlePaste = async (event) => {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean)

  const sources = getImageSourcesFromClipboard(event.clipboardData)
  if (files.length > 0 || sources.length > 0) {
    event.preventDefault()
    await addEntries({ files, sources })
  }
}

const addEntries = async ({ files = [], sources = [] }) => {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  const imageSources = normalizeSources(sources)
  const total = imageFiles.length + imageSources.length

  if (total === 0) {
    return
  }

  const capacity = props.multiple ? Math.max(props.max - items.value.length, 0) : 1
  if (capacity === 0) {
    ElMessage.warning(`\u6700\u591a\u6dfb\u52a0 ${props.max} \u5f20\u56fe\u7247`)
    return
  }

  try {
    const filesToAdd = imageFiles.slice(0, capacity)
    const remaining = Math.max(capacity - filesToAdd.length, 0)
    const sourcesToAdd = imageSources.slice(0, remaining)
    const dataUrls = await Promise.all(filesToAdd.map(fileToDataUrl))
    const nextValues = [...dataUrls, ...sourcesToAdd]

    updateItems(props.multiple ? [...items.value, ...nextValues] : nextValues)

    if (total > capacity) {
      ElMessage.warning(`\u6700\u591a\u6dfb\u52a0 ${props.max} \u5f20\u56fe\u7247`)
    }
  } catch (error) {
    console.error('\u56fe\u7247\u5904\u7406\u5931\u8d25:', error)
    ElMessage.error('\u56fe\u7247\u5904\u7406\u5931\u8d25')
  }
}

const getImageSourcesFromClipboard = (clipboardData) => {
  if (!clipboardData) return []
  return [
    ...extractImageSources(clipboardData.getData('text/plain')),
    ...extractImageSources(clipboardData.getData('text/html'))
  ]
}

const getImageSourcesFromTransfer = (dataTransfer) => {
  if (!dataTransfer) return []
  return [
    ...extractImageSources(dataTransfer.getData('text/uri-list')),
    ...extractImageSources(dataTransfer.getData('text/plain')),
    ...extractImageSources(dataTransfer.getData('text/html'))
  ]
}

const extractImageSources = (value = '') => {
  if (!value.trim()) return []

  const sources = []
  const urlPattern = /(data:image\/[^"'\s<>]+|https?:\/\/[^"'\s<>]+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?[^"'\s<>]*)?)/gi
  let match = urlPattern.exec(value)
  while (match) {
    sources.push(match[1])
    match = urlPattern.exec(value)
  }

  return sources
}

const normalizeSources = (sources) => {
  return [...new Set(sources.map((source) => source.trim()).filter(Boolean))]
}

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
.image-drop-input {
  width: 100%;
}

.image-drop-input__zone {
  min-height: 132px;
  border: 1px dashed #b9c2d3;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.image-drop-input__zone:focus,
.image-drop-input__zone:hover,
.image-drop-input__zone--dragging {
  border-color: #6b6cf6;
  background: #f3f5ff;
  box-shadow: 0 0 0 3px rgba(107, 108, 246, 0.12);
}

.image-drop-input__file {
  display: none;
}

.image-drop-input__empty {
  min-height: 132px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #667085;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
  padding: 16px;
}

.image-drop-input__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  padding: 10px;
}

.image-drop-input__thumb,
.image-drop-input__add {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #eef2f7;
}

.image-drop-input__thumb img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.image-drop-input__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(17, 24, 39, 0.72);
  cursor: pointer;
}

.image-drop-input__add {
  border: 1px dashed #b9c2d3;
  color: #667085;
  cursor: pointer;
}

.image-drop-input__add:hover {
  color: #6b6cf6;
  border-color: #6b6cf6;
}
</style>
