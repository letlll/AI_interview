# 图4.7 数据库ER图 — draw.io 绘制规格（Chen记法）

## 绘制规则
- 实体 = 矩形框，框内写实体名（中文）
- 属性 = 椭圆，连线到所属实体，主键加下划线
- 关系 = 菱形，连线到参与实体，标注基数（1/N/M）
- 外键不出现在属性椭圆中，通过关系菱形表达

---

## 实体 1：User（用户）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| email | VARCHAR(254) | UNIQUE，登录账号 |
| username | VARCHAR(150) | 用户名 |
| phone | VARCHAR(20) | UNIQUE，可选 |
| avatar | VARCHAR(100) | 头像路径，可选 |
| role | VARCHAR(20) | candidate/hr/admin |
| status | INT | 0=禁用, 1=正常 |
| password | VARCHAR(128) | PBKDF2哈希 |
| date_joined | DATETIME | 注册时间 |
| updated_at | DATETIME | 更新时间 |

## 实体 2：InterviewSession（面试会话）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | UUID | 主键 |
| job_position | VARCHAR(100) | 目标岗位 |
| difficulty | VARCHAR(20) | easy/medium/hard |
| question_count | INT | 题目数量，默认5 |
| status | VARCHAR(20) | pending/running/finished/canceled |
| duration | INT | 持续秒数，可选 |
| started_at | DATETIME | 开始时间，可选 |
| finished_at | DATETIME | 结束时间，可选 |
| report | JSON | 面试报告，可选 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 实体 3：InterviewQuestion（面试问题）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| question_text | LONGTEXT | 题目内容 |
| sequence | INT | 题目序号(1-based) |
| answer_text | LONGTEXT | 用户回答文本 |
| audio_url | VARCHAR(255) | 回答音频URL，可选 |
| analysis_data | JSON | 面部表情时间序列，可选 |
| score | DECIMAL(5,2) | AI评分，可选 |
| ai_feedback | JSON | AI即时反馈，可选 |
| created_at | DATETIME | 出题时间 |
| answered_at | DATETIME | 回答时间，可选 |
| evaluated_at | DATETIME | 评估时间，可选 |

## 实体 4：Resume（简历）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| title | VARCHAR(200) | 简历标题 |
| file | VARCHAR(100) | 上传文件路径，可选 |
| parsed_content | LONGTEXT | OCR解析文本 |
| content_json | JSON | 在线编辑JSON，可选 |
| template_name | VARCHAR(50) | 模板标识，默认'default' |
| status | VARCHAR(20) | draft/published/parsed/failed |
| full_name | VARCHAR(100) | 姓名 |
| phone | VARCHAR(20) | 电话 |
| email | VARCHAR(254) | 邮箱 |
| job_title | VARCHAR(100) | 期望职位 |
| city | VARCHAR(50) | 城市 |
| summary | LONGTEXT | 个人总结 |
| is_default | BOOL | 是否默认简历 |
| optimization_suggestions | JSON | AI优化建议，可选 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 实体 5：ResumeAnalysisReport（简历分析报告）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | UUID | 主键 |
| jd_text | LONGTEXT | 目标岗位JD原文 |
| report_data | JSON | AI分析报告JSON |
| overall_score | INT | 综合匹配度得分 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 实体 6：ActivityLog（操作日志）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| action_type | VARCHAR(50) | 8种操作类型枚举 |
| action_status | VARCHAR(20) | success/warning/error |
| action_data | JSON | 操作上下文数据 |
| resource_type | VARCHAR(20) | interview/resume/report |
| resource_id | VARCHAR(255) | 关联资源ID |
| is_read | BOOL | 是否已读，默认FALSE |
| timestamp | DATETIME | 操作时间，自动 |

## 实体 7：AIModel（AI模型）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| name | VARCHAR(100) | 模型显示名称 |
| model_slug | VARCHAR(100) | 调用标识，UNIQUE |
| base_url | VARCHAR(255) | API Base URL |
| description | LONGTEXT | 模型描述，可选 |
| is_active | BOOL | 是否启用 |
| supports_json_mode | BOOL | 是否支持JSON Mode |

## 实体 8：AISetting（AI设置）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| api_keys | JSON | {模型ID: API Key}映射 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 实体 9：Industry（行业分类）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| name | VARCHAR(100) | 行业名称，UNIQUE |
| description | LONGTEXT | 行业描述，可选 |
| order | INT | 排序权重 |
| is_active | BOOL | 是否启用 |

## 实体 10：JobPosition（面试岗位）
| 属性 | 类型 | 说明 |
|------|------|------|
| **_id_** | INT | 主键，自增 |
| name | VARCHAR(100) | 岗位名称，UNIQUE |
| description | LONGTEXT | 岗位描述，可选 |
| icon_svg | LONGTEXT | 图标SVG代码，可选 |
| is_active | BOOL | 是否启用 |
| order | INT | 排序权重 |

---

## 关系列表（菱形，共10条）

| 编号 | 关系名 | 左实体 | 右实体 | 左基数 | 右基数 | 说明 |
|------|--------|--------|--------|--------|--------|------|
| R1 | 拥有 | User | InterviewSession | 1 | N | 一个用户可创建多次面试 |
| R2 | 关联 | InterviewSession | Resume | N | 1 | 面试可选关联简历（右端可为0） |
| R3 | 包含 | InterviewSession | InterviewQuestion | 1 | N | 一次面试包含多道题目 |
| R4 | 拥有 | User | Resume | 1 | N | 一个用户可创建多份简历 |
| R5 | 创建 | User | ResumeAnalysisReport | 1 | N | 一个用户可创建多次诊断 |
| R6 | 诊断 | Resume | ResumeAnalysisReport | 1 | N | 一份简历可被多次诊断 |
| R7 | 产生 | User | ActivityLog | 1 | N | 一个用户产生多条日志 |
| R8 | 配置 | User | AISetting | 1 | 1 | 一对一，每个用户一份AI设置 |
| R9 | 选用 | AISetting | AIModel | N | 1 | 一份设置引用一个默认模型 |
| R10 | 归属 | Industry | JobPosition | 1 | N | 一个行业包含多个岗位 |

---

## 布局建议（自上而下分4层）

```
第1层:  User（居中）
        ├── R8[配置] ── AISetting ── R9[选用] ── AIModel
        ├── R7[产生] ── ActivityLog
        └── R4[拥有] ── Resume ── R6[诊断] ── ResumeAnalysisReport
                              │                     │
                             R2[关联]              R5[创建]── User(已有)
                              │
第2层:                  InterviewSession
                              │
                             R3[包含]
                              │
第3层:                 InterviewQuestion

第4层:  Industry ── R10[归属] ── JobPosition
```

## 注意事项
- R2（关联）在 Resume 端标 0..1（可选），InterviewSession 端标 N
- R8（配置）两端都标 1，是一对一关系
- Resume 实体的属性最多（17个椭圆），画的时候注意间距
- 主键属性名用粗体或下划线标出
- JSON 类型的属性在椭圆中标注类型后缀，如 `report (JSON)`
