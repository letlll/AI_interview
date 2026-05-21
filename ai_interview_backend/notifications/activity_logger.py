from .models import ActivityLog


def _create(user, action_type, action_status, resource_type, resource_id, action_data):
    return ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        action_status=action_status,
        resource_type=resource_type,
        resource_id=str(resource_id),
        action_data=action_data,
    )


def log_interview_started(user, session):
    return _create(
        user,
        action_type=ActivityLog.ActionType.INTERVIEW_STARTED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.INTERVIEW,
        resource_id=session.id,
        action_data={
            'job_position': session.job_position,
            'total': session.question_count,
        },
    )


def log_interview_completed(user, session):
    score = session.report.get('total_score') if isinstance(session.report, dict) else None
    answered = session.questions.filter(answer_text__gt='').count()
    return _create(
        user,
        action_type=ActivityLog.ActionType.INTERVIEW_COMPLETED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.INTERVIEW,
        resource_id=session.id,
        action_data={
            'job_position': session.job_position,
            'score': score,
            'total': session.question_count,
            'answered': answered,
        },
    )


def log_interview_aborted(user, session):
    answered = session.questions.filter(answer_text__gt='').count()
    return _create(
        user,
        action_type=ActivityLog.ActionType.INTERVIEW_ABORTED,
        action_status=ActivityLog.ActionStatus.WARNING,
        resource_type=ActivityLog.ResourceType.INTERVIEW,
        resource_id=session.id,
        action_data={
            'job_position': session.job_position,
            'answered': answered,
            'total': session.question_count,
        },
    )


def log_resume_generated(user, resume, method='在线编辑'):
    return _create(
        user,
        action_type=ActivityLog.ActionType.RESUME_GENERATED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.RESUME,
        resource_id=resume.id,
        action_data={
            'template_name': resume.template_name or resume.title,
            'method': method,
        },
    )


def log_resume_saved(user, resume):
    return _create(
        user,
        action_type=ActivityLog.ActionType.RESUME_SAVED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.RESUME,
        resource_id=resume.id,
        action_data={
            'template_name': resume.template_name or resume.title,
        },
    )


def log_resume_exported(user, resume, pages, download_url=''):
    return _create(
        user,
        action_type=ActivityLog.ActionType.RESUME_EXPORTED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.RESUME,
        resource_id=resume.id,
        action_data={
            'template_name': resume.template_name or resume.title,
            'pages': pages,
            'download_url': download_url,
        },
    )


def log_resume_diagnosed(user, report):
    return _create(
        user,
        action_type=ActivityLog.ActionType.RESUME_DIAGNOSED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.REPORT,
        resource_id=report.id,
        action_data={
            'score': report.overall_score,
            'template_name': report.resume.title if report.resume else '',
        },
    )


def log_report_generated(user, session):
    score = session.report.get('total_score') if isinstance(session.report, dict) else None
    return _create(
        user,
        action_type=ActivityLog.ActionType.REPORT_GENERATED,
        action_status=ActivityLog.ActionStatus.SUCCESS,
        resource_type=ActivityLog.ResourceType.REPORT,
        resource_id=session.id,
        action_data={
            'report_type': '面试',
            'score': score,
            'job_position': session.job_position,
        },
    )
