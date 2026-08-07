from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.models import User, Business, Lead, Note, Task, ActivityLog
from app.schemas import NoteCreate, NoteResponse, TaskCreate, TaskResponse, TaskUpdate, LeadStatusUpdate, LeadResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/crm", tags=["crm"])

# CRM Pipeline Stages
PIPELINE_STAGES = ["New", "Contacted", "Interested", "Meeting", "Proposal Sent", "Won", "Lost"]

@router.get("/pipeline", response_model=Dict[str, List[LeadResponse]])
def get_pipeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all saved leads grouped by their CRM pipeline stage.
    """
    leads = db.query(Lead).all()
    
    # Initialize groups
    groups = {stage: [] for stage in PIPELINE_STAGES}
    for lead in leads:
        status = lead.status if lead.status in PIPELINE_STAGES else "New"
        groups[status].append(lead)
        
    return groups

def _resolve_lead(lead_id: int, db: Session, current_user: User) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        return lead
    biz_lead = db.query(Lead).filter(Lead.business_id == lead_id).first()
    if biz_lead:
        return biz_lead
    biz = db.query(Business).filter(Business.id == lead_id).first()
    if biz:
        from app.services import AILeadAnalyzerService
        base_score, priority = AILeadAnalyzerService._calculate_lead_score(
            website=biz.website, email=biz.email, rating=biz.google_rating or 0.0,
            reviews_count=biz.reviews_count or 0, ssl_enabled=biz.ssl_enabled or False,
            website_score=biz.website_score or 0
        )
        new_lead = Lead(business_id=biz.id, assigned_to_user_id=current_user.id, status="New", priority=priority, lead_score=base_score)
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        return new_lead
    raise HTTPException(status_code=404, detail="Lead profile not found")

@router.patch("/leads/{lead_id}/status", response_model=LeadResponse)
def update_lead_status(
    lead_id: int,
    status_update: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if status_update.status not in PIPELINE_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline status. Must be one of {PIPELINE_STAGES}"
        )
        
    lead = _resolve_lead(lead_id, db, current_user)
        
    old_status = lead.status
    lead.status = status_update.status
    
    # Log CRM transition
    log = ActivityLog(
        user_id=current_user.id,
        action="LEAD_STAGE_CHANGE",
        description=f"Moved lead '{lead.business.name}' from '{old_status}' to '{status_update.status}'"
    )
    db.add(log)
    db.commit()
    db.refresh(lead)
    return lead

# CRM Notes
@router.post("/leads/{lead_id}/notes", response_model=NoteResponse)
def add_note(
    lead_id: int,
    note_in: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(lead_id, db, current_user)
        
    new_note = Note(
        lead_id=lead.id,
        content=note_in.content,
        author_name=current_user.full_name or current_user.email
    )
    db.add(new_note)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="NOTE_CREATE",
        description=f"Added note to lead '{lead.business.name}'"
    )
    db.add(log)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/leads/{lead_id}/notes", response_model=List[NoteResponse])
def get_notes(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(lead_id, db, current_user)
    return db.query(Note).filter(Note.lead_id == lead.id).order_by(Note.created_at.desc()).all()

# CRM Tasks
@router.post("/leads/{lead_id}/tasks", response_model=TaskResponse)
def add_task(
    lead_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(lead_id, db, current_user)
        
    new_task = Task(
        lead_id=lead.id,
        title=task_in.title,
        due_date=task_in.due_date,
        status="Pending"
    )
    db.add(new_task)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="TASK_CREATE",
        description=f"Created task '{task_in.title}' for lead '{lead.business.name}'"
    )
    db.add(log)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/leads/{lead_id}/tasks", response_model=List[TaskResponse])
def get_tasks(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(lead_id, db, current_user)
    return db.query(Task).filter(Task.lead_id == lead.id).order_by(Task.due_date.asc(), Task.created_at.desc()).all()

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).join(Lead).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = task_update.status
    db.commit()
    db.refresh(task)
    return task
