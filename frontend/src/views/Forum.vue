<template>
  <div class="forum-page">
    <div class="page-header">
      <h2>校园论坛</h2>
      <el-button v-if="canInteract" type="primary" @click="publishDialogVisible = true">发布帖子</el-button>
      <el-tag v-else type="info">{{ isGuest ? '游客仅可浏览和查找' : '商家仅可浏览' }}</el-tag>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="请选择分类" clearable>
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.icon + ' ' + cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="filterForm.keyword" placeholder="请输入关键词" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadPosts">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="post-list">
      <el-card v-for="post in posts" :key="post.id" class="post-card" shadow="hover" @click="showDetail(post)">
        <div class="post-header">
          <div class="post-author">
            <el-avatar :size="40" :icon="UserFilled" />
            <div class="author-info">
              <span class="author-name">{{ post.userName }}</span>
              <span class="post-time">{{ formatTime(post.createdAt) }}</span>
            </div>
          </div>
          <el-tag>{{ getCategoryName(post.category) }}</el-tag>
        </div>
        <h3 class="post-title">{{ post.title }}</h3>
        <p class="post-content">{{ post.content }}</p>
        <div v-if="post.images.length > 0" class="post-images">
          <el-image 
            v-for="(image, index) in post.images.slice(0, 3)" 
            :key="index"
            :src="image" 
            fit="cover"
            :preview-src-list="post.images"
          />
        </div>
        <div class="post-footer">
          <span><el-icon><ChatDotRound /></el-icon> {{ post.comments.length }} 评论</span>
          <span><el-icon><Star /></el-icon> {{ post.likes }} 点赞</span>
        </div>
      </el-card>
    </div>
    <el-empty v-if="posts.length === 0" description="暂无帖子" />

    <el-drawer v-model="detailDrawerVisible" title="帖子详情" size="600px">
      <div v-if="selectedPost" class="post-detail">
        <div class="detail-header">
          <div class="post-author">
            <el-avatar :size="50" :icon="UserFilled" />
            <div class="author-info">
              <span class="author-name">{{ selectedPost.userName }}</span>
              <span class="post-time">{{ formatTime(selectedPost.createdAt) }}</span>
            </div>
          </div>
          <el-tag>{{ getCategoryName(selectedPost.category) }}</el-tag>
        </div>
        <h2 class="detail-title">{{ selectedPost.title }}</h2>
        <p class="detail-content">{{ selectedPost.content }}</p>
        <div v-if="selectedPost.images.length > 0" class="detail-images">
          <el-image 
            v-for="(image, index) in selectedPost.images" 
            :key="index"
            :src="image" 
            fit="cover"
            :preview-src-list="selectedPost.images"
          />
        </div>
        <div v-if="canInteract" class="detail-actions">
          <el-button type="primary" @click="likePost(selectedPost)">
            <el-icon><Star /></el-icon> 点赞 ({{ selectedPost.likes }})
          </el-button>
        </div>
        <el-divider />
        <div class="comments-section">
          <h3>评论 ({{ selectedPost.comments.length }})</h3>
          <div v-for="comment in selectedPost.comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <el-avatar :size="30" :icon="UserFilled" />
              <div class="comment-info">
                <span class="comment-author">{{ comment.userName }}</span>
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
              </div>
            </div>
            <p class="comment-content">{{ comment.content }}</p>
          </div>
          <el-empty v-if="selectedPost.comments.length === 0" description="暂无评论" />
        </div>
        <div v-if="canInteract" class="comment-form">
          <el-input 
            v-model="commentText" 
            type="textarea" 
            :rows="3" 
            placeholder="发表评论..."
          />
          <el-button type="primary" style="margin-top: 10px" @click="submitComment" :loading="commenting">
            发表评论
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="publishDialogVisible" title="发布帖子" width="600px">
      <el-form :model="publishForm" :rules="publishRules" ref="publishFormRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="publishForm.title" placeholder="请输入帖子标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="publishForm.category" placeholder="请选择分类">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.icon + ' ' + cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="publishForm.content" type="textarea" :rows="6" placeholder="请输入帖子内容" />
        </el-form-item>
        <el-form-item label="图片">
          <ImageDropInput v-model="publishForm.images" multiple />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPublish" :loading="publishing">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, ChatDotRound, Star } from '@element-plus/icons-vue'
import { forumApi } from '@/api'
import ImageDropInput from '@/components/ImageDropInput.vue'
import { useUserStore } from '@/stores/user'

const categories = ref([])
const posts = ref([])
const filterForm = ref({
  category: '',
  keyword: ''
})
const detailDrawerVisible = ref(false)
const selectedPost = ref(null)
const commentText = ref('')
const commenting = ref(false)
const publishDialogVisible = ref(false)
const publishing = ref(false)
const publishFormRef = ref(null)
const userStore = useUserStore()
const isMerchant = computed(() => userStore.user?.role === 'merchant')
const isGuest = computed(() => !userStore.token)
const canInteract = computed(() => !isGuest.value && !isMerchant.value)
const publishForm = ref({
  title: '',
  category: '',
  content: '',
  images: []
})

const publishRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const loadCategories = async () => {
  try {
    const res = await forumApi.getCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const loadPosts = async () => {
  try {
    const res = await forumApi.getPosts(filterForm.value)
    posts.value = res.data
  } catch (error) {
    console.error('加载帖子列表失败:', error)
  }
}

const resetFilter = () => {
  filterForm.value = { category: '', keyword: '' }
  loadPosts()
}

const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : categoryId
}

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

const showDetail = (post) => {
  selectedPost.value = post
  detailDrawerVisible.value = true
}

const likePost = async (post) => {
  if (!canInteract.value) {
    ElMessage.warning('当前身份只能浏览帖子')
    return
  }
  try {
    await forumApi.likePost(post.id)
    post.likes++
    ElMessage.success('点赞成功')
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

const submitComment = async () => {
  if (!canInteract.value) {
    ElMessage.warning('当前身份只能浏览帖子')
    return
  }
  if (!commentText.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  commenting.value = true
  try {
    await forumApi.commentPost(selectedPost.value.id, { content: commentText.value })
    ElMessage.success('评论成功')
    commentText.value = ''
    loadPosts()
  } catch (error) {
    console.error('评论失败:', error)
  } finally {
    commenting.value = false
  }
}

const submitPublish = async () => {
  if (!canInteract.value) {
    ElMessage.warning('当前身份不能发布帖子')
    return
  }
  if (!publishFormRef.value) return
  await publishFormRef.value.validate(async (valid) => {
    if (valid) {
      publishing.value = true
      try {
        await forumApi.publishPost({
          ...publishForm.value,
          images: publishForm.value.images
        })
        ElMessage.success('发布成功，等待审核')
        publishDialogVisible.value = false
        publishForm.value = { title: '', category: '', content: '', images: [] }
        loadPosts()
      } catch (error) {
        console.error('发布失败:', error)
      } finally {
        publishing.value = false
      }
    }
  })
}

onMounted(() => {
  loadCategories()
  loadPosts()
})
</script>

<style scoped>
.forum-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.filter-card {
  margin-bottom: 20px;
}

.post-list {
  margin-top: 20px;
}

.post-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.post-card:hover {
  transform: translateY(-3px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 500;
  color: #333;
}

.post-time {
  font-size: 12px;
  color: #999;
}

.post-title {
  margin: 0 0 10px;
  font-size: 18px;
  color: #333;
}

.post-content {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.post-images {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.post-images :deep(.el-image) {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}

.post-footer {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
}

.post-footer span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.post-detail .detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-title {
  margin: 0 0 15px;
  color: #333;
}

.detail-content {
  color: #666;
  line-height: 1.8;
  margin-bottom: 15px;
}

.detail-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.detail-images :deep(.el-image) {
  width: 150px;
  height: 150px;
  border-radius: 4px;
}

.detail-actions {
  margin: 20px 0;
}

.comments-section {
  margin-top: 30px;
}

.comments-section h3 {
  margin: 0 0 20px;
  color: #333;
}

.comment-item {
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.comment-info {
  display: flex;
  flex-direction: column;
}

.comment-author {
  font-weight: 500;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-content {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.comment-form {
  margin-top: 20px;
}
</style>
