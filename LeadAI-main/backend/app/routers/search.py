from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import time
from fastapi.responses import HTMLResponse

from app.database import get_db
from app.models import User, Search, Business, ActivityLog
from app.schemas import SearchCreate, BusinessResponse, LinkScrapeRequest
from app.routers.auth import get_current_user
from app.services import ApifyGoogleMapsService, DeduplicationService, AILeadScraperService

router = APIRouter(prefix="/search", tags=["search"])

@router.post("", response_model=List[BusinessResponse])
def run_search(
    search_in: SearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = time.time()
    is_multi = search_in.multi_category or search_in.category.lower() in ["all", "multi", "all categories"]
    
    # 1. Fetch raw leads via Google Maps Scraper (Apify)
    try:
        if is_multi:
            cats = search_in.categories_list if search_in.categories_list else ApifyGoogleMapsService.DEFAULT_CATEGORIES
            raw_leads = ApifyGoogleMapsService.search_multi_category_parallel(
                categories=cats,
                location=search_in.location,
                max_results_per_cat=max(5, search_in.max_results // len(cats) if len(cats) > 0 else 5)
            )
        else:
            raw_leads = ApifyGoogleMapsService.search_google_maps(
                category=search_in.category,
                location=search_in.location,
                radius=int(search_in.radius or 5000),
                max_results=search_in.max_results or 20
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch Google Maps leads: {str(e)}")

    total_scraped = len(raw_leads)

    # 2. Run multi-level Deduplication
    existing_db_businesses = db.query(Business).all()
    unique_leads, dupes_removed = DeduplicationService.deduplicate_leads(raw_leads, existing_db_businesses)

    duration_ms = round((time.time() - start_time) * 1000, 2)

    # 3. Log search criteria & metrics
    new_search = Search(
        category=search_in.category,
        location=search_in.location,
        radius=search_in.radius or 5000.0,
        max_results=search_in.max_results or 20,
        total_results=total_scraped,
        new_leads_count=len(unique_leads),
        duplicates_removed_count=dupes_removed,
        is_multi_search=is_multi,
        duration_ms=duration_ms,
        status="Completed",
        user_id=current_user.id
    )
    db.add(new_search)
    db.flush() # populated new_search.id

    saved_businesses = []
    for idx, biz_data in enumerate(unique_leads):
        place_id = biz_data.get("google_place_id") or f"lead_{int(time.time())}_{idx}"
        new_biz = Business(
            google_place_id=place_id,
            name=biz_data["name"],
            address=biz_data.get("address"),
            city=biz_data.get("city"),
            state=biz_data.get("state"),
            country=biz_data.get("country"),
            latitude=biz_data.get("latitude"),
            longitude=biz_data.get("longitude"),
            phone=biz_data.get("phone"),
            email=biz_data.get("email"),
            website=biz_data.get("website"),
            google_rating=biz_data.get("google_rating", 0.0),
            reviews_count=biz_data.get("reviews_count", 0),
            maps_url=biz_data.get("maps_url"),
            opening_hours=biz_data.get("opening_hours"),
            photos=biz_data.get("photos"),
            business_status=biz_data.get("business_status", "OPERATIONAL"),
            industry=biz_data.get("industry", search_in.category),
            website_score=biz_data.get("website_score", 0),
            ssl_enabled=biz_data.get("ssl_enabled", False),
            mobile_friendly=biz_data.get("mobile_friendly", True),
            tech_stack=biz_data.get("tech_stack"),
            meta_title=biz_data.get("meta_title"),
            meta_description=biz_data.get("meta_description"),
            has_analytics=biz_data.get("has_analytics", False),
            has_pixel=biz_data.get("has_pixel", False),
            broken_links_count=biz_data.get("broken_links_count", 0),
            search_id=new_search.id
        )
        try:
            with db.begin_nested():
                db.add(new_biz)
                db.flush()
            saved_businesses.append(new_biz)
        except Exception:
            new_biz.google_place_id = f"{place_id}_{int(time.time())}_{idx}"
            try:
                with db.begin_nested():
                    db.add(new_biz)
                    db.flush()
                saved_businesses.append(new_biz)
            except Exception:
                pass

    # If all scraped items were already present in DB (duplicates), return existing matching businesses for this search location/query
    if not saved_businesses and raw_leads:
        raw_place_ids = [b.get("google_place_id") for b in raw_leads if b.get("google_place_id")]
        raw_names = [b.get("name") for b in raw_leads if b.get("name")]
        
        saved_businesses = db.query(Business).filter(
            (Business.google_place_id.in_(raw_place_ids)) | (Business.name.in_(raw_names))
        ).limit(search_in.max_results or 25).all()

        if not saved_businesses and search_in.location:
            loc_term = search_in.location.strip()
            city_part = loc_term.split(",")[0].strip()
            saved_businesses = db.query(Business).filter(
                (Business.city.ilike(f"%{city_part}%")) | 
                (Business.city.ilike(f"%{loc_term}%")) |
                (Business.address.ilike(f"%{city_part}%"))
            ).limit(search_in.max_results or 25).all()

        # If still empty, save raw_leads directly with fresh unique place IDs using nested savepoints
        if not saved_businesses:
            for idx, biz_data in enumerate(raw_leads):
                place_id = biz_data.get("google_place_id") or f"lead_{int(time.time())}_{idx}"
                new_biz = Business(
                    google_place_id=f"{place_id}_{int(time.time())}_{idx}",
                    name=biz_data["name"],
                    address=biz_data.get("address"),
                    city=biz_data.get("city"),
                    state=biz_data.get("state"),
                    country=biz_data.get("country"),
                    latitude=biz_data.get("latitude"),
                    longitude=biz_data.get("longitude"),
                    phone=biz_data.get("phone"),
                    email=biz_data.get("email"),
                    website=biz_data.get("website"),
                    google_rating=biz_data.get("google_rating", 0.0),
                    reviews_count=biz_data.get("reviews_count", 0),
                    maps_url=biz_data.get("maps_url"),
                    opening_hours=biz_data.get("opening_hours"),
                    photos=biz_data.get("photos"),
                    business_status=biz_data.get("business_status", "OPERATIONAL"),
                    industry=biz_data.get("industry", search_in.category),
                    website_score=biz_data.get("website_score", 0),
                    ssl_enabled=biz_data.get("ssl_enabled", False),
                    mobile_friendly=biz_data.get("mobile_friendly", True),
                    tech_stack=biz_data.get("tech_stack"),
                    meta_title=biz_data.get("meta_title"),
                    meta_description=biz_data.get("meta_description"),
                    has_analytics=biz_data.get("has_analytics", False),
                    has_pixel=biz_data.get("has_pixel", False),
                    broken_links_count=biz_data.get("broken_links_count", 0),
                    search_id=new_search.id
                )
                try:
                    with db.begin_nested():
                        db.add(new_biz)
                        db.flush()
                    saved_businesses.append(new_biz)
                except Exception:
                    pass

    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="SEARCH_RUN",
        description=f"Scraped '{search_in.category}' in '{search_in.location}': {len(saved_businesses)} leads returned ({dupes_removed} duplicates handled)."
    )
    db.add(log)

    db.commit()
    return saved_businesses

@router.get("/mock-directory", response_class=HTMLResponse)
def mock_directory():
    return """
    <html>
    <body>
        <h1>Local Plumbers Directory</h1>
        <ul>
            <li><a href="/api/search/mock-profile/1">Joe's Plumbing</a></li>
            <li><a href="/api/search/mock-profile/2">City Pipes</a></li>
            <li><a href="/api/search/mock-profile/3">Fast Fix Plumbers</a></li>
            <li><a href="/api/search/mock-profile/4">Elite Drainage</a></li>
        </ul>
    </body>
    </html>
    """

@router.get("/mock-profile/{id}", response_class=HTMLResponse)
def mock_profile(id: int):
    profiles = {
        1: "Joe's Plumbing. Address: 123 Main St. Phone: 555-0101. Email: joe@plumbing.local. We are local and don't have a website.",
        2: "City Pipes. Address: 456 Central Ave. Phone: 555-0102. No website, just call us.",
        3: "Fast Fix Plumbers. Address: 789 Rapid Blvd. Phone: 555-0103. Email: fast@fix.local. We fix it fast offline.",
        4: "Elite Drainage. Address: 321 Drain Ln. Phone: 555-0104. No digital presence, old school business."
    }
    content = profiles.get(id, "Not found")
    return f"<html><body><h2>Profile {id}</h2><p>{content}</p></body></html>"

@router.post("/scrape-link", response_model=List[BusinessResponse])
def scrape_link(
    request: LinkScrapeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Log search search criteria
    new_search = Search(
        category="Custom Link Scrape",
        location=request.url[:255],
        radius=0.0,
        max_results=100,
        status="Completed",
        user_id=current_user.id
    )
    db.add(new_search)
    db.flush() # populated new_search.id
    
    try:
        found_businesses = AILeadScraperService.scrape_link(request.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    saved_businesses = []
    for biz_data in found_businesses:
        new_biz = Business(
            name=biz_data["name"],
            address=biz_data.get("address"),
            phone=biz_data.get("phone"),
            email=biz_data.get("email"),
            website=biz_data.get("website"),
            industry="Scraped Lead",
            search_id=new_search.id
        )
        db.add(new_biz)
        db.flush()
        saved_businesses.append(new_biz)
            
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="SEARCH_RUN",
        description=f"Scraped custom link '{request.url}' finding {len(saved_businesses)} results"
    )
    db.add(log)
    
    db.commit()
    return saved_businesses

@router.get("/history", response_model=List[dict])
def get_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    searches = db.query(Search).filter(Search.user_id == current_user.id).order_by(Search.created_at.desc()).all()
    
    results = []
    for s in searches:
        biz_ids = [b.id for b in s.businesses]
        leads_count = 0
        if biz_ids:
            from app.models import Lead
            leads_count = db.query(Lead).filter(
                Lead.business_id.in_(biz_ids)
            ).count()
            
        results.append({
            "id": s.id,
            "category": s.category,
            "location": s.location,
            "radius": s.radius,
            "max_results": s.max_results,
            "total_results": s.total_results or len(s.businesses),
            "new_leads_count": s.new_leads_count or len(s.businesses),
            "duplicates_removed_count": s.duplicates_removed_count or 0,
            "duration_ms": getattr(s, "duration_ms", 1250.0) or 1250.0,
            "status": getattr(s, "status", "Completed") or "Completed",
            "created_at": s.created_at,
            "businesses_found": len(s.businesses),
            "leads_saved": leads_count
        })
    return results

@router.get("/history/{search_id}/businesses", response_model=List[BusinessResponse])
def get_search_businesses(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    search_record = db.query(Search).filter(Search.id == search_id, Search.user_id == current_user.id).first()
    if not search_record:
        raise HTTPException(status_code=404, detail="Search scan not found")
    return search_record.businesses

@router.delete("/history/{search_id}", status_code=204)
def delete_search_history(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    search_record = db.query(Search).filter(Search.id == search_id, Search.user_id == current_user.id).first()
    if not search_record:
        raise HTTPException(status_code=404, detail="Search scan not found")
    db.delete(search_record)
    db.commit()
    return None
