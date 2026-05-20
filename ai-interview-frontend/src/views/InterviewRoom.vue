<template>
  <div class="interview-room-container min-h-screen p-4 lg:p-8">
    <div class="main-content-grid max-w-screen-2xl mx-auto">
      
      <aside class="left-panel glass-card p-4 flex flex-col gap-4">
        <div class="video-container relative aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden shadow-inner">
          <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover"></video>
          <div v-if="!modelsLoaded" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">摄像头加载中...</div>
        </div>
        <div class="analysis-section">
          <h3 class="uppercase text-xs font-semibold text-gray-400 tracking-wider mb-3">实时分析</h3>
          <div class="grid grid-cols-2 gap-4 text-center p-3 bg-white/50 rounded-lg">
            <div><p class="text-xs text-gray-500">主要情绪</p><p class="text-lg font-bold text-blue-600">{{ getPrimaryEmotion(emotions) }}</p></div>
            <div><p class="text-xs text-gray-500">语音状态</p><p class="text-lg font-bold text-gray-700">{{ isRecording ? '采集中' : '待机' }}</p></div>
          </div>
        </div>
        <div class="emotion-bars-container space-y-2">
           <el-progress v-for="emotion in sortedEmotions" :key="emotion.name" :percentage="emotion.score" :stroke-width="8" :striped="true" :stripe-flow="true">{{ emotion.name }}</el-progress>
        </div>
      </aside>

      <main class="center-panel glass-card p-6 flex flex-col">
        <div class="question-display-area flex-grow flex flex-col gap-4">
          <div class="ai-presenter">
            <el-avatar :src="aiAvatar" :size="48" class="flex-shrink-0 avatar-warm" />
            <div class="presenter-text">
              <h2 class="presenter-heading">AI 面试官</h2>
              <p class="presenter-subtitle">问题 {{ currentQuestion?.sequence }} / {{ sessionInfo?.question_count }}</p>
            </div>
            <el-tooltip v-if="currentQuestion" :content="speechTooltip" placement="top">
              <el-button @click="toggleSpeech" :icon="speechIcon" type="default" circle class="tts-btn" />
            </el-tooltip>
          </div>
          
          <div class="question-text-box bg-white/60 p-5 rounded-lg min-h-[150px] text-gray-900 text-lg leading-relaxed overflow-y-auto flex items-center">
            <p>{{ streamedQuestionText || currentQuestion?.question_text }}</p>
          </div>

          <div v-if="lastFeedback" class="feedback-box bg-green-100/80 p-3 rounded-lg text-sm text-green-800 border border-green-200">
            <strong>AI 简评 (上一问):</strong> {{ decodeURIComponent(lastFeedback) }}
          </div>
        </div>
        
        <div class="answer-input-area mt-6">
          <RichTextEditor v-model="userAnswer" placeholder="请输入您的回答，或点击下方麦克风进行语音输入..." />
          <div class="speech-control-bar">
            <el-tooltip content="开始语音输入" placement="top" :disabled="isListening">
              <el-button @click="startSpeech" :disabled="isListening" type="default" circle :icon="Microphone" class="speech-btn" />
            </el-tooltip>
            <el-tooltip content="停止语音输入" placement="top" :disabled="!isListening">
              <el-button @click="stopSpeech" :disabled="!isListening" type="default" circle :icon="SwitchButton" class="speech-btn" />
            </el-tooltip>
            <span v-if="isListening" class="speech-status is-recording">正在聆听...</span>
            <span v-else class="speech-status">语音回答</span>
          </div>
        </div>
      </main>

      <aside class="right-panel flex flex-col gap-6">
        <div class="controls glass-card p-5 flex flex-col items-center gap-4">
           <el-button type="primary" size="large" @click="submitAnswer" :loading="isSubmitting" :disabled="!userAnswer.trim()" class="w-full">
            {{ isSubmitting ? '处理中...' : '确认并进入下一题' }}
          </el-button>
          <div class="divider-line"></div>
          <el-button type="danger" @click="() => confirmFinishInterview()" :loading="isFinishing" class="w-full" plain>
            {{ isFinishing ? '正在结束...' : '结束面试' }}
          </el-button>
        </div>
        <div class="tips glass-card p-5">
          <h3 class="tips-header">面试注意事项</h3>
          <ul class="tips-list">
            <li>请确保网络通畅，选择光线充足、背景整洁的环境。</li>
            <li>请正视摄像头，保持声音清晰、语速适中。</li>
            <li>回答问题时，建议结合 STAR 法则，突出个人贡献和量化成果。</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFaceApi, emotionMap } from '@/composables/useFaceApi';
import { useTTS } from '@/composables/useTTS';
import { useSpeechRecognition } from '@/composables/useSpeechRecognition';
import { ElMessage, ElMessageBox, ElButton, ElProgress, ElIcon, ElAvatar, ElTooltip } from 'element-plus';
import { VideoPlay, VideoPause, RefreshRight, Microphone, SwitchButton } from '@element-plus/icons-vue';
import { getInterviewSessionApi, submitAnswerStreamApi, type InterviewSessionItem, type InterviewQuestionItem, type AnalysisFrame } from '@/api/modules/interview';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import aiAvatar from '@/assets/images/image.svg';

const route = useRoute();
const router = useRouter();
const sessionInfo = ref<InterviewSessionItem | null>(null);
const currentQuestion = ref<InterviewQuestionItem | null>(null);
const userAnswer = ref('');
const streamedQuestionText = ref('');
const lastFeedback = ref('');
const isSubmitting = ref(false);
const isFinishing = ref(false);
const { modelsLoaded, emotions, loadModels, detectFace, getPrimaryEmotion } = useFaceApi();
const { isSpeaking, isPaused, speak, pause, resume, cancel } = useTTS();
const videoRef = ref<HTMLVideoElement | null>(null);
const analysisInterval = ref<NodeJS.Timeout | null>(null);
let analysisFrames = ref<AnalysisFrame[]>([]);
const handleSpeechResult = (transcript: string) => {
  if (userAnswer.value.endsWith('</p>')) { userAnswer.value = userAnswer.value.slice(0, -4) + transcript + '</p>'; } 
  else { userAnswer.value += transcript; }
};
const { isListening, start: startSpeech, stop: stopSpeech } = useSpeechRecognition(handleSpeechResult);
const isRecording = computed(() => isListening.value);
const speechIcon = shallowRef(VideoPlay);
const speechTooltip = ref('播放问题');

watch([isSpeaking, isPaused], ([speaking, paused]) => {
  if (speaking && !paused) { speechIcon.value = VideoPause; speechTooltip.value = '暂停'; } 
  else if (speaking && paused) { speechIcon.value = VideoPlay; speechTooltip.value = '继续播放'; } 
  else { speechIcon.value = RefreshRight; speechTooltip.value = '重播问题'; }
}, { immediate: true });

const toggleSpeech = () => {
  const textToSpeak = streamedQuestionText.value || currentQuestion.value?.question_text;
  if (!textToSpeak) return;
  if (isSpeaking.value) {
    if (isPaused.value) { resume(); } else { pause(); }
  } else { speak(textToSpeak); }
};

// [核心修正 1/2] 新增 HTML 清洗函数
const sanitizeHtml = (dirtyHtml: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = dirtyHtml;
  
  // 遍历所有子元素
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(el => {
    // 移除 style 属性
    el.removeAttribute('style');
    // 你可以在这里移除更多不想要的属性，例如 class, id 等
    // el.removeAttribute('class');
  });

  return tempDiv.innerHTML;
};

const sortedEmotions = computed(() => { if (!emotions.value) return []; return emotions.value.asSortedArray().map(emotion => ({ name: emotionMap[emotion.expression] || emotion.expression, score: Math.round(emotion.probability * 100) })); });
const setupCamera = async () => { if (videoRef.value) { try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); videoRef.value.srcObject = stream; videoRef.value.onloadedmetadata = () => { startAnalysis(); }; } catch (err) { ElMessage.error("无法访问摄像头，请检查权限。"); } } };
const startAnalysis = () => { if (analysisInterval.value) clearInterval(analysisInterval.value); analysisInterval.value = setInterval(async () => { if (videoRef.value) { await detectFace(videoRef.value); if (emotions.value) { const plainEmotions: Record<string, number> = {}; for (const key in emotionMap) { if (Object.prototype.hasOwnProperty.call(emotions.value, key)) { plainEmotions[key] = (emotions.value as any)[key]; } } analysisFrames.value.push({ timestamp: Date.now(), emotions: plainEmotions }); } } }, 1000); };
const fetchSessionData = async () => { try { const sessionId = route.params.id as string; const res = await getInterviewSessionApi(sessionId); sessionInfo.value = res; const unanswered = res.questions.filter(q => !q.answer_text); if (unanswered.length > 0) { currentQuestion.value = unanswered[0]; } else { ElMessage.info("面试已完成，正在跳转到报告页面..."); router.push({ name: 'ReportDetail', params: { id: sessionId } }); } } catch (error) { ElMessage.error("加载面试信息失败"); } };

const submitAnswer = async () => {
  cancel();
  stopSpeech();
  if (!sessionInfo.value || !currentQuestion.value || !userAnswer.value.trim()) return;
  isSubmitting.value = true;
  streamedQuestionText.value = '';

  // [核心修正 2/2] 在提交前清洗 HTML
  const cleanAnswer = sanitizeHtml(userAnswer.value);

  try {
    const result = await submitAnswerStreamApi(sessionInfo.value.id, {
        question_id: currentQuestion.value.id,
        answer_text: cleanAnswer, // 使用清洗后的数据
        analysis_data: analysisFrames.value,
      }, (chunk) => { streamedQuestionText.value += chunk; });
    lastFeedback.value = result.feedback;
    if (result.isFinished) {
      confirmFinishInterview(true);
    } else {
      await fetchSessionData();
      userAnswer.value = '';
      analysisFrames.value = [];
    }
  } catch (error) { ElMessage.error("提交失败，请重试。");
  } finally { isSubmitting.value = false; }
};
const confirmFinishInterview = (isAutoFinish: boolean | Event = false) => { cancel(); stopSpeech(); const action = () => { isFinishing.value = true; if (sessionInfo.value) { ElMessage.success("面试结束，正在生成报告..."); router.push({ name: 'ReportDetail', params: { id: sessionInfo.value.id } }); } }; if(isAutoFinish === true) return action(); ElMessageBox.confirm('您确定要提前结束本次面试吗？', '确认结束', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(action).catch(() => { ElMessage.info('面试已继续'); }); };
onMounted(async () => { await loadModels(); await setupCamera(); await fetchSessionData(); });
onUnmounted(() => { if (analysisInterval.value) clearInterval(analysisInterval.value); if (videoRef.value && videoRef.value.srcObject) { (videoRef.value.srcObject as MediaStream).getTracks().forEach(track => track.stop()); } cancel(); stopSpeech(); });
</script>

<style lang="scss" scoped>
// Claude Design System 卡片 — 实色象牙白，柔和暖调阴影
.glass-card {
	background: var(--color-ivory);
	border: 1px solid var(--color-border-cream);
	border-radius: 8px;
	box-shadow: rgba(0, 0, 0, 0.05) 0px 4px 24px;
}
.interview-room-container {
	background: var(--color-parchment);
	overflow: hidden;
}
// 暖色调替代 Tailwind 灰度
.text-gray-400 { color: var(--color-warm-silver) !important; text-align: center; }
.text-gray-500 { color: var(--color-stone-gray) !important; }
.text-gray-600 { color: var(--color-olive-gray) !important; }
.text-gray-700 { color: var(--color-charcoal-warm) !important; }
.text-gray-800 { color: var(--color-near-black) !important; }
.text-gray-900 { color: var(--color-near-black) !important; }
.bg-gray-200 { background-color: var(--color-warm-sand) !important; }
.text-blue-600 { color: var(--color-terracotta) !important; }
.text-red-500 { color: var(--color-error) !important; }
.text-green-800 { color: #3d5a3d !important; }
.bg-green-100\/80 { background-color: rgba(221, 251, 230, 0.8) !important; }
.border-green-200 { border-color: #b8d9b8 !important; }
.bg-white\/50 { background-color: var(--color-ivory) !important; }
.bg-white\/60 { background-color: var(--color-white) !important; padding: 24px !important;}
.bg-black { background-color: var(--color-near-black) !important; }
.bg-opacity-50 { --tw-bg-opacity: 0.5; }
.shadow-inner { box-shadow: rgba(0, 0, 0, 0.06) 0px 2px 4px inset !important; }
// AI-presenter — 头像暖调阴影 + 衬线体标题排版
.avatar-warm {
	box-shadow: rgba(0, 0, 0, 0.08) 0px 2px 8px;
  margin: 12px;
}
.ai-presenter {
	display: flex;
	align-items: center;
	gap: 12px;
}
.presenter-text {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.presenter-heading {
	font-family: var(--font-serif);
	font-size: 20.8px;
	font-weight: 500;
	line-height: 1.20;
	color: var(--color-near-black);
	margin: 0;
}
.presenter-subtitle {
	font-family: var(--font-sans);
	font-size: 12px;
	font-weight: 500;
	line-height: 1.25;
	letter-spacing: 0.12px;
	color: var(--color-stone-gray);
	margin: 0;
}
.tts-btn {
	flex-shrink: 0;
  margin: 12px;
}
// 右侧面板 — Controls 卡片
.text-warm-silver { color: var(--color-warm-silver); }
.divider-line {
	height: 1px;
	width: 100%;
	background: var(--color-border-cream);
}
// 右侧面板 — Tips 卡片
.tips-header {
	font-family: var(--font-sans);
	font-size: 10px;
	font-weight: 400;
	letter-spacing: 0.5px;
	text-transform: uppercase;
	color: var(--color-stone-gray);
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--color-border-cream);
  display: flex;
  align-items: center;    /* 垂直居中 */
  justify-content: center;/* 水平居中 */
}
.tips-list {
	list-style: none;
	padding: 16px;
	margin: 0;
	li {
    list-style: none;
		font-family: var(--font-sans);
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-olive-gray);
		padding: 6px 0; /* 去掉左侧内边距，完全左对齐 */
		position: relative;
		/* 已删除：圆点伪元素 */
		/* 已删除：列表之间的分割线 */
	}
}
.main-content-grid { display: grid; grid-template-columns: 300px 1fr 260px; grid-template-rows: calc(100vh - 6rem); gap: 1.5rem; }
@media (max-width: 1280px) { .main-content-grid { grid-template-columns: 300px 1fr; grid-template-rows: auto; } .right-panel { grid-column: 1 / -1; flex-direction: row; align-items: flex-start; } .right-panel .controls, .right-panel .tips { flex-basis: 50%; } }
@media (max-width: 768px) { .interview-room-container { overflow-y: auto; } .main-content-grid { display: flex; flex-direction: column; height: auto; } .right-panel { flex-direction: column; } }
/* 语音控制栏 */ .speech-control-bar{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 16px;margin-top:8px;background:var(--color-ivory);border:1px solid var(--color-border-cream);border-radius:8px} .speech-btn{margin:10px} .speech-status{font-family:var(--font-sans);font-size:13px;line-height:1.6;color:var(--color-stone-gray)} .speech-status.is-recording{color:var(--color-terracotta)}
</style>