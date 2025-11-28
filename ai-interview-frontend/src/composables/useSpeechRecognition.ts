import { ref, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  const isListening = ref(false);
  const error = ref<string | null>(null);
  
  let recognition: any | null = null;
  let accumulatedTranscript = ''; // 累积识别结果

  if (isSupported) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // 持续识别
    recognition.interimResults = false; // 关闭临时结果以提升性能
    recognition.lang = 'zh-CN'; // 设置语言
    recognition.maxAlternatives = 1; // 只返回最佳结果

    recognition.onstart = () => {
      isListening.value = true;
      error.value = null;
      accumulatedTranscript = '';
    };

    // 创建防抖的结果处理函数（300ms 延迟）
    const debouncedOnResult = debounce((transcript: string) => {
      if (transcript.trim()) {
        onResult(transcript);
      }
    }, 300);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      // 只处理最终结果
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      // 使用防抖处理结果
      if (finalTranscript) {
        accumulatedTranscript += finalTranscript;
        debouncedOnResult(accumulatedTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      
      // 某些错误可以忽略
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      
      error.value = `语音识别错误: ${event.error}`;
      ElMessage.error(error.value);
      isListening.value = false;
    };

    recognition.onend = () => {
      isListening.value = false;
      // 如果有未处理的累积文本，立即处理
      if (accumulatedTranscript.trim()) {
        onResult(accumulatedTranscript);
        accumulatedTranscript = '';
      }
    };
  }

  const start = () => {
    if (!isSupported) {
      ElMessage.warning('您的浏览器不支持语音识别功能。');
      return;
    }
    if (!isListening.value) {
      recognition.start();
    }
  };

  const stop = () => {
    if (isListening.value) {
      recognition.stop();
    }
  };

  onUnmounted(() => {
    stop();
  });

  return {
    isListening,
    isSupported,
    error,
    start,
    stop,
  };
}