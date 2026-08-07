from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional

from app.database import get_db
from app.models import User, Lead, Business, ActivityLog
from app.schemas import LeadResponse, LeadDetailResponse, LeadStatusUpdate, LeadAssignRequest, LeadsPaginatedResponse
from app.routers.auth import get_current_user
from app.services import AILeadAnalyzerService

router = APIRouter(prefix="/leads", tags=["leads"])

@router.post("/save/{business_id}", response_model=LeadResponse)
def save_lead(
    business_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    existing_lead = db.query(Lead).filter(Lead.business_id == business_id).first()
    if existing_lead:
        return existing_lead
        
    base_score, priority = AILeadAnalyzerService._calculate_lead_score(
        website=biz.website,
        email=biz.email,
        rating=biz.google_rating or 0.0,
        reviews_count=biz.reviews_count or 0,
        ssl_enabled=biz.ssl_enabled or False,
        website_score=biz.website_score or 0
    )
    new_lead = Lead(
        business_id=business_id,
        assigned_to_user_id=current_user.id,
        status="New",
        priority=priority,
        lead_score=base_score
    )
    db.add(new_lead)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="LEAD_SAVE",
        description=f"Saved lead: '{biz.name}'"
    )
    db.add(log)
    db.commit()
    db.refresh(new_lead)
    return new_lead

@router.get("", response_model=LeadsPaginatedResponse)
def get_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    search_query: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = None,
    min_rating: Optional[float] = None,
    has_website: Optional[bool] = None,
    has_phone: Optional[bool] = None,
    score_category: Optional[str] = None,
    assigned_to_me_only: Optional[bool] = False,
    sort_by: str = "created_at",
    order: str = "desc"
):
    query = db.query(Lead).join(Business)
    
    if search_query:
        query = query.filter(Business.name.ilike(f"%{search_query}%"))
        
    if industry:
        query = query.filter(Business.industry.ilike(industry))
        
    if status:
        query = query.filter(Lead.status == status)
        
    if min_rating is not None:
        query = query.filter(Business.google_rating >= min_rating)
        
    if has_website is not None:
        if has_website:
            query = query.filter(Business.website != None, Business.website != "")
        else:
            query = query.filter((Business.website == None) | (Business.website == ""))
            
    if has_phone is not None:
        if has_phone:
            query = query.filter(Business.phone != None, Business.phone != "")
        else:
            query = query.filter((Business.phone == None) | (Business.phone == ""))

    if assigned_to_me_only:
        query = query.filter(Lead.assigned_to_user_id == current_user.id)

    if score_category:
        if score_category.lower() == "hot":
            query = query.filter(Lead.lead_score >= 75)
        elif score_category.lower() == "warm":
            query = query.filter(Lead.lead_score >= 40, Lead.lead_score < 75)
        elif score_category.lower() == "cold":
            query = query.filter(Lead.lead_score < 40)
            
    sort_attr = None
    if sort_by == "rating":
        sort_attr = Business.google_rating
    elif sort_by == "reviews":
        sort_attr = Business.reviews_count
    elif sort_by == "score":
        sort_attr = Lead.lead_score
    elif sort_by == "name":
        sort_attr = Business.name
    else:
        sort_attr = Lead.created_at
        
    if order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(asc(sort_attr))
        
    total = query.count()
    leads = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "leads": leads,
        "skip": skip,
        "limit": limit
    }

@router.get("/{lead_id}")
def get_lead_details(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Check if lead_id matches Lead.id directly
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        return LeadDetailResponse.model_validate(lead)

    # 2. Check if lead_id matches a Business.id with an existing Lead
    biz_lead = db.query(Lead).filter(Lead.business_id == lead_id).first()
    if biz_lead:
        return LeadDetailResponse.model_validate(biz_lead)

    # 3. Check if lead_id matches a Business.id without a Lead yet (Auto-save & create Lead profile)
    biz = db.query(Business).filter(Business.id == lead_id).first()
    if biz:
        base_score, priority = AILeadAnalyzerService._calculate_lead_score(
            website=biz.website,
            email=biz.email,
            rating=biz.google_rating or 0.0,
            reviews_count=biz.reviews_count or 0,
            ssl_enabled=biz.ssl_enabled or False,
            website_score=biz.website_score or 0
        )
        new_lead = Lead(
            business_id=biz.id,
            assigned_to_user_id=current_user.id,
            status="New",
            priority=priority,
            lead_score=base_score
        )
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        return LeadDetailResponse.model_validate(new_lead)

    raise HTTPException(status_code=404, detail="Lead profile not found")

@router.post("/{lead_id}/assign")
def assign_lead(
    lead_id: int,
    req: LeadAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Assigned employee not found")

    # Guard: Employees can only reassign if Admin or if assigned to them or unassigned
    if current_user.role != "admin" and lead.assigned_to_user_id and lead.assigned_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot reassign a lead assigned to another employee.")

    lead.assigned_to_user_id = target_user.id
    db.commit()
    db.refresh(lead)

    log = ActivityLog(
        user_id=current_user.id,
        action="LEAD_ASSIGNED",
        description=f"Assigned lead '{lead.business.name}' to '{target_user.full_name or target_user.email}'"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "lead_id": lead.id, "assigned_to": target_user.full_name or target_user.email}

@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    status_update: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Guard: Employees can only update status on their own assigned leads (or unassigned leads)
    if current_user.role != "admin" and lead.assigned_to_user_id and lead.assigned_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot edit leads assigned to another employee.")

    lead.status = status_update.status
    db.commit()
    db.refresh(lead)
    return lead

@router.post("/{lead_id}/analyze", response_model=LeadDetailResponse)
def analyze_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    analysis_data = AILeadAnalyzerService.analyze_lead(
        lead_name=lead.business.name,
        website=lead.business.website,
        rating=lead.business.google_rating,
        reviews_count=lead.business.reviews_count,
        industry=lead.business.industry or "Local Business"
    )
    
    lead.lead_score = analysis_data["lead_score"]
    lead.ai_summary = analysis_data["ai_summary"]
    lead.ai_strengths = analysis_data["ai_strengths"]
    lead.ai_weaknesses = analysis_data["ai_weaknesses"]
    lead.ai_digital_presence = analysis_data["ai_digital_presence"]
    lead.ai_website_analysis = analysis_data["ai_website_analysis"]
    lead.ai_seo_opportunity = analysis_data["ai_seo_opportunity"]
    lead.ai_marketing_opportunity = analysis_data["ai_marketing_opportunity"]
    lead.ai_sales_opportunity = analysis_data["ai_sales_opportunity"]
    lead.ai_recommended_services = analysis_data["ai_recommended_services"]
    
    log = ActivityLog(
        user_id=current_user.id,
        action="LEAD_ANALYZE",
        description=f"Analyzed lead '{lead.business.name}' using AI. Score: {lead.lead_score}"
    )
    db.add(log)
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Guard: Employees can only delete leads assigned to them (or unassigned leads)
    if current_user.role != "admin" and lead.assigned_to_user_id and lead.assigned_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot delete leads assigned to another employee.")
        
    db.delete(lead)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="LEAD_DELETE",
        description=f"Deleted saved lead ID {lead_id}"
    )
    db.add(log)
    db.commit()
    return None
