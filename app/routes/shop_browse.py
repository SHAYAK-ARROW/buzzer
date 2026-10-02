import os
from flask import Blueprint, jsonify, request
from app import db
from app.models import Shop, Product, GlobalItem, User
from sqlalchemy.orm import joinedload
from sqlalchemy import func, and_, or_

shop_browse_bp = Blueprint('shop_browse', __name__)

def safe_float(val, default=0.0):
    try:
        return float(val)
    except:
        return default

@shop_browse_bp.route("/shops", methods=["GET"])
def get_shops():
    from datetime import datetime, timedelta
    
    now_utc = datetime.utcnow()
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    current_time_str = now_ist.strftime('%H:%M')

    shops_query = Shop.query.options(joinedload(Shop.owner)).join(User, Shop.owner_id == User.id).filter(
        Shop.is_active == True,
        Shop.is_approved == True,
        User.is_suspended == False
    ).all()
    
    shops_list = []
    for s in shops_query:
        d = s.to_dict()
        is_open = False
        if s.opening_time and s.closing_time:
            if s.opening_time <= s.closing_time:
                is_open = s.opening_time <= current_time_str <= s.closing_time
            else:
                is_open = current_time_str >= s.opening_time or current_time_str <= s.closing_time
        d['is_open_now'] = is_open
        shops_list.append(d)
        
    return jsonify({"shops": shops_list}), 200

@shop_browse_bp.route("/shops/<int:shop_id>/products", methods=["GET"])
def get_shop_products(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop or not shop.is_approved or (shop.owner and shop.owner.is_suspended):
        return jsonify({"error": "Shop not found or not approved."}), 404
    
    products = Product.query.options(joinedload(Product.global_item)).filter_by(shop_id=shop_id, is_available=True, is_deleted=False).all()
    return jsonify({
        "shop": shop.to_dict(),
        "products": [p.to_dict() for p in products]
    }), 200

@shop_browse_bp.route("/grocery/categories", methods=["GET"])
def get_categories():
    cats = db.session.query(GlobalItem.category).distinct().all()
    categories = [c[0] for c in cats if c[0]]
    return jsonify({"categories": categories}), 200

@shop_browse_bp.route("/grocery/aggregated-products", methods=["GET"])
def get_aggregated_products():
    category = request.args.get("category")
    query = db.session.query(
        GlobalItem,
        func.count(Product.id.distinct()).label("shop_count")
    ).join(Product, GlobalItem.id == Product.global_item_id).join(Shop, Product.shop_id == Shop.id).join(User, Shop.owner_id == User.id).filter(
        Product.is_available == True,
        Product.is_deleted == False,
        Shop.is_approved == True,
        Shop.is_active == True,
        User.is_suspended == False
    )
    
    if category:
        query = query.filter(GlobalItem.category == category)
        
    results = query.group_by(GlobalItem.id).all()
    
    data = []
    for gi, count in results:
        d = gi.to_dict()
        d['available_in_shops'] = count
        data.append(d)
        
    return jsonify({
        "products": data,
        "aggregated_products": data
    }), 200

@shop_browse_bp.route("/grocery/aggregated-products/<int:global_item_id>/shops", methods=["GET"])
def get_shops_for_product(global_item_id):
    products = Product.query.options(joinedload(Product.shop)).join(Shop).join(User, Shop.owner_id == User.id).filter(
        Product.global_item_id == global_item_id,
        Product.is_available == True,
        Product.is_deleted == False,
        Shop.is_approved == True,
        Shop.is_active == True,
        User.is_suspended == False
    ).all()
    
    product_shops = []
    for p in products:
        d = p.to_dict()
        d['shop_name'] = p.shop.name if p.shop else 'Unknown Shop'
        product_shops.append(d)
        
    return jsonify({
        "products": [p.to_dict() for p in products],
        "product_shops": product_shops
    }), 200

@shop_browse_bp.route("/search/suggestions", methods=["GET"])
def search_suggestions():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"shops": [], "products": []}), 200
        
    words = [w.replace('%', '\\%').replace('_', '\\_') for w in query.split() if w]
    if not words:
        return jsonify({"shops": [], "products": []}), 200

    prod_filters = []
    for w in words:
        prod_filters.append(or_(
            GlobalItem.specification.ilike(f"%{w}%"),
            GlobalItem.company.ilike(f"%{w}%"),
            GlobalItem.category.ilike(f"%{w}%")
        ))
    
    products_query = GlobalItem.query.filter(and_(*prod_filters)).limit(10).all()
    
    shop_filters = []
    for w in words:
        shop_filters.append(or_(
            Shop.name.ilike(f"%{w}%"),
            User.name.ilike(f"%{w}%"),
            User.nickname.ilike(f"%{w}%")
        ))
        
    shops_query = Shop.query.join(User, Shop.owner_id == User.id).filter(
        Shop.is_active == True, 
        Shop.is_approved == True,
        User.is_suspended == False,
        and_(*shop_filters)
    ).limit(6).all()
    
    products = []
    for p in products_query:
        name = f"{p.company or ''} {p.specification or ''}".strip()
        if name and name not in products:
            products.append(name)
            
    shops = [s.name for s in shops_query]
    
    return jsonify({
        "shops": shops,
        "products": products[:6]
    }), 200

@shop_browse_bp.route("/search", methods=["GET"])
def search_grocery():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"shops": [], "products": []}), 200
        
    words = [w.replace('%', '\\%').replace('_', '\\_') for w in query.split() if w]
    if not words:
        return jsonify({"shops": [], "products": []}), 200
        
    # 1. MATCH SHOPS
    shop_filters = []
    for w in words:
        shop_filters.append(or_(
            Shop.name.ilike(f"%{w}%"),
            User.name.ilike(f"%{w}%"),
            User.nickname.ilike(f"%{w}%")
        ))
    
    matched_shops = Shop.query.join(User, Shop.owner_id == User.id).filter(
        Shop.is_active == True,
        Shop.is_approved == True,
        User.is_suspended == False,
        and_(*shop_filters)
    ).all()
    final_shops = [s.to_dict() for s in matched_shops]
    
    # 2. MATCH PRODUCTS
    prod_filters = []
    for w in words:
        prod_filters.append(or_(
            GlobalItem.specification.ilike(f"%{w}%"),
            GlobalItem.company.ilike(f"%{w}%"),
            Product.name.ilike(f"%{w}%")
        ))
        
    matching_products = Product.query.options(
        joinedload(Product.global_item), 
        joinedload(Product.shop)
    ).join(GlobalItem, Product.global_item_id == GlobalItem.id, isouter=True)\
     .join(Shop, Product.shop_id == Shop.id)\
     .join(User, Shop.owner_id == User.id).filter(
        Product.is_available == True,
        Product.is_deleted == False,
        Shop.is_approved == True,
        Shop.is_active == True,
        User.is_suspended == False,
        and_(*prod_filters)
    ).all()
    
    final_products = []
    for p in matching_products:
        d = p.to_dict()
        d['shop_name'] = p.shop.name if p.shop else 'Unknown'
        final_products.append(d)
    
    return jsonify({
        "shops": final_shops,
        "products": final_products
    }), 200

