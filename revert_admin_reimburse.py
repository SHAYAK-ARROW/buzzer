import codecs

c = codecs.open('app/routes/admin.py', 'r', 'utf-8').read()

old = '''    # Reimburse Delivery Boy if they had purchased it in Wallet Settlement COD mode
    if order.status in ["picked_up", "pending_redelivery"] and order.delivery_partner_id:
        shop = db.session.query(Shop).with_for_update().get(order.shop_id)
        if shop and shop.payment_mode == "wallet_settlement":
            partner = db.session.query(User).with_for_update().get(order.delivery_partner_id)
            if partner:
                partner.wallet_balance += order.items_total
                shop.wallet_balance -= order.items_total
                db.session.add(WalletTransaction(
                    order_id=order.id, from_type="shop", from_id=shop.id,
                    to_type="delivery_partner", to_id=partner.id,
                    amount=order.items_total,
                    transaction_type="admin_force_cancel_reimbursement"
                ))

    # Refund buyer if paid online'''

new = '''    # Refund buyer if paid online'''

if 'admin_force_cancel_reimbursement' in c:
    c = c.replace(old, new)
    with codecs.open('app/routes/admin.py', 'w', 'utf-8') as f:
        f.write(c)
    print("Reverted reimbursement logic!")
else:
    print("Already reverted or not found.")
