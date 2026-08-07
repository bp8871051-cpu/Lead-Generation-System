from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.models import User, Lead, Business, Campaign, Search
from app.schemas import DashboardStats
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Core Totals
    total_leads = db.query(Lead).count()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_leads = db.query(Lead).filter(
        Lead.created_at >= today_start
    ).count()

    # Unique Leads & Duplicates count
    unique_leads = db.query(Business).filter(Business.google_place_id.isnot(None)).distinct(Business.google_place_id).count()
    if unique_leads == 0:
        unique_leads = total_leads

    duplicate_stats = db.query(func.sum(Search.duplicates_removed_count)).scalar() or 0
    duplicate_count = int(duplicate_stats)

    # Technical website metrics
    website_missing = db.query(Business).filter(
        (Business.website == None) | (Business.website == "") | (Business.website == "N/A")
    ).count()

    avg_web_score = db.query(func.avg(Business.website_score)).scalar() or 0.0
    avg_website_score = round(float(avg_web_score), 1)

    high_priority_leads = db.query(Lead).filter(
        (Lead.priority == "High") | (Lead.lead_score >= 65)
    ).count()

    avg_rating_val = db.query(func.avg(Business.google_rating)).scalar() or 4.2
    average_rating = round(float(avg_rating_val), 1)
    
    hot_leads = high_priority_leads
    campaigns_count = db.query(Campaign).filter(Campaign.user_id == current_user.id).count()
    
    # Conversion Rate: Won leads / Total leads
    won_leads = db.query(Lead).filter(
        Lead.status == "Won"
    ).count()
    conversion_rate = round((won_leads / total_leads * 100), 1) if total_leads > 0 else 0.0
    
    # 2. Daily Leads Chart Data (Last 7 Days)
    daily_leads = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        cnt = db.query(Lead).filter(
            Lead.created_at >= day_start,
            Lead.created_at <= day_end
        ).count()
        
        daily_leads.append({
            "date": day.strftime("%b %d"),
            "count": cnt
        })
        
    # 3. Industry Distribution
    industry_data = db.query(
        Business.industry, 
        func.count(Lead.id)
    ).join(Lead).group_by(
        Business.industry
    ).all()
    
    industry_distribution = []
    for industry_name, count in industry_data:
        industry_distribution.append({
            "industry": industry_name or "Unknown",
            "count": count
        })
        
    if not industry_distribution:
        industry_distribution = [
            {"industry": "Restaurant", "count": 0},
            {"industry": "Gym", "count": 0},
            {"industry": "Real Estate", "count": 0},
            {"industry": "Healthcare", "count": 0}
        ]
        
    # 4. Lead Score Distribution
    ranges = [
        {"range": "0-20 (Very Cold)", "min": 0, "max": 20},
        {"range": "21-40 (Cold)", "min": 21, "max": 40},
        {"range": "41-60 (Neutral)", "min": 41, "max": 60},
        {"range": "61-80 (Warm)", "min": 61, "max": 80},
        {"range": "81-100 (Hot)", "min": 81, "max": 100}
    ]
    
    score_distribution = []
    for r in ranges:
        cnt = db.query(Lead).filter(
            Lead.lead_score >= r["min"],
            Lead.lead_score <= r["max"]
        ).count()
        
        score_distribution.append({
            "range": r["range"],
            "count": cnt
        })
        
    return {
        "total_leads": total_leads,
        "today_leads": today_leads,
        "unique_leads": unique_leads,
        "duplicate_count": duplicate_count,
        "website_missing": website_missing,
        "avg_website_score": avg_website_score,
        "high_priority_leads": high_priority_leads,
        "average_rating": average_rating,
        "hot_leads": hot_leads,
        "campaigns_count": campaigns_count,
        "conversion_rate": conversion_rate,
        "daily_leads": daily_leads,
        "industry_distribution": industry_distribution,
        "score_distribution": score_distribution
    }
