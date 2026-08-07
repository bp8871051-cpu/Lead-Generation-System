from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv
import json
from typing import List

from app.database import get_db
from app.models import User, Lead, Business
from app.routers.auth import get_current_user

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/csv")
def export_leads_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    leads = db.query(Lead).filter(Lead.organization_id == org_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Lead ID", "Business Name", "Industry", "Phone", "Email", "Website",
        "Address", "City", "State", "Country", "Google Rating", "Reviews Count",
        "Website Score", "SSL Enabled", "Tech Stack", "Lead Priority", "Lead Score",
        "Status", "Google Maps URL", "Created At"
    ])

    for l in leads:
        b = l.business
        if not b: continue
        writer.writerow([
            l.id,
            b.name or "",
            b.industry or "",
            b.phone or "",
            b.email or "",
            b.website or "",
            b.address or "",
            b.city or "",
            b.state or "",
            b.country or "",
            b.google_rating or 0.0,
            b.reviews_count or 0,
            b.website_score or 0,
            "Yes" if b.ssl_enabled else "No",
            b.tech_stack or "",
            l.priority or "Medium",
            l.lead_score or 50,
            l.status or "New",
            b.maps_url or "",
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )

@router.get("/json")
def export_leads_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    leads = db.query(Lead).filter(Lead.organization_id == org_id).all()

    export_data = []
    for l in leads:
        b = l.business
        if not b: continue
        export_data.append({
            "lead_id": l.id,
            "business_name": b.name,
            "industry": b.industry,
            "phone": b.phone,
            "email": b.email,
            "website": b.website,
            "address": b.address,
            "city": b.city,
            "state": b.state,
            "country": b.country,
            "google_rating": b.google_rating,
            "reviews_count": b.reviews_count,
            "opening_hours": b.opening_hours,
            "maps_url": b.maps_url,
            "technical_audit": {
                "website_score": b.website_score,
                "ssl_enabled": b.ssl_enabled,
                "mobile_friendly": b.mobile_friendly,
                "tech_stack": b.tech_stack,
                "meta_title": b.meta_title,
                "meta_description": b.meta_description,
                "has_analytics": b.has_analytics,
                "has_pixel": b.has_pixel
            },
            "crm": {
                "status": l.status,
                "priority": l.priority,
                "lead_score": l.lead_score
            },
            "created_at": l.created_at.isoformat() if l.created_at else None
        })

    json_bytes = json.dumps(export_data, indent=2).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=leads_export.json"}
    )

@router.get("/excel")
def export_leads_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # CSV fallback with tab-delimited Excel format
    org_id = current_user.organization_id
    leads = db.query(Lead).filter(Lead.organization_id == org_id).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter='\t')

    writer.writerow([
        "Lead ID", "Business Name", "Industry", "Phone", "Email", "Website",
        "Address", "City", "State", "Country", "Google Rating", "Reviews Count",
        "Website Score", "SSL Enabled", "Tech Stack", "Lead Priority", "Lead Score",
        "Status", "Google Maps URL", "Created At"
    ])

    for l in leads:
        b = l.business
        if not b: continue
        writer.writerow([
            l.id,
            b.name or "",
            b.industry or "",
            b.phone or "",
            b.email or "",
            b.website or "",
            b.address or "",
            b.city or "",
            b.state or "",
            b.country or "",
            b.google_rating or 0.0,
            b.reviews_count or 0,
            b.website_score or 0,
            "Yes" if b.ssl_enabled else "No",
            b.tech_stack or "",
            l.priority or "Medium",
            l.lead_score or 50,
            l.status or "New",
            b.maps_url or "",
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="application/vnd.ms-excel",
        headers={"Content-Disposition": "attachment; filename=leads_export.xls"}
    )
