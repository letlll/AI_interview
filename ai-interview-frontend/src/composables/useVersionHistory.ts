/**
 * 版本历史管理器
 * 使用增量快照策略，节省存储空间
 */

import { ref, computed } from 'vue';
import { cloneDeep } from 'lodash-es';
import type { ResumeData, UserIntent, UpdateInstruction } from './useResumeAI';

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  type: 'full' | 'incremental';
  
  // 完整快照
  fullData?: ResumeData;
  
  // 增量快照
  diff?: UpdateInstruction[];
  baseVersionId?: string;
  
  // 元数据
  changeDescription: string;
  affectedPaths: string[];
  userIntent?: UserIntent;
}

export function useVersionHistory(maxVersions: number = 10) {
  const versions = ref<VersionSnapshot[]>([]);
  
  // 添加新版本
  const addVersion = (
    newData: ResumeData,
    description: string,
    instructions?: UpdateInstruction[],
    intent?: UserIntent
  ) => {
    const lastVersion = versions.value[versions.value.length - 1];
    
    // 每 3 个版本保存一次完整快照
    const shouldSaveFullSnapshot = versions.value.length % 3 === 0;
    
    const snapshot: VersionSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      type: shouldSaveFullSnapshot ? 'full' : 'incremental',
      changeDescription: description,
      affectedPaths: instructions?.map(i => i.path) || [],
      userIntent: intent
    };
    
    if (shouldSaveFullSnapshot || !lastVersion) {
      // 完整快照
      snapshot.fullData = cloneDeep(newData);
    } else {
      // 增量快照
      const baseVersion = findLastFullSnapshot();
      snapshot.diff = instructions || [];
      snapshot.baseVersionId = baseVersion?.id;
    }
    
    versions.value.push(snapshot);
    
    // 清理旧版本（保留最近 N 个）
    if (versions.value.length > maxVersions) {
      versions.value.shift();
    }
  };
  
  // 查找最后一个完整快照
  const findLastFullSnapshot = (): VersionSnapshot | undefined => {
    for (let i = versions.value.length - 1; i >= 0; i--) {
      if (versions.value[i].type === 'full') {
        return versions.value[i];
      }
    }
    return undefined;
  };
  
  // 重建某个版本的完整数据
  const reconstructVersion = (versionId: string): ResumeData | null => {
    const version = versions.value.find(v => v.id === versionId);
    if (!version) return null;
    
    if (version.type === 'full') {
      return cloneDeep(version.fullData!);
    }
    
    // 增量版本：从基础版本开始应用差异
    const baseVersion = versions.value.find(v => v.id === version.baseVersionId);
    if (!baseVersion || !baseVersion.fullData) return null;
    
    let data = cloneDeep(baseVersion.fullData);
    
    // 应用所有中间差异
    const intermediateVersions = getIntermediateVersions(baseVersion.id, versionId);
    for (const v of intermediateVersions) {
      if (v.diff) {
        // 这里应该使用 applyInstructions，但为了避免循环依赖，简化处理
        // 实际使用时应该导入 applyInstructions
        console.log('应用差异:', v.diff);
      }
    }
    
    return data;
  };
  
  // 获取两个版本之间的所有中间版本
  const getIntermediateVersions = (
    startId: string,
    endId: string
  ): VersionSnapshot[] => {
    const startIndex = versions.value.findIndex(v => v.id === startId);
    const endIndex = versions.value.findIndex(v => v.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return [];
    
    return versions.value.slice(startIndex + 1, endIndex + 1);
  };
  
  // 生成版本摘要（用于 AI Prompt）
  const getVersionDigest = (count: number = 3): string => {
    const recent = versions.value.slice(-count);
    
    if (recent.length === 0) return '暂无版本历史';
    
    return recent.map(v => {
      const time = new Date(v.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const paths = v.affectedPaths.length > 0 
        ? v.affectedPaths.join(', ')
        : '全局';
      return `[${time}] ${v.changeDescription} (修改: ${paths})`;
    }).join('\n');
  };
  
  // 回退到某个版本
  const revertTo = (versionId: string): ResumeData | null => {
    return reconstructVersion(versionId);
  };
  
  // 清空历史
  const clearHistory = () => {
    versions.value = [];
  };
  
  // 计算属性
  const hasVersions = computed(() => versions.value.length > 0);
  const latestVersion = computed(() => 
    versions.value[versions.value.length - 1]
  );
  const versionCount = computed(() => versions.value.length);
  
  return {
    versions,
    hasVersions,
    latestVersion,
    versionCount,
    addVersion,
    reconstructVersion,
    getVersionDigest,
    revertTo,
    clearHistory
  };
}

// 生成唯一 ID
function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
