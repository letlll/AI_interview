---
name: Save PDF to backend on download
overview: 当用户在 ResumeGeneratorNew.vue 点击"下载 PDF"时，将生成的 PDF 同时保存到后端 Resume 记录的 file 字段中。
todos: []
isProject: false
---

## 实现方案

需要在后端和前端各加一段代码。后端新增一个专门接收 PDF 文件的接口，前端在下载 PDF 时同时调用该接口。

### 后端：新增 `PATCH /api/v1/resumes/{id}/file/` 接口

修改 [ai_interview_backend/resumes/views.py](ai_interview_backend/resumes/views.py)，在 `ResumeViewSet` 中添加一个自定义 action：

```python
from rest_framework.decorators import action
from rest_framework import status

@action(detail=True, methods=['patch'], url_path='file')
def update_file(self, request, pk=None):
    resume = self.get_object()
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    resume.file = file_obj
    resume.save()
    serializer = ResumeDetailSerializer(resume)
    return Response(serializer.data)
```

这样自动生成路由 `PATCH /api/v1/resumes/{id}/file/`。

### 前端：新增 API 调用函数

在 [ai-interview-frontend/src/api/modules/resume.ts](ai-interview-frontend/src/api/modules/resume.ts) 末尾添加：

```typescript
export const updateResumeFileApi = (id: number, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  return request({
    url: `/resumes/${id}/file/`,
    method: 'patch',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

### 前端：修改 `handleDownloadPdf` 同时上传

修改 [ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue) 的 `handleDownloadPdf` 函数，将 PDF blob 同时上传到后端：

1. 生成 PDF blob 后，用 `formData.append('file', pdfBlob, filename)` 构造 FormData
2. 如果 `currentResumeId.value` 存在（有简历 ID），调用 `updateResumeFileApi(id, file)`
3. 静默失败（上传失败不影响下载体验），用 `try/catch` 包裹

伪代码：

```typescript
// 生成 PDF blob
const pdfBlob = await generatePdfBlob();

// 同时下载
pdf.save(filename);

// 同时保存到后端（不阻塞）
if (currentResumeId.value) {
  const formData = new FormData();
  formData.append('file', pdfBlob, filename);
  updateResumeFileApi(currentResumeId.value, ???)
}
```

**注意**：`updateResumeFileApi` 接收 `File` 类型，但 html2canvas + jsPDF 生成的是 `Blob`。需要将 Blob 转为 File：

```typescript
const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
updateResumeFileApi(currentResumeId.value, pdfFile);
```

上传失败时打印警告但不阻断下载流程。