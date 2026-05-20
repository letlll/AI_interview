<script setup lang="ts">
// 这个组件通常用于展示文章卡片的骨架屏
defineProps({
  title: String,
  excerpt: String,
  author: String,
  date: String,
  cover: {
    type: Boolean,
    default: true
  }
});
</script>

<template>
  <div class="post-card-skeleton">
    <div v-if="cover" class="cover-placeholder">无封面</div>
    <div class="content">
      <h3 class="title">{{ title }}</h3>
      <p class="excerpt">{{ excerpt }}</p>
      <div class="meta">
        <span class="author">{{ author || "佚名" }}</span> ·
        <span class="date">{{ date }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post-card-skeleton {
  border: 1px solid var(--color-border-cream);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  background-color: var(--color-ivory);
}

.cover-placeholder {
  width: 100%;
  height: 240px;
  background-color: var(--color-parchment);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0a0a0;
  font-size: 16px;
}

.content {
  padding: 16px;
}

.title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.excerpt {
  margin: 0 0 12px;
  color: var(--color-stone-gray);
  font-size: 0.9rem;
  
  /* 【核心修正】添加标准属性 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2; /* <-- 新增这一行 */
  overflow: hidden;
  text-overflow: ellipsis;
  height: 2.7rem;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--color-warm-silver);
}
</style>