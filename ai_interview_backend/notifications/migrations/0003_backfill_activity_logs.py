from django.db import migrations


def backfill_activity_logs(apps, schema_editor):
    ActivityLog = apps.get_model('notifications', 'ActivityLog')
    InterviewSession = apps.get_model('interviews', 'InterviewSession')
    InterviewQuestion = apps.get_model('interviews', 'InterviewQuestion')
    Resume = apps.get_model('resumes', 'Resume')
    ResumeAnalysisReport = apps.get_model('reports', 'ResumeAnalysisReport')
    Conversation = apps.get_model('chat', 'Conversation')
    User = apps.get_model('users', 'User')

    def create_log(user, action_type, action_status, resource_type, resource_id, action_data):
        return ActivityLog.objects.create(
            user=user,
            action_type=action_type,
            action_status=action_status,
            resource_type=resource_type,
            resource_id=str(resource_id),
            action_data=action_data,
        )

    # 1. Interview sessions
    for session in InterviewSession.objects.all():
        answered = InterviewQuestion.objects.filter(
            session=session, answer_text__gt=''
        ).count()
        score = session.report.get('total_score') if isinstance(session.report, dict) else None

        if session.status == 'running':
            create_log(
                session.user, 'interview_started', 'success', 'interview',
                session.id, {'job_position': session.job_position, 'total': session.question_count},
            )
        elif session.status == 'finished':
            create_log(
                session.user, 'interview_started', 'success', 'interview',
                session.id, {'job_position': session.job_position, 'total': session.question_count},
            )
            create_log(
                session.user, 'interview_completed', 'success', 'interview',
                session.id, {
                    'job_position': session.job_position, 'score': score,
                    'total': session.question_count, 'answered': answered,
                },
            )
            if session.report:
                create_log(
                    session.user, 'report_generated', 'success', 'report',
                    session.id, {
                        'report_type': '面试', 'score': score,
                        'job_position': session.job_position,
                    },
                )
        elif session.status == 'canceled':
            create_log(
                session.user, 'interview_aborted', 'warning', 'interview',
                session.id, {
                    'job_position': session.job_position,
                    'answered': answered, 'total': session.question_count,
                },
            )

    # 2. Resumes
    for resume in Resume.objects.all():
        if resume.status == 'parsed':
            create_log(
                resume.user, 'resume_generated', 'success', 'resume',
                resume.id, {
                    'template_name': resume.template_name or resume.title,
                    'method': '文件解析',
                },
            )
        elif resume.status == 'published':
            create_log(
                resume.user, 'resume_generated', 'success', 'resume',
                resume.id, {
                    'template_name': resume.template_name or resume.title,
                    'method': '在线创建',
                },
            )
            create_log(
                resume.user, 'resume_saved', 'success', 'resume',
                resume.id, {'template_name': resume.template_name or resume.title},
            )
        elif resume.status == 'draft' and resume.content_json:
            create_log(
                resume.user, 'resume_generated', 'success', 'resume',
                resume.id, {
                    'template_name': resume.template_name or resume.title,
                    'method': '在线创建',
                },
            )

    # 3. Resume analysis reports
    for report in ResumeAnalysisReport.objects.select_related('resume').all():
        create_log(
            report.user, 'resume_diagnosed', 'success', 'report',
            report.id, {
                'score': report.overall_score,
                'template_name': report.resume.title if report.resume else '',
            },
        )

    # 4. AI conversations with linked resumes
    for conv in Conversation.objects.filter(
        resume__isnull=False, conversation_type='user_ai'
    ).select_related('resume'):
        create_log(
            conv.participants.first(), 'resume_generated', 'success', 'resume',
            conv.id, {
                'template_name': conv.resume.title if conv.resume else '简历',
                'method': 'AI 对话生成',
            },
        )


def reverse_backfill(apps, schema_editor):
    ActivityLog = apps.get_model('notifications', 'ActivityLog')
    ActivityLog.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('notifications', '0002_activitylog'),
        ('interviews', '__latest__'),
        ('resumes', '__latest__'),
        ('reports', '__latest__'),
        ('chat', '__latest__'),
    ]

    operations = [
        migrations.RunPython(backfill_activity_logs, reverse_backfill),
    ]
