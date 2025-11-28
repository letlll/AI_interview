"""
初始化行业和岗位数据
运行方式: python 初始化行业岗位数据.py
"""
import os
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from system.models import Industry, JobPosition

def init_industries_and_jobs():
    """初始化行业和岗位数据"""
    
    print("=" * 60)
    print("开始初始化行业和岗位数据...")
    print("=" * 60)
    
    # 定义行业和岗位数据
    industries_data = [
        {
            'name': '互联网/IT',
            'description': '互联网、软件开发、人工智能等技术领域',
            'order': 1,
            'jobs': [
                {'name': '前端工程师', 'description': '负责Web前端开发，使用Vue/React等框架'},
                {'name': '后端工程师', 'description': '负责服务端开发，使用Java/Python/Go等语言'},
                {'name': '全栈工程师', 'description': '同时负责前端和后端开发'},
                {'name': '算法工程师', 'description': '负责机器学习、深度学习算法研发'},
                {'name': '数据分析师', 'description': '负责数据分析、数据挖掘和可视化'},
                {'name': '产品经理', 'description': '负责产品规划、需求分析和项目管理'},
                {'name': 'UI/UX设计师', 'description': '负责用户界面和用户体验设计'},
                {'name': '测试工程师', 'description': '负责软件测试、质量保证'},
                {'name': '运维工程师', 'description': '负责系统运维、DevOps'},
            ]
        },
        {
            'name': '金融/投资',
            'description': '银行、证券、保险、投资等金融服务领域',
            'order': 2,
            'jobs': [
                {'name': '投资分析师', 'description': '负责投资项目分析和评估'},
                {'name': '风险管理师', 'description': '负责风险识别、评估和控制'},
                {'name': '金融产品经理', 'description': '负责金融产品设计和运营'},
                {'name': '量化交易员', 'description': '负责量化策略开发和交易执行'},
                {'name': '财务分析师', 'description': '负责财务分析和预算管理'},
            ]
        },
        {
            'name': '教育/培训',
            'description': '教育机构、在线教育、职业培训等领域',
            'order': 3,
            'jobs': [
                {'name': '教师/讲师', 'description': '负责课程教学和学生辅导'},
                {'name': '课程设计师', 'description': '负责课程内容设计和开发'},
                {'name': '教育产品经理', 'description': '负责教育产品规划和运营'},
                {'name': '教研专家', 'description': '负责教学研究和教材开发'},
            ]
        },
        {
            'name': '医疗/健康',
            'description': '医院、制药、医疗器械、健康管理等领域',
            'order': 4,
            'jobs': [
                {'name': '医生', 'description': '负责疾病诊断和治疗'},
                {'name': '护士', 'description': '负责患者护理和健康管理'},
                {'name': '医药代表', 'description': '负责医药产品推广和销售'},
                {'name': '健康管理师', 'description': '负责健康咨询和管理服务'},
            ]
        },
        {
            'name': '制造/工程',
            'description': '制造业、工程建设、机械设备等领域',
            'order': 5,
            'jobs': [
                {'name': '机械工程师', 'description': '负责机械设计和制造'},
                {'name': '电气工程师', 'description': '负责电气系统设计和维护'},
                {'name': '质量工程师', 'description': '负责质量控制和改进'},
                {'name': '生产管理', 'description': '负责生产计划和现场管理'},
            ]
        },
        {
            'name': '市场/营销',
            'description': '市场营销、品牌推广、公关传播等领域',
            'order': 6,
            'jobs': [
                {'name': '市场营销经理', 'description': '负责市场策略和营销活动'},
                {'name': '品牌经理', 'description': '负责品牌建设和推广'},
                {'name': '新媒体运营', 'description': '负责社交媒体和内容运营'},
                {'name': '公关专员', 'description': '负责公关活动和媒体关系'},
            ]
        },
        {
            'name': '销售/客服',
            'description': '销售、客户服务、商务拓展等领域',
            'order': 7,
            'jobs': [
                {'name': '销售代表', 'description': '负责产品销售和客户开发'},
                {'name': '客户经理', 'description': '负责客户关系维护和管理'},
                {'name': '商务拓展', 'description': '负责商务合作和渠道拓展'},
                {'name': '客服专员', 'description': '负责客户咨询和售后服务'},
            ]
        },
        {
            'name': '人力资源',
            'description': '招聘、培训、薪酬、员工关系等领域',
            'order': 8,
            'jobs': [
                {'name': '招聘专员', 'description': '负责人才招聘和面试'},
                {'name': '培训专员', 'description': '负责员工培训和发展'},
                {'name': '薪酬福利专员', 'description': '负责薪酬设计和福利管理'},
                {'name': 'HRBP', 'description': '负责人力资源业务合作伙伴'},
            ]
        },
        {
            'name': '法律/咨询',
            'description': '法律服务、管理咨询、战略咨询等领域',
            'order': 9,
            'jobs': [
                {'name': '律师', 'description': '负责法律咨询和诉讼代理'},
                {'name': '法务专员', 'description': '负责企业法务和合规管理'},
                {'name': '管理咨询顾问', 'description': '负责企业管理咨询服务'},
                {'name': '战略分析师', 'description': '负责战略规划和分析'},
            ]
        },
        {
            'name': '设计/创意',
            'description': '平面设计、工业设计、创意策划等领域',
            'order': 10,
            'jobs': [
                {'name': '平面设计师', 'description': '负责视觉设计和品牌设计'},
                {'name': '工业设计师', 'description': '负责产品外观和结构设计'},
                {'name': '室内设计师', 'description': '负责室内空间设计'},
                {'name': '创意策划', 'description': '负责创意方案和活动策划'},
            ]
        },
    ]
    
    # 创建行业和岗位
    created_industries = 0
    created_jobs = 0
    
    for industry_data in industries_data:
        # 创建或获取行业
        industry, created = Industry.objects.get_or_create(
            name=industry_data['name'],
            defaults={
                'description': industry_data['description'],
                'order': industry_data['order'],
                'is_active': True
            }
        )
        
        if created:
            created_industries += 1
            print(f"✓ 创建行业: {industry.name}")
        else:
            print(f"- 行业已存在: {industry.name}")
        
        # 创建岗位
        for job_data in industry_data['jobs']:
            job, created = JobPosition.objects.get_or_create(
                name=job_data['name'],
                defaults={
                    'industry': industry,
                    'description': job_data['description'],
                    'is_active': True
                }
            )
            
            if created:
                created_jobs += 1
                print(f"  ✓ 创建岗位: {job.name}")
            else:
                # 如果岗位已存在但没有关联行业，更新它
                if not job.industry:
                    job.industry = industry
                    job.save()
                    print(f"  ✓ 更新岗位: {job.name} -> {industry.name}")
    
    print("=" * 60)
    print(f"初始化完成！")
    print(f"新增行业: {created_industries} 个")
    print(f"新增岗位: {created_jobs} 个")
    print(f"总行业数: {Industry.objects.count()} 个")
    print(f"总岗位数: {JobPosition.objects.count()} 个")
    print("=" * 60)
    
    # 显示统计信息
    print("\n行业和岗位统计:")
    for industry in Industry.objects.all().order_by('order'):
        job_count = industry.job_positions.count()
        print(f"  {industry.name}: {job_count} 个岗位")

if __name__ == '__main__':
    init_industries_and_jobs()
